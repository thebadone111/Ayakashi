/**
 * Ayakashi — per-symbol win animation overlays.
 *
 * Plays a sprite-sheet animation on top of a winning symbol cell.
 * Each animation is a one-shot AnimatedSprite drawn on the boardFxLayer
 * with additive blending (works for dark-background MP4-sourced sheets).
 *
 * To add a new symbol: drop its .webp + .json into
 *   apps/lines/static/assets/sprites/symbolWin/
 * register it in assets.ts as type:'spriteSheet', then add its key to
 * SYMBOL_ANIM_KEY below.
 */

import { AnimatedSprite } from 'pixi.js';
import type { Container, Texture } from 'pixi.js';

/** Maps symbol names to the loadedAssets key for their sprite sheet. */
const SYMBOL_ANIM_KEY: Partial<Record<string, string>> = {
	H1: 'winAnimH1',
	H2: 'winAnimH2',
	H3: 'winAnimH3',
};

/** Target playback duration in seconds — speed is auto-calculated from frame count. */
const TARGET_DURATION_S = 1.5;

export interface SymbolWinAnimationsOptions {
	effectsLayer: Container;
	getFrames: (key: string) => Texture[] | undefined;
}

export class SymbolWinAnimations {
	private effectsLayer: Container;
	private getFrames: (key: string) => Texture[] | undefined;
	private live = new Set<AnimatedSprite>();

	constructor(opts: SymbolWinAnimationsOptions) {
		this.effectsLayer = opts.effectsLayer;
		this.getFrames = opts.getFrames;
	}

	/** Fire-and-forget: starts the overlay animation, does not block callers. */
	play(opts: { symbolName: string; x: number; y: number }): void {
		const key = SYMBOL_ANIM_KEY[opts.symbolName];
		if (!key) return;

		const frames = this.getFrames(key);
		if (!frames?.length) return;

		const anim = new AnimatedSprite(frames);
		anim.anchor.set(0.5);
		anim.position.set(opts.x, opts.y);
		anim.loop = false;
		anim.blendMode = 'add';
		// Drive playback speed so the full animation finishes in TARGET_DURATION_S
		// regardless of how many frames the sprite sheet contains.
		anim.animationSpeed = frames.length / (60 * TARGET_DURATION_S);

		this.effectsLayer.addChild(anim);
		this.live.add(anim);

		anim.onComplete = () => {
			this.live.delete(anim);
			if (!anim.destroyed) anim.destroy();
		};
		anim.play();
	}

	destroy() {
		for (const anim of [...this.live]) {
			if (!anim.destroyed) anim.destroy();
		}
		this.live.clear();
	}
}
