/**
 * Ayakashi — reel spin-down and stop FX (per reel, staggered).
 *
 * The SDK's enhancedBoard already drives the actual reel motion (speeds,
 * bounce-back, 145 ms per-reel stagger via SPIN_OPTIONS_*). This module is the
 * presentation layer on top of it:
 *
 *   - onReelStop(reelIndex): impact "thud" — vertical squash on the reel
 *     column, ink-dust puff at the reel base, faint ground flash.
 *   - startAnticipation(reelIndex) / stopAnticipation(): spectral glow column
 *     behind a reel while it keeps spinning for a possible scatter — pulsing
 *     foxfire, edge embers. Replaces the reference `anticipation` Spine.
 *
 * The tuned reel feel (bounce weight, scatter tease) now lives in constants.ts
 * as SPIN_OPTIONS_DEFAULT / SPIN_OPTIONS_FAST (wired into stateGame).
 *
 * Wiring (Tom):
 *   const reelFx = new ReelSpinFx({ app, effectsLayer, boardOrigin: {x,y}, reelCount: 5, rowCount: 5 });
 *   // when reel i settles (board bounce-back callback):
 *   reelFx.onReelStop(i, { reelContainer: reels[i], scatterLanded: hasScatter });
 *   // when 'anticipation' flag from the reveal event marks reel i:
 *   reelFx.startAnticipation(i);
 *   // once the reel stops:
 *   reelFx.stopAnticipation(i);
 *   // teardown:
 *   reelFx.destroy();
 */

import { Application, Container, Graphics, Sprite, Ticker } from 'pixi.js';

import {
	PALETTE,
	TweenRunner,
	ParticlePool,
	makeGlowTexture,
	easings,
	fxBus,
} from './fx';

export interface ReelSpinFxOptions {
	app: Application;
	/** Layer above/behind the board for FX (rendered behind symbols is ideal for anticipation, above for dust). */
	effectsLayer: Container;
	/** Top-left of the visible board area, in effectsLayer space. */
	boardOrigin: { x: number; y: number };
	reelCount: number;
	rowCount: number;
	symbolSize?: number;
}

export class ReelSpinFx {
	private app: Application;
	private effectsLayer: Container;
	private tweens: TweenRunner;
	private particles: ParticlePool;
	private origin: { x: number; y: number };
	private reelCount: number;
	private rowCount: number;
	private symbolSize: number;
	private anticipations = new Map<number, { node: Container; tick: (t: Ticker) => void }>();

	constructor(opts: ReelSpinFxOptions) {
		this.app = opts.app;
		this.effectsLayer = opts.effectsLayer;
		this.origin = opts.boardOrigin;
		this.reelCount = opts.reelCount;
		this.rowCount = opts.rowCount;
		this.symbolSize = opts.symbolSize ?? 120;
		this.tweens = new TweenRunner(opts.app.ticker);
		this.particles = new ParticlePool(opts.app.ticker, opts.app.renderer, 150);
		this.effectsLayer.addChild(this.particles.container);
	}

	private reelCenterX(reelIndex: number): number {
		return this.origin.x + (reelIndex + 0.5) * this.symbolSize;
	}

	/**
	 * Impact FX when a reel settles. Call once per reel, in stop order —
	 * the SDK's reelSpinDelay already staggers the calls naturally.
	 */
	onReelStop(
		reelIndex: number,
		opts: { reelContainer?: Container; scatterLanded?: boolean } = {},
	) {
		fxBus.emit('reelstop');
		const x = this.reelCenterX(reelIndex);
		const baseY = this.origin.y + this.rowCount * this.symbolSize;

		// 1) squash thud on the reel column (visual weight)
		const reel = opts.reelContainer;
		if (reel) {
			const sy = reel.scale.y;
			const sx = reel.scale.x;
			void this.tweens
				.to(reel.scale, { y: sy * 0.985, x: sx * 1.005 }, { duration: 70, ease: easings.quadOut })
				.then(() => this.tweens.to(reel.scale, { y: sy, x: sx }, { duration: 260, ease: easings.backOut }));
		}

		// 2) ink-dust puff at the reel base
		this.particles.emit({
			x, y: baseY,
			count: 8,
			speed: [40, 140],
			angle: [-Math.PI * 0.85, -Math.PI * 0.15], // up-and-out fan
			gravity: 140,
			drag: 0.4,
			life: [350, 700],
			scaleStart: [0.5, 1],
			scaleEnd: 1.6, // dust expands as it fades
			alphaStart: 0.5,
			tints: [0x3a3a4a, 0x52526a, 0x2a2a38],
			blendMode: 'normal',
		});

		// 3) scatter landed on this reel — foxfire accent instead of dust only
		if (opts.scatterLanded) {
			this.particles.emit({
				x, y: baseY - (this.rowCount * this.symbolSize) / 2,
				count: 12,
				speed: [60, 220],
				life: [500, 1000],
				scaleStart: [0.4, 0.9],
				tints: [PALETTE.FOXFIRE, 0xb7fdff],
			});
		}
	}

