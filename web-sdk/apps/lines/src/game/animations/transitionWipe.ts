/**
 * Ayakashi — mist transition.
 *
 * A surge of yokai fog rolls in from both edges of the screen: layered soft
 * mist puffs (ink-grey with a few spirit-tinted ones) swell and converge
 * while a dark veil rises beneath them, fully hiding the scene. The swap
 * (`onCovered`) happens at the whiteless peak, then the fog disperses upward
 * and thins out, revealing the new scene.
 *
 * Same class name and API as the old ink wipe — no rewiring needed:
 *   await wipe.play({ onCovered });
 */

import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';

import {
	PALETTE,
	TweenRunner,
	ParticlePool,
	makeGlowTexture,
	easings,
	delay,
} from './fx';

export interface TransitionWipeOptions {
	app: Application;
	parent: Container;
	width?: number;
	height?: number;
	/** The game's bg_mist texture — fog puffs use the real painted mist. */
	mistTexture?: Texture;
}

const PUFF_COUNT = 26;

export class TransitionWipe {
	private app: Application;
	private parent: Container;
	private tweens: TweenRunner;
	private particles: ParticlePool;
	private width: number;
	private height: number;
	private root: Container | null = null;
	private playing = false;
	private mistTexture: Texture | null;

	constructor(opts: TransitionWipeOptions) {
		this.app = opts.app;
		this.parent = opts.parent;
		this.width = opts.width ?? opts.app.screen.width;
		this.height = opts.height ?? opts.app.screen.height;
		this.mistTexture = opts.mistTexture ?? null;
		this.tweens = new TweenRunner(opts.app.ticker);
		this.particles = new ParticlePool(opts.app.ticker, opts.app.renderer, 100);
	}

	async play(opts: { onCovered?: () => void; holdMs?: number } = {}): Promise<void> {
		if (this.playing) return;
		this.playing = true;

		const W = this.width;
		const H = this.height;
		const root = new Container();
		this.root = root;
		this.parent.addChild(root);

		// dark veil under the fog — guarantees full coverage at peak
		const veil = new Graphics().rect(0, 0, W, H).fill({ color: PALETTE.INK });
		veil.alpha = 0;
		root.addChild(veil);

		root.addChild(this.particles.container);

		// fog puffs — the game's own painted bg_mist, layered and rotated so the
		// transition fog matches the scene's atmosphere (no purple)
		const puffs: Sprite[] = [];
		const puffTexture = this.mistTexture ?? makeGlowTexture(this.app.renderer, 180, 0xffffff);
		const usingMistArt = this.mistTexture !== null;
		for (let i = 0; i < PUFF_COUNT; i++) {
			const puff = new Sprite(puffTexture);
			puff.anchor.set(0.5);
			// 'screen' makes the mist art's black background mathematically
			// transparent — safe whether or not the PNG has an alpha channel
			puff.blendMode = usingMistArt ? 'screen' : 'normal';
			if (!usingMistArt) puff.tint = 0x2e2e3c; // fallback: neutral ink-grey
			puff.rotation = Math.random() * Math.PI * 2;
			if (Math.random() < 0.5) puff.scale.x *= -1; // mirror for variety
			const fromLeft = i % 2 === 0;
			// start just off the left/right edges, spread over the full height
			puff.position.set(
				fromLeft ? -W * 0.15 - Math.random() * W * 0.1 : W * 1.15 + Math.random() * W * 0.1,
				(i / PUFF_COUNT) * H + (Math.random() - 0.5) * H * 0.15,
			);
			puff.alpha = 0;
			const baseScale = usingMistArt ? (W / puffTexture.width) * 0.55 : 0.6;
			puff.scale.set(baseScale * (0.7 + Math.random() * 0.6) * Math.sign(puff.scale.x), baseScale * (0.7 + Math.random() * 0.6));
			root.addChild(puff);
			puffs.push(puff);
		}

		// ROLL IN — puffs surge toward (and past) the centre, swelling. Snappier
		// than before (~40% faster, tighter stagger) so the transition feels
		// decisive instead of a slow drift (A3).
		const inPromises = puffs.map((puff, i) => {
			const targetX = W * (0.25 + Math.random() * 0.5);
			const swell = 2.2 + Math.random() * 1.2;
			void this.tweens.to(puff, { alpha: 0.95 }, { duration: 300 + i * 7, ease: easings.quadOut });
			void this.tweens.to(puff.scale, { x: puff.scale.x * swell, y: puff.scale.y * swell }, {
				duration: 460 + i * 8,
				ease: easings.quadOut,
			});
			return this.tweens.to(puff, { x: targetX, y: puff.y + (Math.random() - 0.5) * H * 0.08 }, {
				duration: 420 + i * 8,
				ease: easings.cubicOut,
			});
		});
		// veil rises fast so full coverage is guaranteed early
		void this.tweens.to(veil, { alpha: 1 }, { duration: 460, ease: easings.quadIn });

		// drifting pale motes inside the fog (kept neutral — no purple)
		this.particles.emit({
			x: W / 2, y: H / 2,
			count: 20,
			speed: [30, 120],
			drag: 0.6,
			life: [1200, 2400],
			scaleStart: [0.3, 0.8],
			alphaStart: 0.5,
			tints: [0xb7c4cc, 0x8a96a0, PALETTE.FOXFIRE],
		});

		await Promise.all(inPromises);

		// fully covered — swap the scene behind the fog
		opts.onCovered?.();
		await delay(opts.holdMs ?? 220);

		// DISPERSE — fog thins, drifts up and outward, veil lifts (snappier)
		const outPromises = puffs.map((puff, i) => {
			const drift = (Math.random() - 0.5) * W * 0.4;
			void this.tweens.to(puff.scale, { x: puff.scale.x * 1.5, y: puff.scale.y * 1.5 }, {
				duration: 520 + i * 7,
				ease: easings.quadOut,
			});
			void this.tweens.to(puff, { y: puff.y - H * (0.1 + Math.random() * 0.15) }, {
				duration: 560 + i * 7,
				ease: easings.quadOut,
			});
			return this.tweens.to(puff, { alpha: 0, x: puff.x + drift }, {
				duration: 480 + i * 7,
				ease: easings.quadOut,
			});
		});
		void this.tweens.to(veil, { alpha: 0 }, { duration: 420, ease: easings.quadOut });
		await Promise.all(outPromises);

		this.teardownScene();
		this.playing = false;
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
		this.teardownScene();
		this.tweens.destroy();
		this.particles.destroy();
		this.playing = false;
	}
}
