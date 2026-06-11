/**
 * Ayakashi — UI element animations (spin button, bet stepper, collect/win meter).
 *
 * Theme-consistent micro-interactions for the PixiJS UI shell. Nothing here
 * blocks game flow — every effect is fire-and-forget and cheap.
 *
 *   SpinButtonFx   — press squash, idle "charged" shimmer, spinning state
 *                    (rotating foxfire arc ring), disabled dim.
 *   BetStepperFx   — tick pop on +/- press with directional ember flick.
 *   CollectFx      — gold pulse + small coin burst on the win meter / collect.
 *
 * Wiring (Tom) — components-ui-pixi hooks:
 *
 *   const spinFx = new SpinButtonFx({ app, button: spinButtonContainer, radius: 60 });
 *   spinFx.press();          // pointerdown
 *   spinFx.setSpinning(true) // bet sent → reels spinning
 *   spinFx.setSpinning(false)
 *   spinFx.setEnabled(false) // bet not allowed / replay mode
 *   spinFx.destroy();
 *
 *   const betFx = new BetStepperFx({ app, effectsLayer });
 *   betFx.tick(plusButtonGlobalCenter, +1);  // or -1
 *
 *   const collectFx = new CollectFx({ app, effectsLayer });
 *   collectFx.pulse(winMeterCenter);
 */

import { Application, Container, Graphics, Sprite, Ticker } from 'pixi.js';

import {
	PALETTE,
	TweenRunner,
	ParticlePool,
	makeGlowTexture,
	easings,
} from './fx';

// ---------------------------------------------------------------------------
// Spin button
// ---------------------------------------------------------------------------

export interface SpinButtonFxOptions {
	app: Application;
	/** The button's display container — effects attach inside it. */
	button: Container;
	/** Button radius in local px (ring + glow sizing). */
	radius?: number;
}

export class SpinButtonFx {
	private app: Application;
	private button: Container;
	private tweens: TweenRunner;
	private radius: number;
	private glow: Sprite;
	private arcRing: Graphics;
	private spinning = false;
	private enabled = true;
	private baseScale: { x: number; y: number };
	private elapsed = 0;
	private tick = (ticker: Ticker) => this.update(ticker.deltaMS);

	constructor(opts: SpinButtonFxOptions) {
		this.app = opts.app;
		this.button = opts.button;
		this.radius = opts.radius ?? 60;
		this.tweens = new TweenRunner(opts.app.ticker);
		this.baseScale = { x: this.button.scale.x, y: this.button.scale.y };

		// charged shimmer under the button face
		this.glow = new Sprite(makeGlowTexture(this.app.renderer, Math.round(this.radius * 1.25), PALETTE.FOXFIRE));
		this.glow.anchor.set(0.5);
		this.glow.blendMode = 'add';
		this.glow.alpha = 0.25;
		this.button.addChildAt(this.glow, 0);

		// spinning arc ring — three foxfire arcs, hidden until setSpinning(true)
		this.arcRing = new Graphics();
		const r = this.radius * 1.08;
		for (let i = 0; i < 3; i++) {
			const start = (i / 3) * Math.PI * 2;
			this.arcRing.arc(0, 0, r, start, start + Math.PI * 0.42).stroke({
				color: i % 2 === 0 ? PALETTE.FOXFIRE : PALETTE.GOLD,
				width: 5,
				alpha: 0.95,
				cap: 'round',
			});
		}
		this.arcRing.blendMode = 'add';
		this.arcRing.alpha = 0;
		this.button.addChild(this.arcRing);

		this.app.ticker.add(this.tick);
	}

	/** Pointer-down feedback: squash + glow flare. */
	press() {
		if (!this.enabled) return;
		void this.tweens
			.to(this.button.scale, { x: this.baseScale.x * 0.9, y: this.baseScale.y * 0.9 }, { duration: 80, ease: easings.quadOut })
			.then(() => this.tweens.to(this.button.scale, { x: this.baseScale.x, y: this.baseScale.y }, { duration: 300, ease: easings.elasticOut }));
		void this.tweens.to(this.glow, { alpha: 0.7 }, { duration: 80 })
			.then(() => this.tweens.to(this.glow, { alpha: 0.25 }, { duration: 400 }));
	}

	setSpinning(spinning: boolean) {
		if (this.spinning === spinning) return;
		this.spinning = spinning;
		void this.tweens.to(this.arcRing, { alpha: spinning ? 1 : 0 }, { duration: 200 });
	}

	setEnabled(enabled: boolean) {
		this.enabled = enabled;
		void this.tweens.to(this.button, { alpha: enabled ? 1 : 0.45 }, { duration: 200 });
	}

	private update(deltaMS: number) {
		this.elapsed += deltaMS;
		// idle shimmer — slow pulse, stronger while charged (enabled, not spinning)
		const idleAmp = this.enabled && !this.spinning ? 0.12 : 0.04;
		this.glow.alpha = 0.2 + (Math.sin(this.elapsed / 600) * 0.5 + 0.5) * idleAmp;
		// spinning ring rotation — speeds up slightly over time for momentum feel
		if (this.spinning) this.arcRing.rotation += deltaMS * 0.006;
	}

