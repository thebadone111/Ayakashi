/**
 * Ayakashi — Big Win celebration sequence (BIG / SUPER / MEGA / EPIC / MAX).
 *
 * Pure PixiJS. Cinematic: ink-black vignette, rotating foxfire/gold ray fan,
 * shockwave ring, screen shake, ember + spirit-flame particle bursts, and an
 * elastic-scaling title with a count-up amount.
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
 * Escalation: each tier raises ray count, particle rates, shake intensity and
 * title scale. MAX adds a sustained ember rain + repeated shockwaves.
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
	RayBurst,
	flash,
	makeGlowTexture,
	speedLineBurst,
	easings,
	delay,
	fxBus,
} from './fx';
import { getParticleTexture } from './particleLib';

export type BigWinAlias = 'big' | 'superwin' | 'mega' | 'epic' | 'max';

interface TierConfig {
	title: string;
	rayCount: number;
	rayColors: number[];
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
		rayCount: 10,
		rayColors: [PALETTE.GOLD, PALETTE.EMBER],
		shake: 10,
		burstCount: 40,
		titleScale: 1.0,
		titleColor: PALETTE.GOLD,
		emberRain: false,
		shockwaves: 1,
	},
	superwin: {
		title: 'SUPER WIN',
		rayCount: 12,
		rayColors: [PALETTE.GOLD, PALETTE.EMBER, PALETTE.FOXFIRE],
		shake: 14,
		burstCount: 60,
		titleScale: 1.1,
		titleColor: PALETTE.EMBER_HI,
		emberRain: false,
		shockwaves: 2,
	},
	mega: {
		title: 'MEGA WIN',
		rayCount: 14,
		rayColors: [PALETTE.EMBER, PALETTE.EMBER_HI, PALETTE.FOXFIRE],
		shake: 18,
		burstCount: 80,
		titleScale: 1.22,
		titleColor: PALETTE.EMBER,
		emberRain: true,
		shockwaves: 2,
	},
	epic: {
		title: 'EPIC WIN!',
		rayCount: 16,
		rayColors: [PALETTE.SPIRIT, PALETTE.EMBER, PALETTE.GOLD],
		shake: 24,
		burstCount: 110,
		titleScale: 1.35,
		titleColor: PALETTE.SPIRIT,
		emberRain: true,
		shockwaves: 3,
	},
	max: {
		title: 'MAX WIN',
		rayCount: 20,
		rayColors: [PALETTE.BLOOD, PALETTE.GOLD, PALETTE.FOXFIRE, PALETTE.EMBER],
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
	/** Local font family — must be hosted in the project (no external fonts). */
	fontFamily?: string;
	/** Optional sumi-e brush stroke texture — swept in as a banner behind the
	 *  title. Without it the title simply slams in (no banner). */
	brushTexture?: Texture;
}

export interface PlayOptions {
	level: BigWinAlias;
	amount: number;
	formatAmount?: (n: number) => string;
	/** Total presentation time (ms). Default from tier. */
	duration?: number;
}

export class WinCelebration {
	private app: Application;
	private parent: Container;
	private root: Container | null = null;
	private tweens: TweenRunner;
	private particles: ParticlePool;
	private shaker: ScreenShaker;
	private fontFamily: string;
	private width: number;
	private height: number;
	private skipRequested = false;
	private playing = false;
	private emberTick: ((ticker: Ticker) => void) | null = null;
	private rayBurst: RayBurst | null = null;
	private brushTexture: Texture | null;

