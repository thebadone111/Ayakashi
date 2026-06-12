/**
 * Ayakashi — post-processing stack (pixi-filters).
 *
 * The single biggest "filmic vs programmer-art" lever. Four pieces:
 *
 *   BLOOM        — always-on AdvancedBloom over the two FX layers. High
 *                  threshold: only genuinely bright pixels (additive glows,
 *                  embers, gold text) halo, the scene itself stays untouched.
 *   IMPACT KICK  — ~140ms RGB-split + zoom-blur pulse on the whole stage.
 *                  Reads as the camera flinching. Fired on kanabo contact and
 *                  the big-win slam.
 *   GODRAY SWEEP — animated volumetric light sweep over the overlay during
 *                  big wins and the free-spins intro.
 *   SHOCK RIPPLE — actual displacement ring radiating from the kanabo impact
 *                  point (the Graphics ring stays; this bends the image too).
 *
 * Self-wiring: subscribes to fxBus ('smash' carries {x,y} canvas coords).
 * All transient filters are added for their lifetime only and removed after —
 * the steady-state cost is just the two bloom passes.
 */

import { Application, Container, Filter, Ticker } from 'pixi.js';
import {
	AdvancedBloomFilter,
	RGBSplitFilter,
	ZoomBlurFilter,
	GodrayFilter,
	ShockwaveFilter,
} from 'pixi-filters';

import { fxBus, type FxEvent } from './fx';

export interface PostFxOptions {
	app: Application;
	boardFxLayer: Container;
	overlayLayer: Container;
}

const addFilter = (target: Container, f: Filter) => {
	target.filters = [...((target.filters as Filter[] | null) ?? []), f];
};

const removeFilter = (target: Container, f: Filter) => {
	target.filters = ((target.filters as Filter[] | null) ?? []).filter((x) => x !== f);
};

export class PostFx {
	private app: Application;
	private boardFxLayer: Container;
	private overlayLayer: Container;
	private blooms: { target: Container; filter: AdvancedBloomFilter }[] = [];
	private busHandlers: Partial<Record<FxEvent, (data?: unknown) => void>> = {};
	private destroyed = false;

	constructor(opts: PostFxOptions) {
		this.app = opts.app;
		this.boardFxLayer = opts.boardFxLayer;
		this.overlayLayer = opts.overlayLayer;

		// --- always-on bloom ---------------------------------------------------
		for (const target of [opts.boardFxLayer, opts.overlayLayer]) {
			const filter = new AdvancedBloomFilter({
				threshold: 0.55, // only bright additive pixels bloom
				bloomScale: 0.9,
				brightness: 1.0,
				blur: 6,
				quality: 4,
			});
			addFilter(target, filter);
			this.blooms.push({ target, filter });
		}

		// --- event wiring --------------------------------------------------------
		const on = (event: FxEvent, handler: (data?: unknown) => void) => {
			this.busHandlers[event] = handler;
			fxBus.on(event, handler);
		};
		on('smash', (data) => {
			const p = (data ?? {}) as { x?: number; y?: number };
			this.impactKick(1.0);
			if (p.x !== undefined && p.y !== undefined) this.shockRipple(p.x, p.y);
		});
		on('bigwin', () => {
			this.impactKick(1.2);
			this.godraySweep(2600);
		});
		on('fsintro', () => this.godraySweep(3200));
	}

	/**
	 * ~140ms camera flinch: chromatic aberration + zoom blur, eased out.
	 * Applied to the stage so even the UI shudders for 8 frames — cinematic,
	 * not annoying, because it's gone before the eye settles.
	 */
	impactKick(strength = 1.0) {
		if (this.destroyed) return;
		const stage = this.app.stage;
		const w = this.app.renderer.width;
		const h = this.app.renderer.height;

		const rgb = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
		const zoom = new ZoomBlurFilter({ strength: 0, center: { x: w / 2, y: h / 2 }, innerRadius: 90 });
		addFilter(stage, rgb);
		addFilter(stage, zoom);

		const duration = 140;
		let elapsed = 0;
		const tick = (ticker: Ticker) => {
			elapsed += ticker.deltaMS;
			const p = Math.min(1, elapsed / duration);
			const fall = (1 - p) * (1 - p); // sharp attack, fast decay
			const split = 5 * strength * fall;
			rgb.red = { x: split, y: 0 };
			rgb.blue = { x: -split, y: 0 };
			zoom.strength = 0.08 * strength * fall;
			if (p >= 1) {
				this.app.ticker.remove(tick);
				removeFilter(stage, rgb);
				removeFilter(stage, zoom);
			}
		};
		this.app.ticker.add(tick);
	}

	/** Volumetric light sweeping across the overlay — big-win / FS-intro drama. */
	godraySweep(durationMs = 2600) {
		if (this.destroyed) return;
		const target = this.overlayLayer;
		const godray = new GodrayFilter({
			angle: 24,
			gain: 0.45,
			lacunarity: 2.6,
			parallel: true,
			alpha: 0,
		});
		addFilter(target, godray);

		let elapsed = 0;
		const tick = (ticker: Ticker) => {
			elapsed += ticker.deltaMS;
			const p = Math.min(1, elapsed / durationMs);
			godray.time += ticker.deltaMS / 1000;
			godray.angle = 24 + p * 22; // light slowly wheels across
			// fade in fast, hold, fade out
			godray.alpha = p < 0.15 ? p / 0.15 : p > 0.7 ? Math.max(0, (1 - p) / 0.3) : 1;
			if (p >= 1) {
				this.app.ticker.remove(tick);
				removeFilter(target, godray);
			}
		};
		this.app.ticker.add(tick);
	}

	/** Displacement ring radiating from (x, y) in canvas px — the kanabo hit. */
	shockRipple(x: number, y: number, durationMs = 650) {
		if (this.destroyed) return;
		const stage = this.app.stage;
		const shock = new ShockwaveFilter({
			center: { x, y },
			speed: 1400,
			amplitude: 22,
			wavelength: 130,
			brightness: 1.08,
			radius: -1,
		});
		shock.time = 0;
		addFilter(stage, shock);

		let elapsed = 0;
		const tick = (ticker: Ticker) => {
			elapsed += ticker.deltaMS;
			shock.time = elapsed / 1000;
			// amplitude decays so the ring softens as it expands
			shock.amplitude = 22 * Math.max(0, 1 - elapsed / durationMs);
			if (elapsed >= durationMs) {
				this.app.ticker.remove(tick);
				removeFilter(stage, shock);
			}
		};
		this.app.ticker.add(tick);
	}

	destroy() {
		this.destroyed = true;
		for (const [event, handler] of Object.entries(this.busHandlers)) {
			if (handler) fxBus.off(event as FxEvent, handler);
		}
		this.busHandlers = {};
		for (const { target, filter } of this.blooms) {
			if (!target.destroyed) removeFilter(target, filter);
		}
		this.blooms = [];
	}
}
