/**
 * Ayakashi — symbol win animation (replaces the per-symbol Spine `win` states).
 *
 * With this module every entry in SYMBOL_INFO_MAP can keep its static sprite
 * for the `win` state — no h1.json…l5.json Spine rigs needed. When a symbol
 * is part of a win, it plays a procedural "possessed" pop:
 *
 *   pop      — elastic scale overshoot (1 → 1.25 → 1.1 hold)
 *   flare    — tier-tinted glow blooms behind the symbol
 *   shimmer  — 2 quick rotation wiggles (yokai twitch)
 *   sparks   — small radial spark spray, tier-tinted
 *   settle   — eases back to base scale
 *
 * Tints by tier: highs = gold/ember, lows = foxfire, W = foxfire/spirit,
 * S = gold/foxfire (pass `tier` accordingly).
 *
 * Wiring (Tom) — wherever `boardWithAnimateSymbols` resolves each winning
 * symbol (Symbol.svelte win state), instead of playing the Spine animation:
 *
 *   const winFx = new SymbolWinFx({ app, effectsLayer });
 *   await winFx.play({ symbol: symbolContainer, x, y, tier: 'high' });
 *   winFx.destroy(); // board teardown; instance shared by all symbols
 */

import { Application, Container, Sprite } from 'pixi.js';

import {
	PALETTE,
	TweenRunner,
	ParticlePool,
	makeGlowTexture,
	easings,
} from './fx';

export type SymbolTier = 'high' | 'low' | 'wild' | 'scatter' | 'special';

const TIER_STYLE: Record<SymbolTier, { glow: number; sparks: number[] }> = {
	high: { glow: PALETTE.GOLD, sparks: [PALETTE.GOLD, PALETTE.EMBER_HI, 0xfff2b0] },
	low: { glow: PALETTE.FOXFIRE, sparks: [PALETTE.FOXFIRE, 0xb7fdff] },
	wild: { glow: PALETTE.FOXFIRE, sparks: [PALETTE.FOXFIRE, PALETTE.SPIRIT, 0xb7fdff] },
	scatter: { glow: PALETTE.GOLD, sparks: [PALETTE.GOLD, PALETTE.FOXFIRE] },
	special: { glow: PALETTE.SPIRIT, sparks: [PALETTE.SPIRIT, PALETTE.BLOOD, PALETTE.FOXFIRE] },
};

export interface SymbolWinFxOptions {
	app: Application;
	effectsLayer: Container;
	symbolSize?: number;
}

export class SymbolWinFx {
	private app: Application;
	private effectsLayer: Container;
	private tweens: TweenRunner;
	private particles: ParticlePool;
	private symbolSize: number;
	private liveGlows = new Set<Sprite>();

	constructor(opts: SymbolWinFxOptions) {
		this.app = opts.app;
		this.effectsLayer = opts.effectsLayer;
		this.symbolSize = opts.symbolSize ?? 120;
		this.tweens = new TweenRunner(opts.app.ticker);
		this.particles = new ParticlePool(opts.app.ticker, opts.app.renderer, 150);
		this.effectsLayer.addChild(this.particles.container);
	}

	/**
	 * Play the win pop on one symbol. Resolves when it settles (~900 ms).
	 * @param x/y cell centre in effectsLayer space (for glow + sparks)
	 */
	async play(opts: {
		/** Optional — when omitted, plays glow + sparks at the cell only. */
		symbol?: Container;
		x: number;
		y: number;
		tier?: SymbolTier;
	}): Promise<void> {
		const { symbol, x, y } = opts;
		if (symbol?.destroyed) return;
		const style = TIER_STYLE[opts.tier ?? 'low'];
		const s = this.symbolSize;

		// flare behind the symbol
		const glow = new Sprite(makeGlowTexture(this.app.renderer, Math.round(s * 0.75), style.glow));
		glow.anchor.set(0.5);
		glow.position.set(x, y);
		glow.blendMode = 'add';
		glow.alpha = 0;
		glow.scale.set(0.5);
		this.effectsLayer.addChild(glow);
		this.liveGlows.add(glow);
		void this.tweens.to(glow, { alpha: 0.85 }, { duration: 150 });
		void this.tweens.to(glow.scale, { x: 1.35, y: 1.35 }, { duration: 400, ease: easings.cubicOut });

		// sparks
		this.particles.emit({
			x, y,
			count: 12,
			speed: [70, 240],
			life: [300, 750],
			scaleStart: [0.3, 0.65],
			tints: style.sparks,
		});

		if (symbol) {
			const sx = symbol.scale.x;
			const sy = symbol.scale.y;
			const baseRot = symbol.rotation;

			// pop
			await this.tweens.to(symbol.scale, { x: sx * 1.25, y: sy * 1.25 }, { duration: 320, ease: easings.elasticOut });

			// shimmer — two quick wiggles
			await this.tweens.to(symbol, { rotation: baseRot + 0.06 }, { duration: 70, ease: easings.sineInOut });
			await this.tweens.to(symbol, { rotation: baseRot - 0.06 }, { duration: 110, ease: easings.sineInOut });
			await this.tweens.to(symbol, { rotation: baseRot }, { duration: 80, ease: easings.sineInOut });

			// settle + glow fade
			void this.tweens.to(glow, { alpha: 0 }, { duration: 350 }).then(() => {
				this.liveGlows.delete(glow);
				if (!glow.destroyed) glow.destroy();
			});
			await this.tweens.to(symbol.scale, { x: sx, y: sy }, { duration: 260, ease: easings.backOut });
		} else {
			// cell-only: hold the flare for the standard win beat, then fade
			await new Promise((r) => setTimeout(r, 320));
			await this.tweens.to(glow, { alpha: 0 }, { duration: 260 });
			this.liveGlows.delete(glow);
			if (!glow.destroyed) glow.destroy();
		}
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
