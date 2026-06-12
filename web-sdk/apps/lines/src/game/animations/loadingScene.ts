/**
 * Ayakashi — loading screen scene.
 *
 * Minimal and atmospheric: the painted background does the scene-setting,
 * we add only a floating transparent logo with a breathing spirit glow,
 * three foxfire orbs orbiting beneath it, ember drift, and a lacquer
 * progress bar with a glowing foxfire fill.
 */

import {
	Application,
	Container,
	Graphics,
	Sprite,
	Texture,
	Ticker,
} from 'pixi.js';

import {
	PALETTE,
	ParticlePool,
	makeGlowTexture,
	easings,
	TweenRunner,
} from './fx';

export interface LoadingSceneOptions {
	app: Application;
	parent: Container;
	x: number;
	y: number;
	/** Overall scene width; logo and bar scale from it. */
	width?: number;
}

export class LoadingScene {
	private app: Application;
	private root: Container;
	private tweens: TweenRunner;
	private particles: ParticlePool;
	private orbs: Sprite[] = [];
	private logoGlow: Sprite;
	private logo: Sprite | null = null;
	private barTrack: Graphics;
	private barFill: Graphics;
	private barCap: Sprite;
	private barWidth: number;
	private barY: number;
	private width: number;
	private progress = 0;
	private shownProgress = 0;
	private completed = false;
	private elapsed = 0;
	private emberAcc = 0;
	private tick = (ticker: Ticker) => this.update(ticker.deltaMS);

	constructor(opts: LoadingSceneOptions) {
		this.app = opts.app;
		this.width = opts.width ?? 640;
		this.root = new Container();
		this.root.position.set(opts.x, opts.y);
		opts.parent.addChild(this.root);

		this.tweens = new TweenRunner(opts.app.ticker);
		this.particles = new ParticlePool(opts.app.ticker, opts.app.renderer, 80);

		// breathing spirit glow that the logo floats on — blends it into the scene
		this.logoGlow = new Sprite(makeGlowTexture(this.app.renderer, 230, PALETTE.SPIRIT));
		this.logoGlow.anchor.set(0.5);
		this.logoGlow.blendMode = 'add';
		this.logoGlow.alpha = 0.22;
		this.logoGlow.scale.set(2.2, 1.3);
		this.logoGlow.position.set(0, -20);
		this.root.addChild(this.logoGlow);

		this.root.addChild(this.particles.container);

		// foxfire orbs drifting in a lazy ellipse beneath the logo
		const orbColors = [PALETTE.FOXFIRE, PALETTE.GOLD, PALETTE.SPIRIT];
		for (let i = 0; i < 3; i++) {
			const orb = new Sprite(makeGlowTexture(this.app.renderer, 13, orbColors[i]));
			orb.anchor.set(0.5);
			orb.blendMode = 'add';
			this.root.addChild(orb);
			this.orbs.push(orb);
		}

		// progress bar — lacquer track, foxfire fill
		this.barWidth = this.width * 0.5;
		this.barY = 120;
		this.barTrack = new Graphics();
		this.barTrack
			.roundRect(-this.barWidth / 2, this.barY, this.barWidth, 12, 6)
			.fill({ color: 0x14101c, alpha: 0.85 })
			.roundRect(-this.barWidth / 2, this.barY, this.barWidth, 12, 6)
			.stroke({ color: 0x3d2f1e, width: 2, alpha: 0.9 });
		this.root.addChild(this.barTrack);

		this.barFill = new Graphics();
		this.barFill.blendMode = 'add';
		this.root.addChild(this.barFill);

		this.barCap = new Sprite(makeGlowTexture(this.app.renderer, 20, PALETTE.FOXFIRE));
		this.barCap.anchor.set(0.5);
		this.barCap.blendMode = 'add';
		this.barCap.position.set(-this.barWidth / 2, this.barY + 6);
		this.root.addChild(this.barCap);

		this.app.ticker.add(this.tick);
	}

