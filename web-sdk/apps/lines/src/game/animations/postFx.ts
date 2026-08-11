/**
 * Ayakashi — post-processing stack (pixi-filters).
 *
 * P1-ART-02 (2026-07-03): stripped to ALWAYS-ON GRADING ONLY. The event-kicked
 * screen-space filters (RGB-split + zoom-blur "impact kick", godray sweep,
 * shockwave displacement ripple) read as generic engine tricks, fought the
 * sumi-e art direction, and were flagged in the art-style review. Impacts now
 * land through hit-stop (ticker.speed dip — the anime contact frame) plus the
 * authored/particle FX in the individual modules.
 *
 *   BLOOM — always-on AdvancedBloom over the two FX layers. High threshold:
 *           only genuinely bright pixels (additive glows, embers, gold text)
 *           halo; the scene itself stays untouched.
 *
 * Self-wiring: subscribes to fxBus ('smash', 'bigwin') for the hit-stop beat.
 */

import { Application, Container, Filter } from 'pixi.js';
import { AdvancedBloomFilter } from 'pixi-filters';

import { fxBus, hitStop, type FxEvent } from './fx';

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
	private blooms: { target: Container; filter: AdvancedBloomFilter }[] = [];
	private busHandlers: Partial<Record<FxEvent, (data?: unknown) => void>> = {};
	private destroyed = false;

	constructor(opts: PostFxOptions) {
		this.app = opts.app;

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

		// --- event wiring: impacts are hit-stops, not screen-space filters ------
		const on = (event: FxEvent, handler: (data?: unknown) => void) => {
			this.busHandlers[event] = handler;
			fxBus.on(event, handler);
		};
		on('smash', () => {
			if (!this.destroyed) hitStop(this.app.ticker, 90, 0.05);
		});
		on('bigwin', () => {
			if (!this.destroyed) hitStop(this.app.ticker, 120, 0.05);
		});
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