	constructor(opts: WinCelebrationOptions) {
		this.app = opts.app;
		this.parent = opts.parent;
		this.width = opts.width ?? opts.app.screen.width;
		this.height = opts.height ?? opts.app.screen.height;
		this.fontFamily = opts.fontFamily ?? 'Arial';
		this.brushTexture = opts.brushTexture ?? null;
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
		fxBus.emit('bigwin', { level: opts.level });
		const fmt = opts.formatAmount ?? ((n: number) => n.toFixed(2));
		const cx = this.width / 2;
		const cy = this.height / 2;

		// --- build scene -----------------------------------------------------
		const root = new Container();
		this.root = root;
		this.parent.addChild(root);

		// ink vignette
		const dim = new Graphics().rect(0, 0, this.width, this.height).fill({ color: PALETTE.INK });
		dim.alpha = 0;
		root.addChild(dim);

		// rotating ray fan
		this.rayBurst = new RayBurst(this.app.ticker, this.app.renderer, {
			rayCount: tier.rayCount,
			length: Math.hypot(this.width, this.height) / 2,
			colors: tier.rayColors,
			rotationSpeed: 0.3,
		});
		this.rayBurst.container.position.set(cx, cy);
		root.addChild(this.rayBurst.container);

		// central glow
		const glow = new Sprite(makeGlowTexture(this.app.renderer, 220, tier.rayColors[0]));
		glow.anchor.set(0.5);
		glow.position.set(cx, cy);
		glow.blendMode = 'add';
		glow.alpha = 0;
		glow.scale.set(0.4);
		root.addChild(glow);

		// particle layer (above rays, below text)
		root.addChild(this.particles.container);

		// title
		const titleStyle = new TextStyle({
			fontFamily: this.fontFamily,
			fontSize: 110,
			fontWeight: '900',
			fill: tier.titleColor,
			stroke: { color: PALETTE.INK, width: 10 },
			dropShadow: { color: tier.rayColors[0], blur: 18, distance: 0, alpha: 0.9 },
			letterSpacing: 6,
		});
		// sumi-e brush banner behind the title — swept in on the slam so the
		// title reads as painted onto the screen with one confident stroke
		let brush: Sprite | null = null;
		if (this.brushTexture) {
			brush = new Sprite(this.brushTexture);
			brush.anchor.set(0.5);
			brush.position.set(cx, cy - 60);
			const bw = Math.min(this.width * 0.7, 900);
			brush.width = bw;
			brush.height = bw * (this.brushTexture.height / this.brushTexture.width);
			brush.tint = tier.titleColor;
			brush.alpha = 0;
			brush.scale.x = 0; // swept open horizontally on the slam
			root.addChild(brush);
		}

		const title = new Text({ text: tier.title, style: titleStyle });
		title.anchor.set(0.5);
		title.position.set(cx, cy - 70);
		title.scale.set(0);
		root.addChild(title);

		// amount counter
		const amountStyle = new TextStyle({
			fontFamily: this.fontFamily,
			fontSize: 72,
			fontWeight: '700',
			fill: PALETTE.GOLD,
			stroke: { color: PALETTE.INK, width: 8 },
			dropShadow: { color: PALETTE.EMBER, blur: 12, distance: 0, alpha: 0.8 },
		});
		const amountText = new Text({ text: fmt(0), style: amountStyle });
		amountText.anchor.set(0.5);
		amountText.position.set(cx, cy + 60);
		amountText.alpha = 0;
		root.addChild(amountText);

		// --- intro -----------------------------------------------------------
		// Anticipation inhale (~240ms): the world dims while spirit energy
		// converges into the centre — a held breath. THEN the slam. The beat of
		// nothing before the impact is what makes the impact read as heavy.
		this.rayBurst.container.alpha = 0;
		glow.scale.set(1.9);
		void this.tweens.to(dim, { alpha: 0.72 }, { duration: 260 });
		void this.tweens.to(glow.scale, { x: 0.45, y: 0.45 }, { duration: 240, ease: easings.cubicIn });
		await this.tweens.to(glow, { alpha: 0.55 }, { duration: 240 });

		// the slam
		void flash(root, this.tweens, { width: this.width, height: this.height, duration: 300 });
		void this.tweens.to(this.rayBurst.container, { alpha: 1 }, { duration: 180 });
		void this.tweens.to(glow, { alpha: 0.9 }, { duration: 250 });
		void this.tweens.to(glow.scale, { x: 1, y: 1 }, { duration: 500, ease: easings.backOut });
		void this.shaker.shake({ intensity: tier.shake, duration: 700 });
		this.spawnShockwave(root, cx, cy, tier.rayColors[0]);
		this.burst(cx, cy, tier);

		// brush banner sweeps open just before the title lands
		if (brush) {
			void this.tweens.to(brush, { alpha: 0.92 }, { duration: 160 });
			void this.tweens.to(brush.scale, { x: 1 }, { duration: 320, ease: easings.quadOut });
		}

		// title slam — strike accent on the overshoot frame
		void delay(180).then(() => {
			if (!this.root || this.skipRequested) return;
			speedLineBurst(this.root, this.tweens, {
				x: cx, y: cy - 70,
				color: tier.titleColor,
				count: 18,
				innerRadius: 180,
				length: 260,
				duration: 340,
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

		// ember rain for high tiers
		if (tier.emberRain) this.startEmberRain();

		// extra shockwaves staggered
		for (let i = 1; i < tier.shockwaves; i++) {
			void delay(i * 900).then(() => {
				if (!this.playing || this.skipRequested || !this.root) return;
				this.spawnShockwave(this.root, cx, cy, tier.rayColors[i % tier.rayColors.length]);
				this.burst(cx, cy, tier, 0.5);
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

	private async outro() {
		const root = this.root;
		if (!root) return;
		this.stopEmberRain();
		this.tweens.killAll();
		await this.tweens.to(root, { alpha: 0 }, { duration: 450, ease: easings.quadOut });
		this.teardownScene();
		this.playing = false;
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
		// gold petals raining through the rays — festival confetti
		this.particles.emit({
			x: cx, y: cy,
			count: Math.round(tier.burstCount * 0.25 * scale),
			texture: getParticleTexture('petal'),
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
		// spirit flames — light, floaty, additive
		this.particles.emit({
			x: cx, y: cy,
			count: Math.round(tier.burstCount * 0.4 * scale),
			speed: [60, 260],
			gravity: -120, // drift upward
			drag: 0.5,
			life: [1200, 2400],
			scaleStart: [0.8, 1.6],
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
		}).then(() => ring.destroy());
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

	private teardownScene() {
		this.rayBurst?.destroy();
		this.rayBurst = null;
		this.particles.clear();
		if (this.root) {
			// particles container is owned by the pool — detach before destroy
			this.root.removeChild(this.particles.container);
			this.root.destroy({ children: true });
			this.root = null;
		}
	}

	/** Full release — call on game unmount. Instance is unusable afterwards. */
	destroy() {
		this.stopEmberRain();
		this.teardownScene();
		this.tweens.destroy();
		this.particles.destroy();
		this.shaker.destroy();
		this.playing = false;
	}
}