	destroy() {
		this.app.ticker.remove(this.tick);
		this.tweens.destroy();
		if (!this.glow.destroyed) this.glow.destroy();
		if (!this.arcRing.destroyed) this.arcRing.destroy();
		this.button.scale.set(this.baseScale.x, this.baseScale.y);
	}
}

// ---------------------------------------------------------------------------
// Bet stepper
// ---------------------------------------------------------------------------

export class BetStepperFx {
	private tweens: TweenRunner;
	private particles: ParticlePool;
	private effectsLayer: Container;

	constructor(opts: { app: Application; effectsLayer: Container }) {
		this.tweens = new TweenRunner(opts.app.ticker);
		this.particles = new ParticlePool(opts.app.ticker, opts.app.renderer, 60);
		this.effectsLayer = opts.effectsLayer;
		this.effectsLayer.addChild(this.particles.container);
	}

	/**
	 * Tick feedback at a +/- button. `direction` +1 (raise) flicks embers up
	 * in gold, -1 (lower) flicks down in cool foxfire.
	 * @param at global/effectsLayer-space centre of the pressed button
	 * @param button optional button container to pop
	 */
	tick(at: { x: number; y: number }, direction: 1 | -1, button?: Container) {
		if (button) {
			const sx = button.scale.x, sy = button.scale.y;
			void this.tweens
				.to(button.scale, { x: sx * 1.12, y: sy * 1.12 }, { duration: 70, ease: easings.quadOut })
				.then(() => this.tweens.to(button.scale, { x: sx, y: sy }, { duration: 180, ease: easings.backOut }));
		}
		const up = direction === 1;
		this.particles.emit({
			x: at.x, y: at.y,
			count: 6,
			speed: [80, 200],
			angle: up ? [-Math.PI * 0.72, -Math.PI * 0.28] : [Math.PI * 0.28, Math.PI * 0.72],
			gravity: up ? 300 : -150,
			life: [250, 550],
			scaleStart: [0.25, 0.5],
			tints: up ? [PALETTE.GOLD, PALETTE.EMBER_HI] : [PALETTE.FOXFIRE, 0xb7fdff],
		});
	}

	destroy() {
		this.tweens.destroy();
		this.effectsLayer.removeChild(this.particles.container);
		this.particles.destroy();
	}
}

// ---------------------------------------------------------------------------
// Collect / win meter
// ---------------------------------------------------------------------------

export class CollectFx {
	private app: Application;
	private tweens: TweenRunner;
	private particles: ParticlePool;
	private effectsLayer: Container;

	constructor(opts: { app: Application; effectsLayer: Container }) {
		this.app = opts.app;
		this.tweens = new TweenRunner(opts.app.ticker);
		this.particles = new ParticlePool(opts.app.ticker, opts.app.renderer, 80);
		this.effectsLayer = opts.effectsLayer;
		this.effectsLayer.addChild(this.particles.container);
	}

	/**
	 * Gold pulse + coin spray at the win meter when a win is banked.
	 * @param at effectsLayer-space centre of the meter
	 * @param meter optional meter container to pop-scale
	 */
	pulse(at: { x: number; y: number }, meter?: Container) {
		// expanding gold halo
		const halo = new Sprite(makeGlowTexture(this.app.renderer, 80, PALETTE.GOLD));
		halo.anchor.set(0.5);
		halo.position.set(at.x, at.y);
		halo.blendMode = 'add';
		halo.alpha = 0.9;
		halo.scale.set(0.4);
		this.effectsLayer.addChild(halo);
		const state = { scale: 0.4, alpha: 0.9 };
		void this.tweens.to(state, { scale: 2.4, alpha: 0 }, {
			duration: 600,
			ease: easings.cubicOut,
			onUpdate: () => {
				halo.scale.set(state.scale);
				halo.alpha = state.alpha;
			},
		}).then(() => halo.destroy());

		// small coin spray
		this.particles.emit({
			x: at.x, y: at.y,
			count: 14,
			speed: [120, 360],
			angle: [-Math.PI, 0],
			gravity: 900,
			life: [500, 1000],
			scaleStart: [0.3, 0.6],
			scaleEnd: 0.1,
			tints: [PALETTE.GOLD, 0xfff2b0, PALETTE.EMBER_HI],
			rotationSpeed: [-6, 6],
		});

		if (meter) {
			const sx = meter.scale.x, sy = meter.scale.y;
			void this.tweens
				.to(meter.scale, { x: sx * 1.12, y: sy * 1.12 }, { duration: 110, ease: easings.quadOut })
				.then(() => this.tweens.to(meter.scale, { x: sx, y: sy }, { duration: 260, ease: easings.backOut }));
		}
	}

	destroy() {
		this.tweens.destroy();
		this.effectsLayer.removeChild(this.particles.container);
		this.particles.destroy();
	}
}
