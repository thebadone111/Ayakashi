/**
 * Ayakashi — Wild (Kitsune Spirit Orb) landing animation.
 *
 * Plays at a symbol cell when a W lands: impact squash-and-stretch on the
 * symbol sprite, expanding foxfire ring, radial ember/wisp burst, brief local
 * glow, and — in free spins — a multiplier badge (e.g. "x10") popping above
 * the orb with an elastic slam.
 *
 * Designed as the PixiJS replacement for the `wild_dynamite_land` Spine state
 * in SYMBOL_INFO_MAP. The module does not own the symbol sprite — it overlays
 * effects at the cell and (optionally) drives the sprite's scale.
 *
 * Wiring (Tom) — in the symbol land hook (ReelSymbol/SymbolWrap) when
 * symbol.name === 'W':
 *
 *   const wildFx = new WildLandingAnimation({ app, effectsLayer });
 *   await wildFx.playAt({
 *     x, y,                       // cell centre, effectsLayer space
 *     symbol: symbolContainer,    // optional — gets squash/stretch
 *     multiplier: rawSymbol.multiplier, // optional — shows badge if > 1
 *   });
 *   // teardown with the board:
 *   wildFx.destroy();
 *
 * One instance serves the whole board; concurrent landings are fine (each
 * playAt() builds its own local scene node).
 */

import { Application, Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';

import {
	PALETTE,
	TweenRunner,
	ParticlePool,
	makeGlowTexture,
	speedLineBurst,
	easings,
	fxBus,
} from './fx';

export interface WildLandingOptions {
	app: Application;
	/** Layer above the board where rings/particles/badges render. */
	effectsLayer: Container;
	/** Cell size, used to scale the effect. Defaults to SDK SYMBOL_SIZE. */
	symbolSize?: number;
	fontFamily?: string;
}

export class WildLandingAnimation {
	private app: Application;
	private effectsLayer: Container;
	private tweens: TweenRunner;
	private particles: ParticlePool;
	private symbolSize: number;
	private fontFamily: string;
	private liveNodes = new Set<Container>();

	constructor(opts: WildLandingOptions) {
		this.app = opts.app;
		this.effectsLayer = opts.effectsLayer;
		this.symbolSize = opts.symbolSize ?? 120;
		this.fontFamily = opts.fontFamily ?? 'Arial';
		this.tweens = new TweenRunner(opts.app.ticker);
		this.particles = new ParticlePool(opts.app.ticker, opts.app.renderer, 200);
		this.effectsLayer.addChild(this.particles.container);
	}

	async playAt(opts: {
		x: number;
		y: number;
		/** Optional symbol display object to squash/stretch on impact. */
		symbol?: Container;
		/** Wild multiplier (free spins). Badge shown when > 1. */
		multiplier?: number;
	}): Promise<void> {
		const { x, y, symbol, multiplier } = opts;
		fxBus.emit('wildland');
		const s = this.symbolSize;

		const node = new Container();
		node.position.set(x, y);
		this.effectsLayer.addChild(node);
		this.liveNodes.add(node);

		// --- impact: squash and stretch the landed symbol ---------------------
		if (symbol) {
			const sx = symbol.scale.x;
			const sy = symbol.scale.y;
			void this.tweens
				.to(symbol.scale, { x: sx * 1.18, y: sy * 0.78 }, { duration: 90, ease: easings.quadOut })
				.then(() => this.tweens.to(symbol.scale, { x: sx, y: sy }, { duration: 420, ease: easings.elasticOut }));
		}

		// --- local glow flash ---------------------------------------------------
		const glow = new Sprite(makeGlowTexture(this.app.renderer, Math.round(s * 0.9), PALETTE.FOXFIRE));
		glow.anchor.set(0.5);
		glow.blendMode = 'add';
		glow.alpha = 0;
		glow.scale.set(0.4);
		node.addChild(glow);
		void this.tweens.to(glow, { alpha: 1 }, { duration: 90, ease: easings.quadOut })
			.then(() => this.tweens.to(glow, { alpha: 0 }, { duration: 600, ease: easings.quadOut }));
		void this.tweens.to(glow.scale, { x: 1.4, y: 1.4 }, { duration: 650, ease: easings.cubicOut });

		// impact accent — short radial strike lines
		speedLineBurst(node, this.tweens, {
			x: 0, y: 0,
			color: PALETTE.FOXFIRE,
			count: 10,
			innerRadius: s * 0.4,
			length: s * 0.8,
			duration: 240,
		});

		// --- foxfire ring ---------------------------------------------------------
		const ring = new Graphics().circle(0, 0, s * 0.45).stroke({ color: PALETTE.FOXFIRE, width: 6, alpha: 1 });
		ring.blendMode = 'add';
		ring.scale.set(0.3);
		node.addChild(ring);
		const ringState = { scale: 0.3, alpha: 1 };
		void this.tweens.to(ringState, { scale: 2.2, alpha: 0 }, {
			duration: 550,
			ease: easings.cubicOut,
			onUpdate: () => {
				ring.scale.set(ringState.scale);
				ring.alpha = ringState.alpha;
			},
		});

		// --- ember + wisp burst -----------------------------------------------------
		this.particles.emit({
			x, y,
			count: 18,
			speed: [120, 380],
			gravity: 500,
			life: [400, 900],
			scaleStart: [0.3, 0.7],
			tints: [PALETTE.EMBER, PALETTE.EMBER_HI, PALETTE.GOLD],
			rotationSpeed: [-5, 5],
		});
		this.particles.emit({
			x, y,
			count: 10,
			speed: [40, 160],
			gravity: -90,
			drag: 0.5,
			life: [800, 1500],
			scaleStart: [0.6, 1.1],
			tints: [PALETTE.FOXFIRE, PALETTE.SPIRIT, 0xb7fdff],
		});

		// --- multiplier badge (free spins) ----------------------------------------
		let badgeDone: Promise<unknown> = Promise.resolve();
		if (multiplier && multiplier > 1) {
			const badge = new Text({
				text: `x${multiplier}`,
				style: new TextStyle({
					fontFamily: this.fontFamily,
					fontSize: Math.round(s * 0.42),
					fontWeight: '900',
					fill: PALETTE.GOLD,
					stroke: { color: PALETTE.INK, width: 6 },
					dropShadow: { color: PALETTE.EMBER, blur: 10, distance: 0, alpha: 0.9 },
				}),
			});
			badge.anchor.set(0.5);
			badge.position.set(0, -s * 0.55);
			badge.scale.set(0);
			node.addChild(badge);
			badgeDone = this.tweens
				.to(badge.scale, { x: 1.3, y: 1.3 }, { duration: 380, ease: easings.elasticOut })
				.then(() => this.tweens.to(badge.scale, { x: 1, y: 1 }, { duration: 200, ease: easings.quadOut }));
		}

		// node lives just long enough for the longest child effect
		await Promise.all([badgeDone, new Promise((r) => setTimeout(r, 700))]);
		this.disposeNode(node);
	}

	private disposeNode(node: Container) {
		if (!this.liveNodes.has(node)) return;
		this.liveNodes.delete(node);
		node.destroy({ children: true });
	}

	destroy() {
		this.tweens.destroy();
		for (const node of [...this.liveNodes]) this.disposeNode(node);
		this.effectsLayer.removeChild(this.particles.container);
		this.particles.destroy();
	}
}
