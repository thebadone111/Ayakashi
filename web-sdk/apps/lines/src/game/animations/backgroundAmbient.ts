/**
 * Ayakashi — background ambient animation.
 *
 * Drives the four finalized background layers from art/finals as a living
 * scene (PixiJS replacement for the reference foregroundAnimation Spine rig):
 *
 *   bg_bg.png     — base painting (blend: normal)        → slow 1.5% zoom breath
 *   bg_fg.png     — decorative trim (blend: screen)      → static, masks edges
 *   bg_effect.png — glow/light pass (blend: add)         → organic flicker
 *   bg_mist.png   — atmosphere (blend: normal, 50%)      → two copies drifting
 *                                                          opposite ways, seamless
 *   + sparse ember motes rising through the scene.
 *
 * `setMood('base' | 'freespin')` crossfades the scene tint — free spins push
 * the palette toward spirit-purple and raise ember density.
 *
 * Wiring (Tom) — in Background.svelte:
 *
 *   const bg = new BackgroundAmbient({
 *     app, parent: backgroundLayer,
 *     textures: { base: bgBgTex, trim: bgFgTex, effect: bgEffectTex, mist: bgMistTex },
 *     width, height,
 *   });
 *   bg.setMood('freespin'); // on freeSpinTrigger
 *   bg.setMood('base');     // on freeSpinEnd
 *   bg.resize(w, h);        // on canvas resize
 *   bg.destroy();           // on unmount
 */

import { Application, Container, Sprite, Texture, Ticker } from 'pixi.js';

import { PALETTE, TweenRunner, ParticlePool, easings } from './fx';

export interface BackgroundAmbientOptions {
	app: Application;
	parent: Container;
	textures: {
		base: Texture;
		trim?: Texture;
		effect?: Texture;
		mist?: Texture;
	};
	width: number;
	height: number;
}

type Mood = 'base' | 'freespin';

const MOOD_TINTS: Record<Mood, { base: number; effect: number; emberEveryMs: number }> = {
	base: { base: 0xffffff, effect: 0xffffff, emberEveryMs: 280 },
	freespin: { base: 0xcdb8e8, effect: 0xb794e6, emberEveryMs: 140 },
};

/** Big lazy foxfire wisp, every few seconds. */
const WISP_EVERY_MS = 3800;

export class BackgroundAmbient {
	private app: Application;
	private parent: Container;
	private root: Container;
	private tweens: TweenRunner;
	private particles: ParticlePool;
	private width: number;
	private height: number;

	private base: Sprite;
	private trim: Sprite | null = null;
	private effect: Sprite | null = null;
	private mistA: Sprite | null = null;
	private mistB: Sprite | null = null;

	private mood: Mood = 'base';
	private elapsed = 0;
	private emberAccumulator = 0;
	private wispAccumulator = 0;
	private tick = (ticker: Ticker) => this.update(ticker.deltaMS);

	constructor(opts: BackgroundAmbientOptions) {
		this.app = opts.app;
		this.parent = opts.parent;
		this.width = opts.width;
		this.height = opts.height;
		this.tweens = new TweenRunner(opts.app.ticker);
		this.particles = new ParticlePool(opts.app.ticker, opts.app.renderer, 60);

		this.root = new Container();
		this.parent.addChild(this.root);

		// base painting — anchored centre so the zoom breath stays centred
		this.base = new Sprite(opts.textures.base);
		this.base.anchor.set(0.5);
		this.root.addChild(this.base);

		// mist layers — two copies drifting opposite directions, wrapped
		if (opts.textures.mist) {
			this.mistA = new Sprite(opts.textures.mist);
			this.mistB = new Sprite(opts.textures.mist);
			for (const m of [this.mistA, this.mistB]) {
				m.anchor.set(0.5);
				m.alpha = 0.5;
				this.root.addChild(m);
			}
			this.mistB.scale.x = -1; // mirrored so the seam never reads as a repeat
			this.mistB.alpha = 0.35;
		}

		// embers between mist and effect pass
		this.root.addChild(this.particles.container);

		// additive glow pass — flickers
		if (opts.textures.effect) {
			this.effect = new Sprite(opts.textures.effect);
			this.effect.anchor.set(0.5);
			this.effect.blendMode = 'add';
			this.effect.alpha = 0.85;
			this.root.addChild(this.effect);
		}

		// screen-blend trim on top
		if (opts.textures.trim) {
			this.trim = new Sprite(opts.textures.trim);
			this.trim.anchor.set(0.5);
			this.trim.blendMode = 'screen';
			this.root.addChild(this.trim);
		}

		this.layout();
		this.app.ticker.add(this.tick);
	}

	/** Crossfade scene mood (free spins = spirit-purple, denser embers). */
	setMood(mood: Mood) {
		if (mood === this.mood) return;
		this.mood = mood;
		const tints = MOOD_TINTS[mood];
		// tween tint via RGB channels
		const lerpTint = (sprite: Sprite | null, toTint: number) => {
			if (!sprite) return;
			const from = typeof sprite.tint === 'number' ? sprite.tint : 0xffffff;
			const state = { t: 0 };
			const fr = (from >> 16) & 0xff, fg = (from >> 8) & 0xff, fb = from & 0xff;
			const tr = (toTint >> 16) & 0xff, tg = (toTint >> 8) & 0xff, tb = toTint & 0xff;
			void this.tweens.to(state, { t: 1 }, {
				duration: 900,
				ease: easings.sineInOut,
				onUpdate: () => {
					const r = Math.round(fr + (tr - fr) * state.t);
					const g = Math.round(fg + (tg - fg) * state.t);
					const b = Math.round(fb + (tb - fb) * state.t);
					sprite.tint = (r << 16) | (g << 8) | b;
				},
			});
		};
		lerpTint(this.base, tints.base);
		lerpTint(this.effect, tints.effect);
	}

