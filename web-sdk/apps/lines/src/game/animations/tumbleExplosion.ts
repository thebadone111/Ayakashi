/**
 * Ayakashi — tumble symbol explosion (replaces the `explosion` Spine state).
 *
 * Every winning/exploded symbol dissolves before the board tumbles: quick
 * pop (squash → overshoot), then the symbol shrinks to nothing with a spin
 * while an ink splash + foxfire flash burst out of the cell.
 *
 * `explodeMany` staggers a wave of cells (sorted left-to-right) — call it
 * with all `explode: true` positions from the tumbleBoard handler, await it,
 * then run the SDK's slide-down.
 *
 * Wiring (Tom) — in the tumbleBoard handler, replacing the Spine explosion:
 *
 *   const boom = new TumbleExplosion({ app, effectsLayer, boardOrigin, symbolSize });
 *   await boom.explodeMany(
 *     explodingPositions.map((pos) => ({ pos, symbol: symbolContainerAt(pos) })),
 *   );
 *   // ...then tumbleBoardSlideDown
 *   boom.destroy(); // board teardown; instance reusable across tumbles
 *
 * If `symbol` is omitted the cell burst still plays (symbol removal can then
 * be instant), but passing it gives the shrink-and-spin dissolve.
 */

import { Application, Container, Sprite } from 'pixi.js';

import { getParticleTexture } from './particleLib';
import { gsap } from './motion';

import {
	PALETTE,
	TweenRunner,
	ParticlePool,
	makeGlowTexture,
	easings,
	delay,
	fxBus,
} from './fx';

export interface TumbleExplosionOptions {
	app: Application;
	effectsLayer: Container;
	boardOrigin: { x: number; y: number };
	symbolSize?: number;
}

export class TumbleExplosion {
	private app: Application;
	private effectsLayer: Container;
	private tweens: TweenRunner;
	private particles: ParticlePool;
	private origin: { x: number; y: number };
	private symbolSize: number;
	private liveGlows = new Set<Sprite>();

	constructor(opts: TumbleExplosionOptions) {
		this.app = opts.app;
		this.effectsLayer = opts.effectsLayer;
		this.origin = opts.boardOrigin;
		this.symbolSize = opts.symbolSize ?? 120;
		this.tweens = new TweenRunner(opts.app.ticker);
		this.particles = new ParticlePool(opts.app.ticker, opts.app.renderer, 300);
		this.effectsLayer.addChild(this.particles.container);
	}

	/** Explode one cell. Resolves when the dissolve completes (~480 ms). */
	async explodeAt(opts: {
		pos: { reel: number; row: number };
		symbol?: Container;
	}): Promise<void> {
		const s = this.symbolSize;
		const x = this.origin.x + (opts.pos.reel + 0.5) * s;
		const y = this.origin.y + (opts.pos.row + 0.5) * s;

		// foxfire flash at the cell
		const glow = new Sprite(makeGlowTexture(this.app.renderer, Math.round(s * 0.7), PALETTE.FOXFIRE));
		glow.anchor.set(0.5);
		glow.position.set(x, y);
		glow.blendMode = 'add';
		glow.alpha = 0;
		glow.scale.set(0.4);
		this.effectsLayer.addChild(glow);
		this.liveGlows.add(glow);
		void this.tweens.to(glow, { alpha: 0.95 }, { duration: 80 })
			.then(() => this.tweens.to(glow, { alpha: 0 }, { duration: 350 }))
			.then(() => {
				this.liveGlows.delete(glow);
				if (!glow.destroyed) glow.destroy();
			});
		void this.tweens.to(glow.scale, { x: 1.5, y: 1.5 }, { duration: 430, ease: easings.cubicOut });

		// ink splash (textured splatter, dark, normal blend) + spirit sparks
		this.particles.emit({
			x, y,
			count: 8,
			texture: getParticleTexture('ink'),
			speed: [80, 280],
			gravity: 500,
			life: [350, 800],
			scaleStart: [0.18, 0.4],
			scaleEnd: 0.55,
			alphaStart: 0.75,
			tints: [0x2a2a38, 0x3a3a4a, 0x1c1824],
			blendMode: 'normal',
			rotationSpeed: [-5, 5],
		});
		// paper shreds fluttering out — the symbol tears apart
		this.particles.emit({
			x, y,
			count: 5,
			texture: getParticleTexture('paper'),
			speed: [60, 200],
			gravity: 260,
			drag: 0.6,
			life: [450, 950],
			scaleStart: [0.2, 0.4],
			alphaStart: 0.85,
			tints: [0xcfc4ae, 0xa89c86, 0xe8e0d0],
			blendMode: 'normal',
			rotationSpeed: [-7, 7],
		});
		this.particles.emit({
			x, y,
			count: 8,
			speed: [100, 320],
			life: [250, 600],
			scaleStart: [0.3, 0.6],
			tints: [PALETTE.FOXFIRE, PALETTE.SPIRIT, 0xb7fdff],
		});

		// A2 rebuild — the symbol SHATTERS outward (flash → overshoot pop → burst
		// apart into the particle cloud), instead of meekly shrinking. GSAP gives
		// the snappy back-overshoot + fast power-in that reads as destruction.
		if (opts.symbol && !opts.symbol.destroyed) {
			const sym = opts.symbol;
			const s = sym.scale.x;
			const tl = gsap.timeline();
			tl.to(sym, { pixi: { tint: 0xfff2c8 }, duration: 0.04 }) // hot flash
				.to(sym.scale, { x: s * 1.28, y: s * 1.28, duration: 0.09, ease: 'back.out(3)' }, '<')
				// burst apart: scale UP while fading + a small random spin — it blows
				// into the ink/ember cloud rather than vanishing to a point
				.to(sym.scale, { x: s * 1.55, y: s * 1.55, duration: 0.2, ease: 'power3.in' })
				.to(
					sym,
					{ pixi: { alpha: 0 }, rotation: sym.rotation + (Math.random() - 0.5) * 0.7, duration: 0.2, ease: 'power3.in' },
					'<',
				);
			await tl;
		} else {
			await delay(280);
		}
	}

	/**
	 * Explode a wave of cells with a left-to-right ripple stagger.
	 * Resolves when the last cell finishes.
	 */
	async explodeMany(
		cells: { pos: { reel: number; row: number }; symbol?: Container }[],
		staggerMs = 45,
	): Promise<void> {
		fxBus.emit('tumble');
		const sorted = cells.slice().sort((a, b) => a.pos.reel - b.pos.reel || a.pos.row - b.pos.row);
		await Promise.all(
			sorted.map((cell, i) => delay(i * staggerMs).then(() => this.explodeAt(cell))),
		);
	}

	destroy() {
		this.tweens.destroy();
		for (const glow of [...this.liveGlows]) {
			if (!glow.destroyed) glow.destroy();
		}
		this.liveGlows.clear();
		this.effectsLayer.removeChild(this.particles.container);
		this.particles.destroy();
	}
}
