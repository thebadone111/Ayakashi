/**
 * Ayakashi — Big Win celebration sequence (BIG / SUPER / MEGA / EPIC / MAX).
 *
 * CHARACTER-LED design (Max 2026-06-13): the kitsune avatar is the focal point.
 * The old centred rotating ray-fan "carousel" is gone. Instead the celebration
 * anchors to her on-screen position: a foxfire bloom ignites around her, spirit
 * flames swirl up her body (her own pirouette fires via fxBus 'bigwin'), and the
 * tier title + win amount slam into a sumi-e brush banner beside her (toward
 * centre so it stays on-screen). Impact grammar (flash, shake, shockwave) now
 * radiates from her, not screen-centre.
 *
 * Wiring (Tom): replace the Spine-based big win in `Win.svelte` —
 *
 *   const celebration = new WinCelebration({ app, parent: overlayLayer, shakeTarget: boardContainer });
 *   // on 'winUpdate' emitter event:
 *   await celebration.play({
 *     level: winLevelData.alias,              // 'big' | 'superwin' | 'mega' | 'epic' | 'max'
 *     amount: bookEvent.amount,
 *     formatAmount: (n) => bookEventAmountToCurrencyString(n),
 *     duration: winLevelData.presentDuration, // from winLevelMap
 *   });
 *   // on skip/press-to-continue:
 *   celebration.skip();
 *   // on game teardown:
 *   celebration.destroy();
 *
 * Escalation: each tier raises particle rates, shake intensity, title scale and
 * shockwave count. MAX adds a sustained ember rain + repeated shockwaves.
 *
 * The avatar focus point is supplied by `getAvatarFocus` (fxManager hands it the
 * live avatar's screen rect). If she's hidden/absent it falls back to a
 * right-of-centre anchor so the moment still plays.
 */

import {
	Application,
	Container,
	Graphics,
	Sprite,
	Text,
	TextStyle,
	Texture,
	Ticker,
} from 'pixi.js';

import {
	PALETTE,
	TweenRunner,
	ParticlePool,
	ScreenShaker,
	flash,
	makeGlowTexture,
	speedLineBurst,
	easings,
	delay,
	fxBus,
} from './fx';
import { getParticleTexture, particleAssetFor } from './particleLib';

export type BigWinAlias = 'big' | 'superwin' | 'mega' | 'epic' | 'max';

/** Avatar's on-screen rectangle in canvas space (overlay-local). */
export interface AvatarFocusRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface TierConfig {
	title: string;
	/** Tier palette — drives bloom, shockwave, banner and particle tints. */
	palette: number[];
	shake: number;
	burstCount: number;
	titleScale: number;
	titleColor: number;
	emberRain: boolean;
	shockwaves: number;
}

const TIERS: Record<BigWinAlias, TierConfig> = {
	big: {
		title: 'BIG WIN',
		palette: [PALETTE.GOLD, PALETTE.EMBER],
		shake: 10,
		burstCount: 40,
		titleScale: 1.0,
		titleColor: PALETTE.GOLD,
		emberRain: false,
		shockwaves: 1,
	},
	superwin: {
		title: 'SUPER WIN',
		palette: [PALETTE.GOLD, PALETTE.EMBER, PALETTE.FOXFIRE],
		shake: 14,
		burstCount: 60,
		titleScale: 1.1,
		titleColor: PALETTE.EMBER_HI,
		emberRain: false,
		shockwaves: 2,
	},
	mega: {
		title: 'MEGA WIN',
		palette: [PALETTE.EMBER, PALETTE.EMBER_HI, PALETTE.FOXFIRE],
		shake: 18,
		burstCount: 80,
		titleScale: 1.22,
		titleColor: PALETTE.EMBER,
		emberRain: true,
		shockwaves: 2,
	},
	epic: {
		title: 'EPIC WIN!',
		palette: [PALETTE.SPIRIT, PALETTE.EMBER, PALETTE.GOLD],
		shake: 24,
		burstCount: 110,
		titleScale: 1.35,
		titleColor: PALETTE.SPIRIT,
		emberRain: true,
		shockwaves: 3,
	},
	max: {
		title: 'MAX WIN',
		palette: [PALETTE.BLOOD, PALETTE.GOLD, PALETTE.FOXFIRE, PALETTE.EMBER],
		shake: 30,
		burstCount: 150,
		titleScale: 1.5,
		titleColor: PALETTE.BLOOD,
		emberRain: true,
		shockwaves: 4,
	},
};