	resize(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.layout();
	}

	private layout() {
		const cx = this.width / 2;
		const cy = this.height / 2;
		const cover = (sprite: Sprite, extra = 1) => {
			const scale = Math.max(this.width / sprite.texture.width, this.height / sprite.texture.height) * extra;
			sprite.scale.set(scale * Math.sign(sprite.scale.x || 1), scale);
			sprite.position.set(cx, cy);
		};
		cover(this.base, 1.04); // slight over-scan leaves room for the zoom breath
		if (this.effect) cover(this.effect, 1.04);
		if (this.trim) cover(this.trim, 1);
		if (this.mistA) cover(this.mistA, 1.3); // wide over-scan for drift travel
		if (this.mistB) cover(this.mistB, 1.3);
	}

	private update(deltaMS: number) {
		this.elapsed += deltaMS;
		const t = this.elapsed / 1000;
		const cx = this.width / 2;
		const cy = this.height / 2;
		const cover = (sprite: Sprite, extra: number) =>
			Math.max(this.width / sprite.texture.width, this.height / sprite.texture.height) * extra;

		// base — zoom breath (9 s, ±2%) + slow parallax sway
		const breath = 1 + Math.sin((t / 9) * Math.PI * 2) * 0.02;
		this.base.scale.set(cover(this.base, 1.06) * breath);
		this.base.position.set(
			cx + Math.sin(t / 17) * this.width * 0.012,
			cy + Math.sin(t / 21 + 1.2) * this.height * 0.008,
		);

		// mist drift — wider, faster, with alpha breathing (living fog)
		const driftRange = this.width * 0.13;
		if (this.mistA) {
			this.mistA.position.set(
				cx + Math.sin(t / 14) * driftRange,
				cy + Math.sin(t / 19) * driftRange * 0.35,
			);
			this.mistA.alpha = 0.5 + Math.sin(t / 7) * 0.15;
		}
		if (this.mistB) {
			this.mistB.position.set(
				cx - Math.sin(t / 11 + 1.7) * driftRange,
				cy + Math.cos(t / 16) * driftRange * 0.3,
			);
			this.mistB.alpha = 0.35 + Math.sin(t / 9 + 2.4) * 0.12;
		}

		// effect glow — the floating lights get real travel: a slow lissajous
		// drift plus swell and flicker, so the glow pass visibly wanders
		if (this.effect) {
			// slow deep pulse (the lights visibly breathe) + organic flicker on top
			this.effect.alpha =
				0.52 +
				(Math.sin(t * 0.6) * 0.5 + 0.5) * 0.3 +
				Math.sin(t * 5.3 + 2) * 0.06 +
				Math.sin(t * 11.7) * 0.03;
			this.effect.scale.set(cover(this.effect, 1.1) * (1 + Math.sin(t * 1.3) * 0.022));
			this.effect.position.set(
				cx + Math.sin(t / 6.5) * this.width * 0.022,
				cy + Math.sin(t / 8.7 + 1.3) * this.height * 0.016,
			);
		}

		// trim — counter-parallax shimmer so foreground separates from the painting
		if (this.trim) {
			this.trim.position.set(cx - Math.sin(t / 15 + 1) * this.width * 0.008, cy);
			this.trim.alpha = 0.92 + Math.sin(t * 2.6) * 0.06;
		}

		// rising embers — denser than before
		this.emberAccumulator += deltaMS;
		const every = MOOD_TINTS[this.mood].emberEveryMs;
		if (this.emberAccumulator >= every) {
			this.emberAccumulator = 0;
			const tints =
				this.mood === 'freespin'
					? [PALETTE.SPIRIT, PALETTE.FOXFIRE, PALETTE.EMBER]
					: [PALETTE.EMBER, PALETTE.EMBER_HI];
			this.particles.emit({
				x: Math.random() * this.width,
				y: this.height + 10,
				count: 1,
				speed: [20, 60],
				angle: [-Math.PI * 0.62, -Math.PI * 0.38],
				life: [4000, 8000],
				scaleStart: [0.15, 0.5],
				scaleEnd: 0,
				alphaStart: 0.8,
				tints,
			});
		}

		// occasional large foxfire wisp drifting up through the scene
		this.wispAccumulator += deltaMS;
		if (this.wispAccumulator >= WISP_EVERY_MS) {
			this.wispAccumulator = 0;
			this.particles.emit({
				x: this.width * (0.1 + Math.random() * 0.8),
				y: this.height * (0.6 + Math.random() * 0.4),
				count: 1,
				speed: [12, 30],
				angle: [-Math.PI * 0.55, -Math.PI * 0.45],
				drag: 0.85,
				life: [6000, 10000],
				scaleStart: [1.2, 2.2],
				scaleEnd: 0,
				alphaStart: 0.4,
				tints: [PALETTE.FOXFIRE, PALETTE.SPIRIT],
			});
		}
	}

	destroy() {
		this.app.ticker.remove(this.tick);
		this.tweens.destroy();
		this.root.removeChild(this.particles.container);
		this.particles.destroy();
		// textures are owned by the asset loader — destroy display objects only
		this.root.destroy({ children: true, texture: false });
	}
}
