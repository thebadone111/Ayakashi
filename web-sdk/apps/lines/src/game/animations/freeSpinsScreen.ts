/**
 * Ayakashi — Free Spins intro and outro screens.
 *
 * Pure PixiJS replacement for the reference fsIntro/fsOutro Spine screens.
 *
 * Intro: ink-dark stage, a stylised torii gate drawn procedurally rises from
 * mist, twin foxfire pillars ignite at its posts, "FREE SPINS" slams in with
 * the spin count, ember drift fills the frame. Resolves on `press()` (player
 * tap) or after `autoDismissMs`.
 *
 * Outro: gold variant — "TOTAL WIN" with count-up and coin/ember fountain.
 *
 * Wiring (Tom) — replace FreeSpinIntro.svelte / FreeSpinOutro.svelte bodies:
 *
 *   const fs = new FreeSpinsScreen({ app, parent: overlayLayer });
 *   // 'freeSpinIntroShow' + 'freeSpinIntroUpdate':
 *   await fs.playIntro({ totalFreeSpins: bookEvent.totalFs });
 *   // 'freeSpinOutroCountUp':
 *   await fs.playOutro({ amount, formatAmount: bookEventAmountToCurrencyString });
 *   // pointer tap while showing:
 *   fs.press();
 *   // teardown:
 *   fs.destroy();
 */

import {
	Application,
	Container,
	Graphics,
	Sprite,
	Text,
	TextStyle,
	Ticker,
} from 'pixi.js';

import {
	PALETTE,
	TweenRunner,
	ParticlePool,
	flash,
	makeGlowTexture,
	easings,
	delay,
	fxBus,
} from './fx';

export interface FreeSpinsScreenOptions {
	app: Application;
	parent: Container;
	width?: number;
	height?: number;
	fontFamily?: string;
}

export class FreeSpinsScreen {
	private app: Application;
	private parent: Container;
	private tweens: TweenRunner;
	private particles: ParticlePool;
	private width: number;
	private height: number;
	private fontFamily: string;
	private root: Container | null = null;
	private emberTick: ((ticker: Ticker) => void) | null = null;
	private pressResolve: (() => void) | null = null;
	private playing = false;

	constructor(opts: FreeSpinsScreenOptions) {
		this.app = opts.app;
		this.parent = opts.parent;
		this.width = opts.width ?? opts.app.screen.width;
		this.height = opts.height ?? opts.app.screen.height;
		this.fontFamily = opts.fontFamily ?? 'Arial';
		this.tweens = new TweenRunner(opts.app.ticker);
		this.particles = new ParticlePool(opts.app.ticker, opts.app.renderer, 250);
	}

	/** Player pressed to continue — resolves the active intro/outro hold. */
	press() {
		this.pressResolve?.();
		this.pressResolve = null;
	}

	// =========================================================================
	// INTRO
	// =========================================================================

	async playIntro(opts: { totalFreeSpins: number; autoDismissMs?: number }): Promise<void> {
		if (this.playing) return;
		this.playing = true;
		fxBus.emit('fsintro');

		const cx = this.width / 2;
		const cy = this.height / 2;
		const root = this.buildStage();

		// torii gate — procedural ink silhouette, rises from below through mist
		const gate = this.buildToriiGate();
		gate.position.set(cx, cy + this.height * 0.55); // start sunk below view
		gate.alpha = 0;
		root.addChild(gate);

		// foxfire pillars at the gate posts
		const pillarL = this.buildPillarFlame(-170, 40);
		const pillarR = this.buildPillarFlame(170, 40);
		gate.addChild(pillarL, pillarR);

		root.addChild(this.particles.container);

		// titles
		const title = this.makeTitle('FREE SPINS', PALETTE.FOXFIRE, 96);
		title.position.set(cx, cy - 130);
		title.scale.set(0);
		root.addChild(title);

		const count = this.makeTitle(`${opts.totalFreeSpins}`, PALETTE.GOLD, 150);
		count.position.set(cx, cy + 10);
		count.scale.set(0);
		root.addChild(count);

		const hint = this.makeTitle('PRESS ANYWHERE TO CONTINUE', 0xcfd8e3, 28);
		hint.position.set(cx, this.height - 80);
		hint.alpha = 0;
		root.addChild(hint);

		// --- choreography ------------------------------------------------------
		// gate rises through the mist
		void this.tweens.to(gate, { alpha: 1 }, { duration: 700 });
		await this.tweens.to(gate.position, { y: cy + 40 }, { duration: 1100, ease: easings.cubicOut });

		// pillars ignite
		for (const pillar of [pillarL, pillarR]) {
			void this.tweens.to(pillar, { alpha: 1 }, { duration: 300 });
			void this.tweens.to(pillar.scale, { x: 1, y: 1 }, { duration: 450, ease: easings.backOut });
		}
		this.particles.emit({
			x: cx, y: cy + 40,
			count: 30,
			speed: [100, 350],
			angle: [-Math.PI, 0],
			gravity: -80,
			drag: 0.5,
			life: [1000, 2000],
			scaleStart: [0.6, 1.3],
			tints: [PALETTE.FOXFIRE, PALETTE.SPIRIT, 0xb7fdff],
		});

		// title + count slam
		await this.tweens.to(title.scale, { x: 1, y: 1 }, { duration: 600, ease: easings.elasticOut });
		void flash(root, this.tweens, { width: this.width, height: this.height, color: PALETTE.FOXFIRE, peakAlpha: 0.35, duration: 300 });
		await this.tweens.to(count.scale, { x: 1, y: 1 }, { duration: 700, ease: easings.elasticOut });

		// idle loop: count pulse + ember drift + hint blink
		void this.tweens.to(count.scale, { x: 1.06, y: 1.06 }, { duration: 700, ease: easings.sineInOut, repeat: -1, yoyo: true });
		void this.tweens.to(hint, { alpha: 1 }, { duration: 400, ease: easings.sineInOut, repeat: -1, yoyo: true });
		this.startEmberDrift([PALETTE.FOXFIRE, PALETTE.SPIRIT]);

		// hold for press or timeout
		await this.waitForPress(opts.autoDismissMs ?? 30000);

		await this.dismiss();
	}

