/**
 * Ayakashi — symbol win flipbooks (Wan 2.2 I2V renders baked by
 * art/bake_win_sheets.py into keyed WebP sheets, described by
 * winSheets.manifest.json — the bake pipeline owns that file).
 *
 * getSymbolWinFrames(name) slices the loaded sheet per the manifest grid
 * (only the first `frames` cells — the last grid row may be padding) into a
 * PING-PONG texture sequence ([0..n-1, n-2..1]) so playback always returns
 * to the resting frame — the renders are one-way "ignition" clips, and the
 * static atlas art matches frame 0. Returns null until the sheet has
 * background-loaded (SymbolSprite falls back to the procedural pop).
 *
 * drawScale rides along per symbol: the baked frames are cropped to each
 * animation's full glow extent, so the subject sits smaller inside its frame
 * than in the tight static atlas crop, by a per-symbol amount.
 *
 * Slices are cached per texture source; sheets are a bounded set and stay
 * resident (texture GC is disabled globally — see fxManager).
 */

import { Rectangle, Texture } from 'pixi.js';

import { stateApp } from './stateApp';
import manifest from './winSheets.manifest.json';

export type SymbolWinFlipbook = { frames: Texture[]; drawScale: number };

const cache = new Map<unknown, SymbolWinFlipbook>();

export const getSymbolWinFrames = (symbolName: string): SymbolWinFlipbook | null => {
	const entry = (manifest.symbols as Record<string, (typeof manifest.symbols)['H1']>)[symbolName];
	if (!entry) return null;
	const sheet = stateApp.loadedAssets?.[entry.key] as Texture | undefined;
	if (!sheet) return null;
	const cached = cache.get(sheet.source);
	if (cached) return cached;
	const fw = sheet.width / entry.cols;
	const fh = sheet.height / entry.rows;
	const frames: Texture[] = [];
	for (let i = 0; i < entry.frames; i++) {
		frames.push(
			new Texture({
				source: sheet.source,
				frame: new Rectangle((i % entry.cols) * fw, Math.floor(i / entry.cols) * fh, fw, fh),
			}),
		);
	}
	const flipbook: SymbolWinFlipbook = {
		frames: [...frames, ...frames.slice(1, -1).reverse()],
		drawScale: entry.drawScale,
	};
	cache.set(sheet.source, flipbook);
	return flipbook;
};