export interface WinCelebrationOptions {
	app: Application;
	/** Layer the celebration renders into (full-screen overlay layer). */
	parent: Container;
	/** What shakes — usually the board or main camera container. */
	shakeTarget: Container;
	/** Canvas logical size; defaults to app.screen. */
	width?: number;
	height?: number;
	/** Local font family for the tier TITLE (letters) — no external fonts. */
	fontFamily?: string;
	/** Font for the AMOUNT (digits). The display face may lack digit glyphs, so
	 *  numbers get their own legible face. Defaults to `fontFamily`. */
	numberFontFamily?: string;
	/** Optional sumi-e brush stroke texture for the banner. Without it a clean
	 *  procedural lacquer plaque is drawn instead. */
	brushTexture?: Texture;
	/** Live avatar screen rect provider — the moment anchors to her. */
	getAvatarFocus?: () => AvatarFocusRect | null;
}

export interface PlayOptions {
	level: BigWinAlias;
	amount: number;
	formatAmount?: (n: number) => string;
	/** Total presentation time (ms). Default from tier. */
	duration?: number;
}

/** Resolved focus: her horizontal centre, upper-torso Y, and her on-screen size. */
interface Focus {
	cx: number;
	torsoY: number;
	w: number;
	h: number;
}

export class WinCelebration {
	private app: Application;
	private parent: Container;
	private root: Container | null = null;
	private tweens: TweenRunner;
	private particles: ParticlePool;
	private shaker: ScreenShaker;
	private fontFamily: string;
	private numberFontFamily: string;
	private width: number;
	private height: number;
	private skipRequested = false;
	private playing = false;
	private emberTick: ((ticker: Ticker) => void) | null = null;
	private foxfireTick: ((ticker: Ticker) => void) | null = null;
	private brushTexture: Texture | null;
	private getAvatarFocus: (() => AvatarFocusRect | null) | null;
	private vignetteTexture: Texture | null = null;
	/** Focus geometry the cached vignette was rendered for. */
	private vignetteKey = '';

	constructor(opts: WinCelebrationOptions) {
		this.app = opts.app;
		this.parent = opts.parent;
		this.width = opts.width ?? opts.app.screen.width;
		this.height = opts.height ?? opts.app.screen.height;
		this.fontFamily = opts.fontFamily ?? 'Arial';
		this.numberFontFamily = opts.numberFontFamily ?? this.fontFamily;
		this.brushTexture = opts.brushTexture ?? null;
		this.getAvatarFocus = opts.getAvatarFocus ?? null;
		this.tweens = new TweenRunner(opts.app.ticker);
		this.particles = new ParticlePool(opts.app.ticker, opts.app.renderer, 400);
		this.shaker = new ScreenShaker(opts.shakeTarget, opts.app.ticker);
	}

	/** Skip to the settled end state (full amount shown), then resolve play(). */
	skip() {
		this.skipRequested = true;
		this.tweens.killAll();
	}

	get isPlaying() {
		return this.playing;
	}

