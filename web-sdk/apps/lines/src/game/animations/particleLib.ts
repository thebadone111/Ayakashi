/**
 * Ayakashi — particle texture / animation registry.
 *
 * The FX modules emit particles through ParticlePool, which renders a soft
 * glow dot unless an explicit texture or animation is passed. This registry
 * is where the generated alpha sprites (ink splatter, petal flipbook, paper
 * shred, ember flake, smoke wisp, foxfire flame) get plugged in: fxManager
 * registers them once the asset loader has them, and every module asks at
 * emit time.
 *
 * Two flavours of asset:
 *  - **Texture** (single sprite) — registered via setParticleTexture, read
 *    via getParticleTexture. Use for static one-pose particles.
 *  - **Animation** (flipbook) — multiple frames per sheet, multiple sheets
 *    per slot for variety. Registered via setParticleAnim, read via
 *    pickParticleAnim (randomly picks one sheet's frames per call so an
 *    emitted swarm has varied poses). Use for tumbling petals, flickering
 *    foxfire, anything where a static texture would read mechanical.
 *
 * Either getter returning undefined is FINE — callers fall back to the
 * single-texture path, and that path falls back to the procedural glow dot.
 *
 * White-on-transparent sprites only; ParticlePool's `tints` colour them per
 * effect, so one petal sheet serves pink sakura and golden confetti alike.
 */

import { Texture } from 'pixi.js';

import type { EmitConfig } from './fx';

export type ParticleName = 'ink' | 'petal' | 'paper' | 'ember' | 'smoke' | 'foxfire';

const textures = new Map<ParticleName, Texture>();
const anims = new Map<ParticleName, Texture[][]>();

export const setParticleTexture = (name: ParticleName, texture: Texture | undefined) => {
	if (texture) textures.set(name, texture);
};

export const setParticleAnim = (name: ParticleName, sheets: Texture[][] | undefined) => {
	if (sheets && sheets.length) anims.set(name, sheets);
	else anims.delete(name);
};

export const getParticleTexture = (name: ParticleName): Texture | undefined =>
	textures.get(name);

export const pickParticleAnim = (name: ParticleName): Texture[] | undefined => {
	const sheets = anims.get(name);
	if (!sheets || !sheets.length) return undefined;
	return sheets[(Math.random() * sheets.length) | 0];
};

/**
 * Returns the right EmitConfig spread to use for `name`: anim if registered,
 * else single texture, else nothing (caller picks behaviour — usually leaves
 * `texture` unset so ParticlePool uses its glow-dot default).
 *
 * Use at emit sites that previously did `texture: getParticleTexture('petal')`:
 *   this.particles.emit({ ...particleAssetFor('petal'), x, y, count, ... });
 */
export const particleAssetFor = (
	name: ParticleName,
	opts: { animFps?: number } = {},
): Pick<EmitConfig, 'texture' | 'animFrames' | 'animFps'> => {
	const anim = pickParticleAnim(name);
	if (anim) return { animFrames: anim, animFps: opts.animFps ?? 24 };
	const tex = textures.get(name);
	return tex ? { texture: tex } : {};
};