	// =========================================================================
	// OUTRO
	// =========================================================================

	async playOutro(opts: {
		amount: number;
		formatAmount?: (n: number) => string;
		autoDismissMs?: number;
	}): Promise<void> {
		if (this.playing) return;
		this.playing = true;

		const fmt = opts.formatAmount ?? ((n: number) => n.toFixed(2));
		const cx = this.width / 2;
		const cy = this.height / 2;
		const root = this.buildStage();

		// gold halo
		const halo = new Sprite(makeGlowTexture(this.app.renderer, 300, PALETTE.GOLD));
		halo.anchor.set(0.5);
		halo.position.set(cx, cy);
		halo.blendMode = 'add';
		halo.alpha = 0;
		halo.scale.set(0.3);
		root.addChild(halo);

		root.addChild(this.particles.container);

		const title = this.makeTitle('TOTAL WIN', PALETTE.GOLD, 84);
		title.position.set(cx, cy - 110);
		title.scale.set(0);
		root.addChild(title);

		const amountText = this.makeTitle(fmt(0), PALETTE.EMBER_HI, 110);
		amountText.position.set(cx, cy + 30);
		amountText.alpha = 0;
		root.addChild(amountText);

		const hint = this.makeTitle('PRESS ANYWHERE TO CONTINUE', 0xcfd8e3, 28);
		hint.position.set(cx, this.height - 80);
		hint.alpha = 0;
		root.addChild(hint);

		// choreography
		void this.tweens.to(halo, { alpha: 0.9 }, { duration: 500 });
		void this.tweens.to(halo.scale, { x: 1.2, y: 1.2 }, { duration: 700, ease: easings.backOut });
		await this.tweens.to(title.scale, { x: 1, y: 1 }, { duration: 600, ease: easings.elasticOut });

		// coin fountain while counting
		this.startEmberDrift([PALETTE.GOLD, PALETTE.EMBER_HI, PALETTE.EMBER]);
		void this.tweens.to(amountText, { alpha: 1 }, { duration: 200 });
		const counter = { value: 0 };
		await this.tweens.to(counter, { value: opts.amount }, {
			duration: 2400,
			ease: easings.cubicOut,
			onUpdate: () => {
				amountText.text = fmt(counter.value);
			},
		});
		amountText.text = fmt(opts.amount);
		this.particles.emit({
			x: cx, y: cy + 30,
			count: 60,
			speed: [300, 800],
			angle: [-Math.PI, 0],
			gravity: 1300,
			life: [900, 1700],
			scaleStart: [0.5, 1.1],
			scaleEnd: 0.2,
			tints: [PALETTE.GOLD, 0xfff2b0, PALETTE.EMBER_HI],
			rotationSpeed: [-6, 6],
		});
		void this.tweens.to(amountText.scale, { x: 1.18, y: 1.18 }, { duration: 130, ease: easings.quadOut })
			.then(() => this.tweens.to(amountText.scale, { x: 1, y: 1 }, { duration: 280, ease: easings.backOut }));

		void this.tweens.to(hint, { alpha: 1 }, { duration: 400, ease: easings.sineInOut, repeat: -1, yoyo: true });

		await this.waitForPress(opts.autoDismissMs ?? 30000);
		await this.dismiss();
	}

	// =========================================================================
	// internals
	// =========================================================================

