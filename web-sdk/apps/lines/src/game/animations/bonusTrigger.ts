/**
 * Ayakashi — Bonus trigger animation (full-screen overlay).
 *
 * Narrative: the Temple Bell (scatter) tolls. Each landed scatter rings out as
 * concentric sound-wave ripples with a small ember/petal strike, then a triple
 * escalating bell-toll sends sound-waves rippling from centre with screen shake
 * and an ink-wash darkening — handing off to the Free Spins intro.
 *
 * Wiring (Tom) — in the `freeSpinTrigger` book event handler, after the
 * scatter win symbol animation and before `freeSpinIntroShow`:
 *
 *   const trigger = new BonusTriggerAnimation({ app, parent: overlayLayer, shakeTarget: boardContainer });
 *   await trigger.play({
 *     scatterPositions: bookEvent.positions.map(positionToScreenXY), // screen-space {x,y}[]
 *   });
 *   trigger.destroy(); // or keep instance and reuse — play() is re-entrant safe
 *
 * `positionToScreenXY` = convert board {reel,row} to global coords of the
 * symbol centre (board offset + (reel + 0.5) * SYMBOL_SIZE etc.).
 */

import { Application, Container, Graphics } from 'pixi.js';

import {
	PALETTE,
	TweenRunner,
	ParticlePool,
	ScreenShaker,
	flash,
	easings,
	delay,
	fxBus,
} from './fx';
import { getParticleTexture, particleAssetFor } from './particleLib';

export interface BonusTriggerOptions {
	app: Application;
	parent: Container;
	shakeTarget: Container;
	width?: number;
	height?: number;
}

export interface BonusTriggerPlayOptions {
	/** Screen-space centres of the landed scatter symbols. */
	scatterPositions: { x: number; y: number }[];
}

export class BonusTriggerAnimation {
	private parent: Container;
	private tweens: TweenRunner;
	private particles: ParticlePool;
	private shaker: ScreenShaker;
	private width: number;
	private height: number;
	private root: Container | null = null;
	private playing = false;

	constructor(opts: BonusTriggerOptions) {
		this.parent = opts.parent;
		this.width = opts.width ?? opts.app.screen.width;
		this.height = opts.height ?? opts.app.screen.height;
		this.tweens = new TweenRunner(opts.app.ticker);
		this.particles = new ParticlePool(opts.app.ticker, opts.app.renderer, 300);
		this.shaker = new ScreenShaker(opts.shakeTarget, opts.app.ticker);
	}

	async play(opts: BonusTriggerPlayOptions): Promise<void> {
		if (this.playing) return;
		this.playing = true;
		fxBus.emit('bonus');

		const cx = this.width / 2;
		const cy = this.height / 2;
		const root = new Container();
		this.root = root;
		this.parent.addChild(root);

		// gentle ink wash (lighter than before — the rings carry the moment)
		const ink = new Graphics().rect(0, 0, this.width, this.height).fill({ color: PALETTE.INK });
		ink.alpha = 0;
		root.addChild(ink);
		void this.tweens.to(ink, { alpha: 0.55 }, { duration: 500, ease: easings.quadOut });
		root.addChild(this.particles.container);

		// 1) EACH BELL TOLLS — concentric SOUND-WAVE rings ripple outward (a bell
		// rings → sound radiates). No giant glow blob; clean expanding circles.
		for (let i = 0; i < opts.scatterPositions.length; i++) {
			const pos = opts.scatterPositions[i];
			void delay(i * 190).then(() => {
				if (!this.root) return;
				for (let r = 0; r < 3; r++) {
					this.soundRing(pos.x, pos.y, [PALETTE.GOLD, PALETTE.EMBER_HI, PALETTE.FOXFIRE][r], 260 + r * 60, r * 150, 7);
				}
				// a small bright bell-strike spark + a couple petals (no big sprite)
				this.particles.emit({
					x: pos.x, y: pos.y,
					count: 10,
					texture: getParticleTexture('ember'),
					speed: [70, 200], gravity: 140, life: [400, 800],
					scaleStart: [0.2, 0.4],
					tints: [PALETTE.GOLD, PALETTE.EMBER_HI],
					rotationSpeed: [-4, 4],
				});
				this.particles.emit({
					x: pos.x, y: pos.y,
					count: 4,
					...particleAssetFor('petal', { animFps: 18 }),
					speed: [40, 120], gravity: 60, drag: 0.5, life: [900, 1600],
					scaleStart: [0.22, 0.4], alphaStart: 0.9,
					tints: [0xffd9e8, 0xfff0f6, 0xffc4dd],
					blendMode: 'normal', rotationSpeed: [-3, 3],
				});
				void this.shaker.shake({ intensity: 5, duration: 180 });
			});
		}
		await delay(opts.scatterPositions.length * 190 + 450);

		// 2) CLIMAX — three escalating unified tolls from centre: big sound-wave
		// ring sets + ember burst + shake; the final toll kicks the camera.
		for (let i = 0; i < 3; i++) {
			this.toll(cx, cy, i);
			await delay(380);
		}

		// 3) brief warm flash to hand off to FS intro (short — not a sustained blob)
		await flash(root, this.tweens, {
			width: this.width, height: this.height,
			color: 0xfff4d6, peakAlpha: 0.8, duration: 360,
		});
		await this.tweens.to(root, { alpha: 0 }, { duration: 260 });
		this.teardownScene();
		this.playing = false;
	}