	/**
	 * Spectral anticipation column behind a still-spinning reel
	 * (scatter tease). Idempotent per reel.
	 */
	startAnticipation(reelIndex: number) {
		if (this.anticipations.has(reelIndex)) return;

		const node = new Container();
		const x = this.reelCenterX(reelIndex);
		const h = this.rowCount * this.symbolSize;
		node.position.set(x, this.origin.y + h / 2);
		this.effectsLayer.addChild(node);

		// glow column — stretched radial glow
		const glow = new Sprite(makeGlowTexture(this.app.renderer, 120, PALETTE.FOXFIRE));
		glow.anchor.set(0.5);
		glow.scale.set(this.symbolSize / 110, h / 110);
		glow.blendMode = 'add';
		glow.alpha = 0;
		node.addChild(glow);

		// edge rails
		const rails = new Graphics();
		const halfW = this.symbolSize / 2;
		rails.rect(-halfW, -h / 2, 3, h).fill({ color: PALETTE.FOXFIRE, alpha: 0.8 });
		rails.rect(halfW - 3, -h / 2, 3, h).fill({ color: PALETTE.FOXFIRE, alpha: 0.8 });
		rails.blendMode = 'add';
		rails.alpha = 0;
		node.addChild(rails);

		void this.tweens.to(glow, { alpha: 0.5 }, { duration: 250 });
		void this.tweens.to(rails, { alpha: 1 }, { duration: 250 });
		// pulse loop
		void this.tweens.to(glow, { alpha: 0.25 }, { duration: 380, ease: easings.sineInOut, repeat: -1, yoyo: true });

		// rising edge embers while anticipating
		let accumulator = 0;
		const tick = (ticker: Ticker) => {
			accumulator += ticker.deltaMS;
			if (accumulator < 110) return;
			accumulator = 0;
			const side = Math.random() < 0.5 ? -halfW : halfW;
			this.particles.emit({
				x: x + side,
				y: this.origin.y + h,
				count: 1,
				speed: [80, 180],
				angle: [-Math.PI / 2 - 0.15, -Math.PI / 2 + 0.15],
				life: [600, 1200],
				scaleStart: [0.25, 0.6],
				tints: [PALETTE.FOXFIRE, PALETTE.SPIRIT],
			});
		};
		this.app.ticker.add(tick);
		this.anticipations.set(reelIndex, { node, tick });
	}

	/** Remove the anticipation column (call when the reel lands). */
	stopAnticipation(reelIndex: number) {
		const entry = this.anticipations.get(reelIndex);
		if (!entry) return;
		this.anticipations.delete(reelIndex);
		this.app.ticker.remove(entry.tick);
		const { node } = entry;
		void this.tweens.to(node, { alpha: 0 }, { duration: 200 }).then(() => {
			if (!node.destroyed) node.destroy({ children: true });
		});
	}

	destroy() {
		for (const reelIndex of [...this.anticipations.keys()]) {
			const entry = this.anticipations.get(reelIndex)!;
			this.app.ticker.remove(entry.tick);
			entry.node.destroy({ children: true });
			this.anticipations.delete(reelIndex);
		}
		this.tweens.destroy();
		this.effectsLayer.removeChild(this.particles.container);
		this.particles.destroy();
	}
}