	async play(opts: PlayOptions): Promise<void> {
		if (this.playing) return;
		this.playing = true;
		this.skipRequested = false;

		const tier = TIERS[opts.level];
		fxBus.emit('bigwin', { level: opts.level }); // avatar pirouettes + glows
		const fmt = opts.formatAmount ?? ((n: number) => n.toFixed(2));
		const focus = this.resolveFocus();

		// --- build scene -----------------------------------------------------
		const root = new Container();
		this.root = root;
		this.parent.addChild(root);

		// radial vignette — CLEAR over her, darkening to the screen edges, so she
		// becomes the focal point. (The celebration draws above her layer, so a
		// flat dim would just bury her; this spotlights her instead.)
		const vignette = this.buildVignette(focus);
		vignette.alpha = 0;
		root.addChild(vignette);

		// (Max 2026-06-14) No coloured glow blob behind her — the celebration is
		// just the dim + brush banner + amount, so the avatar reads cleanly.

		// particle layer (below banner/text)
		root.addChild(this.particles.container);

		// --- brush banner beside her (toward centre so it never goes off-screen)
		const bannerW = Math.max(380, Math.min(this.width * 0.46, 680));
		const bannerH = 200;
		let bannerCx = focus.cx - focus.w * 0.5 - bannerW * 0.5 - 30; // fully beside her, with a gap
		bannerCx = Math.max(bannerW * 0.5 + 30, bannerCx); // clamp on-screen
		const bannerCy = focus.torsoY;
		const banner = this.buildBanner(tier, bannerW, bannerH);
		banner.position.set(bannerCx, bannerCy);
		banner.alpha = 0;
		banner.scale.x = 0; // swept open on the slam
		root.addChild(banner);

		// title
		const titleStyle = new TextStyle({
			fontFamily: this.fontFamily,
			fontSize: 56,
			fontWeight: '900',
			fill: tier.titleColor,
			stroke: { color: PALETTE.INK, width: 8 },
			dropShadow: { color: tier.palette[0], blur: 16, distance: 0, alpha: 0.9 },
			letterSpacing: 4,
		});
		const title = new Text({ text: tier.title, style: titleStyle });
		title.anchor.set(0.5);
		title.position.set(bannerCx, bannerCy - 50);
		title.scale.set(0);
		root.addChild(title);

		// amount counter — the hero number, bigger than the title
		const amountStyle = new TextStyle({
			fontFamily: this.numberFontFamily,
			fontSize: 88,
			fontWeight: '700',
			fill: PALETTE.GOLD,
			stroke: { color: PALETTE.INK, width: 9 },
			dropShadow: { color: PALETTE.EMBER, blur: 14, distance: 0, alpha: 0.85 },
		});
		const amountText = new Text({ text: fmt(0), style: amountStyle });
		amountText.anchor.set(0.5);
		amountText.position.set(bannerCx, bannerCy + 36);
		amountText.alpha = 0;
		root.addChild(amountText);

		// --- intro: the world dims (held beat before the slam) ---------------
		await this.tweens.to(vignette, { alpha: 1 }, { duration: 320 });

		// --- the slam --------------------------------------------------------
		void flash(root, this.tweens, { width: this.width, height: this.height, duration: 280, peakAlpha: 0.5 });
		void this.shaker.shake({ intensity: tier.shake, duration: 700 });
		this.spawnShockwave(root, focus.cx, focus.torsoY, tier.palette[0]);
		this.burst(focus.cx, focus.torsoY, tier);

		// banner sweeps open just before the title lands
		void this.tweens.to(banner, { alpha: 1 }, { duration: 180 });
		void this.tweens.to(banner.scale, { x: 1 }, { duration: 340, ease: easings.backOut });

		// title slam — strike accent on the overshoot frame
		void delay(160).then(() => {
			if (!this.root || this.skipRequested) return;
			speedLineBurst(this.root, this.tweens, {
				x: bannerCx,
				y: bannerCy - 50,
				color: tier.titleColor,
				count: 16,
				innerRadius: 150,
				length: 220,
				duration: 320,
			});
		});
		await this.tweens.to(title.scale, { x: tier.titleScale, y: tier.titleScale }, {
			duration: 700,
			ease: easings.elasticOut,
		});

		// breathing title loop (fire-and-forget; killed on teardown)
		void this.tweens.to(title.scale, { x: tier.titleScale * 1.05, y: tier.titleScale * 1.05 }, {
			duration: 800,
			ease: easings.sineInOut,
			repeat: -1,
			yoyo: true,
		});

		// spirit flames halo up her silhouette for the rest of the celebration
		this.startFoxfireSwirl(focus);

		// ember rain for high tiers
		if (tier.emberRain) this.startEmberRain();

		// extra shockwaves staggered, from her
		for (let i = 1; i < tier.shockwaves; i++) {
			void delay(i * 900).then(() => {
				if (!this.playing || this.skipRequested || !this.root) return;
				this.spawnShockwave(this.root, focus.cx, focus.torsoY, tier.palette[i % tier.palette.length]);
				this.burst(focus.cx, focus.torsoY, tier, 0.5);
				void this.shaker.shake({ intensity: tier.shake * 0.6, duration: 400 });
			});
		}

		// --- count-up ---------------------------------------------------------
		void this.tweens.to(amountText, { alpha: 1 }, { duration: 250 });
		const counter = { value: 0 };
		const countDuration = Math.min(opts.duration ?? 6000, 6000) * 0.7;
		await this.tweens.to(counter, { value: opts.amount }, {
			duration: countDuration,
			ease: easings.cubicOut,
			onUpdate: () => {
				amountText.text = fmt(counter.value);
			},
		});
		amountText.text = fmt(opts.amount); // exact final value (skip-safe)

		// tick-up pop on settle
		void this.tweens.to(amountText.scale, { x: 1.15, y: 1.15 }, { duration: 120, ease: easings.quadOut })
			.then(() => this.tweens.to(amountText.scale, { x: 1, y: 1 }, { duration: 250, ease: easings.backOut }));

		// --- hold then outro ----------------------------------------------------
		// pointer press anywhere skips straight to the settled amount + outro
		const onPointer = () => this.skip();
		window.addEventListener('pointerdown', onPointer);
		const totalDuration = opts.duration ?? 6000;
		const holdMs = Math.max(600, totalDuration - countDuration - 1500);
		let waited = 0;
		while (!this.skipRequested && waited < holdMs) {
			await delay(100);
			waited += 100;
		}
		window.removeEventListener('pointerdown', onPointer);

		await this.outro();
	}