	/** Attach the logo texture once it has loaded. */
	setLogo(texture: Texture) {
		if (this.logo) return;
		this.logo = new Sprite(texture);
		this.logo.anchor.set(0.5);
		const logoWidth = this.width * 0.78;
		this.logo.scale.set(logoWidth / texture.width);
		this.logo.position.set(0, -30);
		this.logo.alpha = 0;
		this.root.addChild(this.logo);
		void this.tweens.to(this.logo, { alpha: 1 }, { duration: 900, ease: easings.quadOut });
	}

	setProgress(p: number) {
		this.progress = Math.max(0, Math.min(1, p));
		if (this.progress >= 1 && !this.completed) {
			this.completed = true;
			void this.tweens.to(this.barCap.scale, { x: 2.2, y: 2.2 }, { duration: 250, ease: easings.quadOut })
				// the scene can be torn down during the pop — barCap.scale is null then
				.then(() => this.tweens.to(this.barCap?.scale, { x: 1, y: 1 }, { duration: 400, ease: easings.backOut }));
			this.particles.emit({
				x: this.barWidth / 2,
				y: this.barY + 6,
				count: 16,
				speed: [80, 280],
				life: [400, 900],
				scaleStart: [0.3, 0.7],
				tints: [PALETTE.GOLD, PALETTE.FOXFIRE, 0xfff2b0],
			});
		}
	}

	private update(deltaMS: number) {
		this.elapsed += deltaMS;
		const t = this.elapsed / 1000;

		// glow breath — ties the logo into the scene light
		this.logoGlow.alpha = 0.16 + (Math.sin(t * 1.1) * 0.5 + 0.5) * 0.14;
		this.logoGlow.scale.set(2.2 + Math.sin(t * 0.7) * 0.12, 1.3 + Math.sin(t * 0.7) * 0.07);

		// logo float
		if (this.logo) this.logo.y = -30 + Math.sin(t * 0.7) * 7;

		// orbit beneath the logo, speeding up with progress
		const speed = 1.2 + this.shownProgress * 2;
		for (let i = 0; i < this.orbs.length; i++) {
			const a = t * speed + (i / this.orbs.length) * Math.PI * 2;
			this.orbs[i].position.set(Math.cos(a) * this.width * 0.3, 70 + Math.sin(a) * 18);
			this.orbs[i].alpha = 0.55 + Math.sin(t * 5 + i * 2) * 0.3;
		}

		// progress fill eases toward the real value
		this.shownProgress += (this.progress - this.shownProgress) * Math.min(1, deltaMS / 200);
		const fillWidth = this.barWidth * this.shownProgress;
		this.barFill.clear();
		if (fillWidth > 4) {
			this.barFill
				.roundRect(-this.barWidth / 2 + 2, this.barY + 2, fillWidth - 4, 8, 4)
				.fill({ color: PALETTE.FOXFIRE, alpha: 0.85 });
		}
		this.barCap.x = -this.barWidth / 2 + fillWidth;
		this.barCap.alpha = 0.7 + Math.sin(t * 6) * 0.3;

		// ember drift through the vignette
		this.emberAcc += deltaMS;
		if (this.emberAcc >= 320) {
			this.emberAcc = 0;
			this.particles.emit({
				x: (Math.random() - 0.5) * this.width,
				y: 160,
				count: 1,
				speed: [25, 70],
				angle: [-Math.PI * 0.6, -Math.PI * 0.4],
				life: [2500, 5000],
				scaleStart: [0.2, 0.5],
				scaleEnd: 0,
				alphaStart: 0.7,
				tints: [PALETTE.EMBER, PALETTE.FOXFIRE, PALETTE.EMBER_HI],
			});
		}
	}

	destroy() {
		this.app.ticker.remove(this.tick);
		this.tweens.destroy();
		this.root.removeChild(this.particles.container);
		this.particles.destroy();
		this.root.destroy({ children: true, texture: false });
		this.orbs = [];
		this.logo = null;
	}
}
