/**
 * Ayakashi — symbol idle animations (looping, subtle).
 *
 * One lightweight manager drives every idle on a single ticker callback —
 * no per-symbol tweens, no allocations per frame. Each registered symbol
 * gets a phase-offset sine "breath" so the board never pulses in unison.
 *
 * Profiles:
 *   standard (H1–H5, L1–L5): ±1.5% scale breath, 3.2 s period.
 *   wild (W — Kitsune Orb):  breath + slow rotation sway + foxfire shimmer
 *                            (alpha ripple on an attached under-glow).
 *   scatter (S — Temple Bell): breath + periodic glint — a brief brightness
 *                            swell every ~4 s (tint lerp toward white).
 *
 * Wiring (Tom) — in ReelSymbol/SymbolWrap for the 'static' state:
 *
 *   const idles = new SymbolIdleManager(app);
 *   idles.register(symbolContainer, 'wild');   // on mount / state -> static
 *   idles.unregister(symbolContainer);         // on spin start / explode / unmount
 *   idles.destroy();                           // board teardown
 *
 * Unregister restores the symbol's original transform exactly.
 */

import { Application, Container, Sprite, Ticker } from 'pixi.js';

import { PALETTE, makeGlowTexture } from './fx';

export type IdleProfile = 'standard' | 'wild' | 'scatter';

interface IdleEntry {
	target: Container;
	profile: IdleProfile;
	phase: number;
	baseScaleX: number;
	baseScaleY: number;
	baseRotation: number;
	glow: Sprite | null;
	elapsed: number;
}

const BREATH_PERIOD_MS = 3200;
const BREATH_AMOUNT = 0.015;
const WILD_SWAY_RAD = 0.035;
const SCATTER_GLINT_PERIOD_MS = 4200;

export class SymbolIdleManager {
	private app: Application;
	private entries = new Map<Container, IdleEntry>();
	private tick = (ticker: Ticker) => this.update(ticker.deltaMS);
	private running = false;

	constructor(app: Application) {
		this.app = app;
	}

	/** Begin idling a symbol. Re-registering replaces the previous profile. */
	register(target: Container, profile: IdleProfile = 'standard') {
		this.unregister(target);

		let glow: Sprite | null = null;
		if (profile === 'wild') {
			// soft foxfire under-glow that shimmers behind the orb
			glow = new Sprite(makeGlowTexture(this.app.renderer, 70, PALETTE.FOXFIRE));
			glow.anchor.set(0.5);
			glow.blendMode = 'add';
			glow.alpha = 0.25;
			glow.scale.set(1.3);
			target.addChildAt(glow, 0);
		}

		this.entries.set(target, {
			target,
			profile,
			phase: Math.random() * Math.PI * 2, // desync the board
			baseScaleX: target.scale.x,
			baseScaleY: target.scale.y,
			baseRotation: target.rotation,
			glow,
			elapsed: Math.random() * SCATTER_GLINT_PERIOD_MS,
		});

		if (!this.running) {
			this.app.ticker.add(this.tick);
			this.running = true;
		}
	}

	/** Stop idling and restore the symbol's original transform. */
	unregister(target: Container) {
		const entry = this.entries.get(target);
		if (!entry) return;
		this.entries.delete(target);
		if (!target.destroyed) {
			target.scale.set(entry.baseScaleX, entry.baseScaleY);
			target.rotation = entry.baseRotation;
		}
		if (entry.glow && !entry.glow.destroyed) entry.glow.destroy();
		if (this.entries.size === 0 && this.running) {
			this.app.ticker.remove(this.tick);
			this.running = false;
		}
	}

	private update(deltaMS: number) {
		for (const entry of this.entries.values()) {
			const { target } = entry;
			if (target.destroyed) {
				// symbol got destroyed externally — drop the entry, free the glow ref
				this.entries.delete(target);
				continue;
			}
			entry.elapsed += deltaMS;

			// breath — shared by all profiles
			const breathT = (entry.elapsed / BREATH_PERIOD_MS) * Math.PI * 2 + entry.phase;
			const breath = 1 + Math.sin(breathT) * BREATH_AMOUNT;
			target.scale.set(entry.baseScaleX * breath, entry.baseScaleY * breath);

			if (entry.profile === 'wild') {
				// slow rotation sway + glow shimmer
				target.rotation = entry.baseRotation + Math.sin(breathT * 0.6) * WILD_SWAY_RAD;
				if (entry.glow && !entry.glow.destroyed) {
					entry.glow.alpha = 0.18 + (Math.sin(breathT * 1.7) * 0.5 + 0.5) * 0.18;
					entry.glow.rotation -= deltaMS * 0.0002;
				}
			} else if (entry.profile === 'scatter') {
				// periodic glint: short brightness swell using tint toward white
				const glintT = (entry.elapsed % SCATTER_GLINT_PERIOD_MS) / SCATTER_GLINT_PERIOD_MS;
				// active only in the first 12% of each period
				const pulse = glintT < 0.12 ? Math.sin((glintT / 0.12) * Math.PI) : 0;
				// brighten by lerping tint channels toward white
				const base = 0xd8d8d8;
				const channel = Math.round(0xd8 + (0xff - 0xd8) * pulse);
				target.tint = pulse > 0 ? (channel << 16) | (channel << 8) | channel : 0xffffff;
				if (pulse > 0) {
					const extra = 1 + pulse * 0.04;
					target.scale.set(entry.baseScaleX * breath * extra, entry.baseScaleY * breath * extra);
				}
				void base;
			}
		}
		if (this.entries.size === 0 && this.running) {
			this.app.ticker.remove(this.tick);
			this.running = false;
		}
	}

	/** Unregister everything and release the ticker. */
	destroy() {
		for (const target of [...this.entries.keys()]) this.unregister(target);
		if (this.running) {
			this.app.ticker.remove(this.tick);
			this.running = false;
		}
	}
}