	/**
	 * A single expanding sound-wave ring. Redrawn each frame so the RADIUS grows
	 * while the stroke tapers THIN and fades — reads as sound radiating, not a
	 * thickening donut (which is what scaling a stroked Graphics produces).
	 */
	private soundRing(x: number, y: number, color: number, maxRadius: number, delayMs: number, width = 7) {
		void delay(delayMs).then(() => {
			if (!this.root) return;
			const ring = new Graphics();
			ring.position.set(x, y);
			ring.blendMode = 'add';
			this.root.addChild(ring);
			const st = { r: 18, a: 0.9, w: width };
			void this.tweens
				.to(st, { r: maxRadius, a: 0, w: width * 0.25 }, {
					duration: 820,
					ease: easings.cubicOut,
					onUpdate: () => {
						if (ring.destroyed) return; // teardown may destroy the ring mid-tween
						ring.clear().circle(0, 0, st.r).stroke({ color, width: st.w, alpha: st.a });
					},
				})
				.then(() => {
					if (!ring.destroyed) ring.destroy();
				});
		});
	}

	/** Single bell-toll: expanding ring pair + radial ember puff + shake. */
	private toll(cx: number, cy: number, index: number) {
		const colors = [PALETTE.FOXFIRE, PALETTE.GOLD, PALETTE.SPIRIT];
		const color = colors[index % colors.length];
		const maxR = Math.hypot(this.width, this.height) * (0.55 + index * 0.12);
		for (const [delayMs, w0] of [[0, 18], [120, 10]] as const) {
			void delay(delayMs).then(() => {
				if (!this.root) return;
				const ring = new Graphics();
				ring.position.set(cx, cy);
				ring.blendMode = 'add';
				this.root.addChild(ring);
				const state = { r: 30, a: 1, w: w0 };
				void this.tweens.to(state, { r: maxR, a: 0, w: w0 * 0.2 }, {
					duration: 900,
					ease: easings.cubicOut,
					onUpdate: () => {
						if (ring.destroyed) return; // teardown may destroy the ring mid-tween
						ring.clear().circle(0, 0, state.r).stroke({ color, width: state.w, alpha: state.a });
					},
				}).then(() => {
					if (!ring.destroyed) ring.destroy();
				});
			});
		}
		// textured ember debris on each toll (bigger/brighter as it escalates)
		this.particles.emit({
			x: cx, y: cy,
			count: 18 + index * 8,
			texture: getParticleTexture('ember'),
			speed: [200, 600],
			gravity: 200,
			life: [500, 1100],
			scaleStart: [0.3, 0.6],
			tints: [color, PALETTE.EMBER_HI, PALETTE.GOLD],
			rotationSpeed: [-4, 4],
		});
		void this.shaker.shake({ intensity: 10 + index * 6, duration: 350 });
		// real screen-ripple on the final, biggest toll
		if (index === 2) fxBus.emit('smash', { x: cx, y: cy });
	}

	private teardownScene() {
		// Kill any in-flight ring/flash tweens BEFORE destroying their targets, so
		// no onUpdate fires against a destroyed Graphics next frame.
		this.tweens.killAll();
		if (this.root) {
			this.root.removeChild(this.particles.container);
			this.root.destroy({ children: true });
			this.root = null;
		}
		this.particles.clear();
	}

	destroy() {
		this.teardownScene();
		this.tweens.destroy();
		this.particles.destroy();
		this.shaker.destroy();
		this.playing = false;
	}
}
