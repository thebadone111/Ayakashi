/**
 * Ayakashi — loading spinner (replaces the `loader` Spine on LoadingScreen).
 *
 * Three foxfire orbs orbiting a slow-breathing central spirit flame, each
 * leaving a faint trail. Pairs with the existing progressBar sprites.
 *
 * Wiring (Tom) — LoadingScreen.svelte:
 *
 *   const loader = new LoaderOrbs({ app, parent: loadingLayer, x: cx, y: cy });
 *   loader.setProgress(p);  // optional, 0..1 — orbs orbit faster as p rises
 *   loader.destroy();       // when loading completes
 */

import { Application, Container, Sprite, Ticker } from 'pixi.js';

import { PALETTE, makeGlowTexture } from './fx';

export interface LoaderOrbsOptions {
	app: Application;
	parent: Container;
	x: number;
	y: number;
	radius?: number;
}

export class LoaderOrbs {
	private app: Application;
	private root: Container;
	private orbs: Sprite[] = [];
	private core: Sprite;
	private radius: number;
	private elapsed = 0;
	private progress = 0;
	private tick = (ticker: Ticker) => this.update(ticker.deltaMS);

	constructor(opts: LoaderOrbsOptions) {
		this.app = opts.app;
		this.radius = opts.radius ?? 46;
		this.root = new Container();
		this.root.position.set(opts.x, opts.y);
		opts.parent.addChild(this.root);

		this.core = new Sprite(makeGlowTexture(this.app.renderer, 40, PALETTE.SPIRIT));
		this.core.anchor.set(0.5);
		this.core.blendMode = 'add';
		this.root.addChild(this.core);

		const colors = [PALETTE.FOXFIRE, PALETTE.GOLD, PALETTE.SPIRIT];
		for (let i = 0; i < 3; i++) {
			const orb = new Sprite(makeGlowTexture(this.app.renderer, 16, colors[i]));
			orb.anchor.set(0.5);
			orb.blendMode = 'add';
			this.root.addChild(orb);
			this.orbs.push(orb);
		}
		this.app.ticker.add(this.tick);
	}

	/** Optional 0..1 — orbit speed and core brightness rise with progress. */
	setProgress(p: number) {
		this.progress = Math.max(0, Math.min(1, p));
	}

	private update(deltaMS: number) {
		this.elapsed += deltaMS;
		const t = this.elapsed / 1000;
		const speed = 1.6 + this.progress * 2.4; // rad/sec
		for (let i = 0; i < this.orbs.length; i++) {
			const a = t * speed + (i / this.orbs.length) * Math.PI * 2;
			const wobble = 1 + Math.sin(t * 3 + i) * 0.08;
			this.orbs[i].position.set(
				Math.cos(a) * this.radius * wobble,
				Math.sin(a) * this.radius * wobble * 0.55, // elliptical orbit
			);
			this.orbs[i].alpha = 0.7 + Math.sin(t * 5 + i * 2) * 0.3;
		}
		const breath = 1 + Math.sin(t * 2.2) * 0.12;
		this.core.scale.set(breath);
		this.core.alpha = 0.6 + this.progress * 0.4;
	}

	destroy() {
		this.app.ticker.remove(this.tick);
		this.root.destroy({ children: true });
		this.orbs = [];
	}
}
