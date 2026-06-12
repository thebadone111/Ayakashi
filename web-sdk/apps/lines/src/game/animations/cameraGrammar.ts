/**
 * Ayakashi — camera grammar. The cheapest cinematic tool there is: the frame
 * itself reacts to weight and drama.
 *
 *   DIP   — every tumble wave drops the board a few px and settles back with
 *           an overshoot: collapsing symbols have mass.
 *   ZOOM  — celebrations push the whole stage in to 1.035 around its centre
 *           and breathe there; released when the celebration ends.
 *
 * Self-wiring via fxBus ('tumble', 'smash', 'bigwin'). The zoom targets
 * app.stage with a pivot/position trick (pivot to canvas centre, position to
 * canvas centre, scale) and restores everything afterwards, so it never
 * fights the layout system. The dip targets the registered shake container
 * (the board) — same object ScreenShaker moves, additive and brief.
 */

import { Application, Container, Ticker } from 'pixi.js';

import { TweenRunner, easings, fxBus, type FxEvent } from './fx';

export interface CameraGrammarOptions {
	app: Application;
	/** The board container (same one ScreenShaker targets). */
	dipTarget: Container;
}

export class CameraGrammar {
	private app: Application;
	private dipTarget: Container;
	private tweens: TweenRunner;
	private busHandlers: Partial<Record<FxEvent, (data?: unknown) => void>> = {};
	private zooming = false;
	private zoomTick: ((t: Ticker) => void) | null = null;
	private destroyed = false;

	constructor(opts: CameraGrammarOptions) {
		this.app = opts.app;
		this.dipTarget = opts.dipTarget;
		this.tweens = new TweenRunner(opts.app.ticker);

		const on = (event: FxEvent, handler: (data?: unknown) => void) => {
			this.busHandlers[event] = handler;
			fxBus.on(event, handler);
		};
		on('tumble', () => this.dip(4));
		on('smash', () => this.dip(7));
		on('bigwin', () => this.zoomIn());
	}

	/** Board drops `px` and settles back with overshoot — weight. */
	dip(px = 4) {
		if (this.destroyed) return;
		const t = this.dipTarget;
		if (!t || t.destroyed) return;
		const baseY = t.y;
		void this.tweens
			.to(t, { y: baseY + px }, { duration: 90, ease: easings.quadOut })
			.then(() => this.tweens.to(t, { y: baseY }, { duration: 320, ease: easings.backOut }));
	}

	/**
	 * Slow push-in on the whole stage for the celebration's duration, with a
	 * gentle breathing oscillation. Call release() (or it auto-releases on the
	 * next 'bigwin' end via WinCelebration teardown calling release).
	 */
	zoomIn(scale = 1.035) {
		if (this.destroyed || this.zooming) return;
		this.zooming = true;
		const stage = this.app.stage;
		const w = () => this.app.renderer.width;
		const h = () => this.app.renderer.height;

		stage.pivot.set(w() / 2, h() / 2);
		stage.position.set(w() / 2, h() / 2);

		const state = { s: 1 };
		let breathe = 0;
		this.zoomTick = (ticker: Ticker) => {
			breathe += ticker.deltaMS / 1000;
			if (!stage.destroyed) {
				stage.scale.set(state.s + Math.sin(breathe * 0.9) * 0.004);
			}
		};
		this.app.ticker.add(this.zoomTick);
		void this.tweens.to(state, { s: scale }, { duration: 1400, ease: easings.quadOut });

		// auto-release after the typical celebration span as a safety net
		setTimeout(() => this.release(), 9000);
	}

	/** Ease the stage back to identity and clear the pivot trick. */
	release() {
		if (!this.zooming || this.destroyed) return;
		this.zooming = false;
		if (this.zoomTick) {
			this.app.ticker.remove(this.zoomTick);
			this.zoomTick = null;
		}
		const stage = this.app.stage;
		const state = { s: stage.scale.x };
		void this.tweens
			.to(state, { s: 1 }, {
				duration: 600,
				ease: easings.quadOut,
				onUpdate: () => {
					if (!stage.destroyed) stage.scale.set(state.s);
				},
			})
			.then(() => {
				if (stage.destroyed) return;
				stage.scale.set(1);
				stage.pivot.set(0, 0);
				stage.position.set(0, 0);
			});
	}

	destroy() {
		this.destroyed = true;
		for (const [event, handler] of Object.entries(this.busHandlers)) {
			if (handler) fxBus.off(event as FxEvent, handler);
		}
		this.busHandlers = {};
		if (this.zoomTick) this.app.ticker.remove(this.zoomTick);
		this.tweens.destroy();
		const stage = this.app.stage;
		if (!stage.destroyed) {
			stage.scale.set(1);
			stage.pivot.set(0, 0);
			stage.position.set(0, 0);
		}
	}
}
