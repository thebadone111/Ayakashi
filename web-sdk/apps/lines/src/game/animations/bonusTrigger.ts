/**
 * Ayakashi — Bonus trigger animation (full-screen overlay).
 *
 * Narrative: the Temple Bell (scatter) tolls. Each landed scatter ignites with
 * foxfire, spirit wisps spiral out of every scatter and converge on screen
 * centre, then a triple bell-toll shockwave ripples outward with screen shake
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

import { Application, Container, Graphics, Sprite, Ticker } from 'pixi.js';

import {
	PALETTE,
	TweenRunner,
	ParticlePool,
	ScreenShaker,
	flash,
	makeGlowTexture,
	easings,
	delay,
	fxBus,
} from './fx';

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
	private app: Application;
	private parent: Container;
	private tweens: TweenRunner;
	private particles: ParticlePool;
	private shaker: ScreenShaker;
	private width: number;
	private height: number;
	private root: Container | null = null;
	private wispTick: ((ticker: Ticker) => void) | null = null;
	private playing = false;

	constructor(opts: BonusTriggerOptions) {
		this.app = opts.app;
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

		// ink wash — screen darkens like spilled sumi ink
		const ink = new Graphics().rect(0, 0, this.width, this.height).fill({ color: PALETTE.INK });
		ink.alpha = 0;
		root.addChild(ink);
		void this.tweens.to(ink, { alpha: 0.65 }, { duration: 600, ease: easings.quadOut });

		root.addChild(this.particles.container);

		// 1) each scatter ignites — staggered foxfire flare per bell
		const glowTex = makeGlowTexture(this.app.renderer, 140, PALETTE.FOXFIRE);
		const flares: Sprite[] = [];
		for (let i = 0; i < opts.scatterPositions.length; i++) {
			const pos = opts.scatterPositions[i];
			const flare = new Sprite(glowTex);
			flare.anchor.set(0.5);
			flare.position.set(pos.x, pos.y);
			flare.blendMode = 'add';
			flare.alpha = 0;
			flare.scale.set(0.3);
			root.addChild(flare);
			flares.push(flare);

			void delay(i * 160).then(() => {
				if (!this.root) return;
				void this.tweens.to(flare, { alpha: 1 }, { duration: 180 });
				void this.tweens.to(flare.scale, { x: 1.2, y: 1.2 }, { duration: 350, ease: easings.backOut });
				this.particles.emit({
					x: pos.x, y: pos.y,
					count: 14,
					speed: [80, 240],
					life: [400, 900],
					scaleStart: [0.4, 0.9],
					tints: [PALETTE.FOXFIRE, 0xb7fdff, PALETTE.SPIRIT],
				});
			});
		}
		await delay(opts.scatterPositions.length * 160 + 350);

		// 2) spirit wisps stream from every scatter into screen centre
		this.startWisps(opts.scatterPositions, cx, cy);
		await delay(900);
		this.stopWisps();

		// centre ignition
		const core = new Sprite(makeGlowTexture(this.app.renderer, 260, PALETTE.SPIRIT));
		core.anchor.set(0.5);
		core.position.set(cx, cy);
		core.blendMode = 'add';
		core.alpha = 0;
		core.scale.set(0.2);
		root.addChild(core);
		void this.tweens.to(core, { alpha: 1 }, { duration: 250 });
		await this.tweens.to(core.scale, { x: 1.3, y: 1.3 }, { duration: 450, ease: easings.backOut });

		// 3) triple bell toll — shockwave rings + shake, escalating
		for (let i = 0; i < 3; i++) {
			this.toll(root, cx, cy, i);
			await delay(420);
		}

		// final white-out flash to hand off to FS intro
		await flash(root, this.tweens, {
			width: this.width,
			height: this.height,
			color: 0xeafcff,
			peakAlpha: 1,
			duration: 500,
		});

		// fade scene out (FS intro takes over underneath the flash)
		await this.tweens.to(root, { alpha: 0 }, { duration: 300 });
		this.teardownScene();
		this.playing = false;
	}

	/** Single bell-toll: expanding ring pair + radial ember puff + shake. */
	private toll(root: Container, cx: number, cy: number, index: number) {
		const colors = [PALETTE.FOXFIRE, PALETTE.GOLD, PALETTE.SPIRIT];
		const color = colors[index % colors.length];
		for (const [delayMs, width] of [[0, 16], [120, 8]] as const) {
			void delay(delayMs).then(() => {
				if (!this.root) return;
				const ring = new Graphics().circle(0, 0, 90).stroke({ color, width, alpha: 0.95 });
				ring.position.set(cx, cy);
				ring.blendMode = 'add';
				const state = { scale: 0.15, alpha: 1 };
				ring.scale.set(state.scale);
				void this.tweens.to(state, { scale: 9 + index * 2, alpha: 0 }, {
					duration: 900,
					ease: easings.cubicOut,
					onUpdate: () => {
						ring.scale.set(state.scale);
						ring.alpha = state.alpha;
					},
				}).then(() => ring.destroy());
			});
		}
		this.particles.emit({
			x: cx, y: cy,
			count: 24 + index * 10,
			speed: [200, 600],
			life: [500, 1100],
			scaleStart: [0.5, 1],
			tints: [color, PALETTE.EMBER_HI],
		});
		void this.shaker.shake({ intensity: 10 + index * 6, duration: 350 });
	}

	private startWisps(sources: { x: number; y: number }[], cx: number, cy: number) {
		if (this.wispTick) return;
		let accumulator = 0;
		this.wispTick = (ticker: Ticker) => {
			accumulator += ticker.deltaMS;
			if (accumulator < 50) return;
			accumulator = 0;
			for (const src of sources) {
				// aim each wisp roughly at centre with spread; drag makes them "arrive"
				const angle = Math.atan2(cy - src.y, cx - src.x) + (Math.random() - 0.5) * 0.7;
				const dist = Math.hypot(cx - src.x, cy - src.y);
				this.particles.emit({
					x: src.x, y: src.y,
					count: 2,
					speed: [dist * 0.9, dist * 1.3],
					angle: [angle, angle],
					drag: 0.25,
					life: [700, 1000],
					scaleStart: [0.5, 1.1],
					scaleEnd: 0.1,
					tints: [PALETTE.FOXFIRE, PALETTE.SPIRIT, 0xb7fdff],
				});
			}
		};
		this.app.ticker.add(this.wispTick);
	}

	private stopWisps() {
		if (!this.wispTick) return;
		this.app.ticker.remove(this.wispTick);
		this.wispTick = null;
	}

	private teardownScene() {
		if (this.root) {
			this.root.removeChild(this.particles.container);
			this.root.destroy({ children: true });
			this.root = null;
		}
		this.particles.clear();
	}

	destroy() {
		this.stopWisps();
		this.teardownScene();
		this.tweens.destroy();
		this.particles.destroy();
		this.shaker.destroy();
		this.playing = false;
	}
}