	private buildStage(): Container {
		const root = new Container();
		this.root = root;
		this.parent.addChild(root);
		const ink = new Graphics().rect(0, 0, this.width, this.height).fill({ color: PALETTE.INK });
		ink.alpha = 0;
		root.addChild(ink);
		void this.tweens.to(ink, { alpha: 0.85 }, { duration: 500 });
		return root;
	}

	/** Stylised torii gate silhouette with a faint blood-red rim light. */
	private buildToriiGate(): Container {
		const gate = new Container();
		const g = new Graphics();
		const ink = 0x14101c;
		// posts
		g.rect(-180, -120, 40, 320).fill({ color: ink });
		g.rect(140, -120, 40, 320).fill({ color: ink });
		// lower beam (nuki)
		g.rect(-210, -150, 420, 34).fill({ color: ink });
		// top beam (kasagi) with upswept ends
		g.poly([-260, -230, 260, -230, 240, -188, -240, -188]).fill({ color: ink });
		// rim light
		g.poly([-260, -230, 260, -230, 256, -222, -256, -222]).fill({ color: PALETTE.BLOOD, alpha: 0.85 });
		g.rect(-180, -120, 6, 320).fill({ color: PALETTE.BLOOD, alpha: 0.45 });
		g.rect(174, -120, 6, 320).fill({ color: PALETTE.BLOOD, alpha: 0.45 });
		gate.addChild(g);
		return gate;
	}

	private buildPillarFlame(x: number, y: number): Container {
		const pillar = new Container();
		const glow = new Sprite(makeGlowTexture(this.app.renderer, 90, PALETTE.FOXFIRE));
		glow.anchor.set(0.5, 0.8);
		glow.scale.set(1, 1.8); // stretched vertically = flame
		glow.blendMode = 'add';
		pillar.addChild(glow);
		pillar.position.set(x, y);
		pillar.alpha = 0;
		pillar.scale.set(0.3);
		// flicker loop
		void this.tweens.to(glow, { alpha: 0.7 }, { duration: 260, ease: easings.sineInOut, repeat: -1, yoyo: true });
		return pillar;
	}

	private makeTitle(text: string, fill: number, fontSize: number): Text {
		const t = new Text({
			text,
			style: new TextStyle({
				fontFamily: this.fontFamily,
				fontSize,
				fontWeight: '900',
				fill,
				stroke: { color: PALETTE.INK, width: Math.max(4, fontSize / 12) },
				dropShadow: { color: fill, blur: 16, distance: 0, alpha: 0.8 },
				letterSpacing: 4,
			}),
		});
		t.anchor.set(0.5);
		return t;
	}

	private startEmberDrift(tints: number[]) {
		if (this.emberTick) return;
		let accumulator = 0;
		this.emberTick = (ticker: Ticker) => {
			accumulator += ticker.deltaMS;
			if (accumulator < 120) return;
			accumulator = 0;
			this.particles.emit({
				x: Math.random() * this.width,
				y: this.height + 20,
				count: 1,
				speed: [30, 90],
				angle: [-Math.PI * 0.6, -Math.PI * 0.4], // upward
				life: [3000, 5000],
				scaleStart: [0.3, 0.8],
				scaleEnd: 0,
				tints,
			});
		};
		this.app.ticker.add(this.emberTick);
	}

	private stopEmberDrift() {
		if (!this.emberTick) return;
		this.app.ticker.remove(this.emberTick);
		this.emberTick = null;
	}

	private waitForPress(timeoutMs: number): Promise<void> {
		return new Promise<void>((resolve) => {
			let settled = false;
			const settle = () => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				window.removeEventListener('pointerdown', settle);
				window.removeEventListener('keydown', onKey);
				this.pressResolve = null;
				resolve();
			};
			const onKey = (event: KeyboardEvent) => {
				if (event.code === 'Space' || event.code === 'Enter') settle();
			};
			const timer = setTimeout(settle, timeoutMs);
			// direct window listeners — independent of UI layering, always works
			window.addEventListener('pointerdown', settle);
			window.addEventListener('keydown', onKey);
			this.pressResolve = settle;
		});
	}

	private async dismiss() {
		this.stopEmberDrift();
		const root = this.root;
		if (root) {
			this.tweens.killAll();
			await this.tweens.to(root, { alpha: 0 }, { duration: 400 });
			root.removeChild(this.particles.container);
			root.destroy({ children: true });
			this.root = null;
		}
		this.particles.clear();
		this.playing = false;
	}

	destroy() {
		this.stopEmberDrift();
		this.press();
		if (this.root) {
			this.root.removeChild(this.particles.container);
			this.root.destroy({ children: true });
			this.root = null;
		}
		this.tweens.destroy();
		this.particles.destroy();
		this.playing = false;
	}
}