	/** Her horizontal centre + upper-torso Y, or a right-of-centre fallback. */
	private resolveFocus(): Focus {
		const b = this.getAvatarFocus?.();
		if (b && b.width > 0 && b.height > 0) {
			return { cx: b.x + b.width / 2, torsoY: b.y + b.height * 0.4, w: b.width, h: b.height };
		}
		return { cx: this.width * 0.72, torsoY: this.height * 0.46, w: this.width * 0.22, h: this.height * 0.6 };
	}

	/**
	 * Radial spotlight vignette centred on her: transparent over the avatar,
	 * fading to near-black at the screen edges. Built as a canvas-gradient
	 * texture (rock-solid across Pixi versions) sized to the full canvas.
	 */
	private buildVignette(focus: Focus): Sprite {
		const w = Math.round(this.width);
		const h = Math.round(this.height);
		// the gradient only depends on focus geometry + canvas size — reuse the
		// texture across plays instead of allocating a full-canvas texture per
		// big win (BUG-08)
		const key = `${w}:${h}:${Math.round(focus.cx)}:${Math.round(focus.torsoY)}:${Math.round(focus.w)}:${Math.round(focus.h)}`;
		if (this.vignetteTexture && this.vignetteKey === key) {
			return new Sprite(this.vignetteTexture);
		}
		if (this.vignetteTexture) {
			this.vignetteTexture.destroy(true);
			this.vignetteTexture = null;
		}
		this.vignetteKey = key;
		const cnv = document.createElement('canvas');
		cnv.width = w;
		cnv.height = h;
		const ctx = cnv.getContext('2d');
		if (!ctx) return new Sprite();
		// the clear zone must cover her WHOLE body AND the lit ground at her feet:
		// a front overlay can only darken, so she only reads as "spotlit" if her
		// full silhouette — plus the bright ground her dark contact shadow sits on
		// — stays at scene brightness. (0.62 cropped the feet, so the ground
		// shadow fell into the dim and vanished during the win — Round 4c.) Centre
		// dropped toward the feet so the larger clear zone doesn't lift off her head.
		const inner = Math.max(focus.w, focus.h) * 0.72;
		const outer = Math.hypot(w, h) * 0.66;
		const cy2 = focus.torsoY + focus.h * 0.12;
		const g = ctx.createRadialGradient(focus.cx, cy2, inner, focus.cx, cy2, outer);
		g.addColorStop(0, 'rgba(9,6,13,0)');
		g.addColorStop(0.55, 'rgba(9,6,13,0.3)');
		g.addColorStop(1, 'rgba(9,6,13,0.82)');
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, w, h);
		this.vignetteTexture = Texture.from(cnv);
		return new Sprite(this.vignetteTexture);
	}

	/**
	 * Banner behind the title/amount: the supplied sumi-e brush stroke if one is
	 * loaded, otherwise a clean procedural lacquer plaque (dark ink + gold rim)
	 * that matches the red/gold frame until the generated brush asset lands.
	 */
	private buildBanner(tier: TierConfig, w: number, h: number): Container {
		const c = new Container();
		if (this.brushTexture) {
			const s = new Sprite(this.brushTexture);
			s.anchor.set(0.5);
			s.width = w;
			s.height = w * (this.brushTexture.height / this.brushTexture.width);
			s.tint = tier.titleColor;
			c.addChild(s);
			return c;
		}
		const w2 = w / 2;
		const h2 = h / 2;
		const g = new Graphics();
		g.roundRect(-w2, -h2, w, h, h2).fill({ color: PALETTE.INK, alpha: 0.82 });
		g.roundRect(-w2, -h2, w, h, h2).stroke({ color: tier.titleColor, width: 3, alpha: 0.85 });
		g.roundRect(-w2 + 9, -h2 + 9, w - 18, h - 18, h2 - 9).stroke({ color: 0xffe9a8, width: 1, alpha: 0.4 });
		c.addChild(g);
		return c;
	}

	private burst(cx: number, cy: number, tier: TierConfig, scale = 1) {
		// gold embers / sparks — heavy, gravity-bound
		this.particles.emit({
			x: cx, y: cy,
			count: Math.round(tier.burstCount * 0.45 * scale),
			texture: getParticleTexture('ember'),
			speed: [300, 900],
			angle: [-Math.PI, 0], // upward hemisphere
			gravity: 1400,
			life: [900, 1800],
			scaleStart: [0.3, 0.6],
			scaleEnd: 0.1,
			tints: [PALETTE.GOLD, PALETTE.EMBER_HI, 0xfff2b0],
			rotationSpeed: [-6, 6],
		});
		// gold petals raining — festival confetti
		this.particles.emit({
			x: cx, y: cy,
			count: Math.round(tier.burstCount * 0.25 * scale),
			...particleAssetFor('petal', { animFps: 20 }),
			speed: [200, 600],
			angle: [-Math.PI, 0],
			gravity: 500,
			drag: 0.35,
			life: [1400, 2600],
			scaleStart: [0.25, 0.45],
			alphaStart: 0.95,
			tints: [0xffd700, 0xffe9a8, 0xffc4dd],
			blendMode: 'normal',
			rotationSpeed: [-5, 5],
		});
		// spirit flames — light, floaty, additive. Kept modest so the initial
		// flare frames her rather than columning up over her face.
		this.particles.emit({
			x: cx, y: cy,
			count: Math.round(tier.burstCount * 0.22 * scale),
			speed: [60, 260],
			gravity: -120, // drift upward
			drag: 0.5,
			life: [1200, 2400],
			scaleStart: [0.5, 1.0],
			scaleEnd: 0,
			tints: [PALETTE.FOXFIRE, PALETTE.SPIRIT, 0xb7fdff],
		});
	}

	private spawnShockwave(root: Container, cx: number, cy: number, color: number) {
		const ring = new Graphics().circle(0, 0, 100).stroke({ color, width: 14, alpha: 0.9 });
		ring.position.set(cx, cy);
		ring.scale.set(0.1);
		ring.blendMode = 'add';
		root.addChild(ring);
		const state = { scale: 0.1, alpha: 1 };
		void this.tweens.to(state, { scale: 8, alpha: 0 }, {
			duration: 800,
			ease: easings.cubicOut,
			onUpdate: () => {
				ring.scale.set(state.scale);
				ring.alpha = state.alpha;
			},
		}).then(() => {
			if (!ring.destroyed) ring.destroy();
		});
	}

	/** Spirit flames continuously curl up around her body for the duration. */
	private startFoxfireSwirl(focus: Focus) {
		if (this.foxfireTick) return;
		let accumulator = 0;
		this.foxfireTick = (ticker: Ticker) => {
			accumulator += ticker.deltaMS;
			if (accumulator < 60) return;
			accumulator = 0;
			// emit at/just outside her silhouette, around a centre dropped slightly
			// below the torso, so flames curl up ALONG her edges (a halo) instead
			// of from her centre over her face
			const ang = Math.random() * Math.PI * 2;
			const jitter = 0.95 + Math.random() * 0.3;
			const rx = focus.w * 0.55 * jitter;
			const ry = focus.h * 0.5 * jitter;
			this.particles.emit({
				x: focus.cx + Math.cos(ang) * rx,
				y: focus.torsoY + focus.h * 0.1 + Math.sin(ang) * ry,
				count: 1,
				speed: [20, 80],
				gravity: -90, // curl upward
				drag: 0.5,
				life: [900, 1700],
				scaleStart: [0.6, 1.3],
				scaleEnd: 0,
				tints: [PALETTE.FOXFIRE, PALETTE.SPIRIT, 0xb7fdff],
			});
		};
		this.app.ticker.add(this.foxfireTick);
	}

	private stopFoxfireSwirl() {
		if (!this.foxfireTick) return;
		this.app.ticker.remove(this.foxfireTick);
		this.foxfireTick = null;
	}

	private startEmberRain() {
		if (this.emberTick) return;
		let accumulator = 0;
		this.emberTick = (ticker: Ticker) => {
			accumulator += ticker.deltaMS;
			if (accumulator < 90) return; // ~11 embers/sec — cheap
			accumulator = 0;
			this.particles.emit({
				x: Math.random() * this.width,
				y: -20,
				count: 1,
				// alternate embers and drifting petals for a festival-fall mix
				texture: getParticleTexture(Math.random() < 0.65 ? 'ember' : 'petal'),
				speed: [40, 120],
				angle: [Math.PI * 0.4, Math.PI * 0.6], // downward
				gravity: 60,
				life: [2500, 4500],
				scaleStart: [0.2, 0.45],
				scaleEnd: 0,
				tints: [PALETTE.EMBER, PALETTE.EMBER_HI, PALETTE.GOLD],
				rotationSpeed: [-2.5, 2.5],
			});
		};
		this.app.ticker.add(this.emberTick);
	}

	private stopEmberRain() {
		if (!this.emberTick) return;
		this.app.ticker.remove(this.emberTick);
		this.emberTick = null;
	}

	private async outro() {
		const root = this.root;
		if (!root) return;
		fxBus.emit('bigwinEnd'); // camera zoom releases with the celebration
		this.stopEmberRain();
		this.stopFoxfireSwirl();
		this.tweens.killAll();
		await this.tweens.to(root, { alpha: 0 }, { duration: 450, ease: easings.quadOut });
		this.teardownScene();
		this.playing = false;
	}

	private teardownScene() {
		this.particles.clear();
		if (this.root) {
			// particles container is owned by the pool — detach before destroy
			this.root.removeChild(this.particles.container);
			// the vignette Sprite is a child and gets destroyed here, but its
			// TEXTURE is cached across plays (see buildVignette) — don't let the
			// scene destroy take it down with the sprite
			this.root.destroy({ children: true, texture: false });
			this.root = null;
		}
	}

	/** Full release — call on game unmount. Instance is unusable afterwards. */
	destroy() {
		if (this.playing) fxBus.emit('bigwinEnd');
		this.stopEmberRain();
		this.stopFoxfireSwirl();
		this.teardownScene();
		if (this.vignetteTexture) {
			this.vignetteTexture.destroy(true);
			this.vignetteTexture = null;
		}
		this.tweens.destroy();
		this.particles.destroy();
		this.shaker.destroy();
		this.playing = false;
	}
}
