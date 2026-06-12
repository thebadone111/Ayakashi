/**
 * Ayakashi — particle texture registry.
 *
 * The FX modules emit particles through ParticlePool, which renders a soft
 * glow dot unless an explicit texture is passed. This registry is where the
 * generated alpha sprites (ink splatter, sakura petal, paper shred, ember
 * flake, smoke wisp) get plugged in: fxManager registers them once the asset
 * loader has them, and every module asks at emit time.
 *
 * getParticleTexture() returning undefined is FINE — ParticlePool falls back
 * to the glow dot, so the game renders correctly before the textures load
 * (they're background-loaded, not preloaded) and even if an asset is missing.
 *
 * All sprites are white-on-transparent; ParticlePool's `tints` colour them
 * per effect, so one petal serves pink sakura and golden confetti alike.
 */

import { Texture } from 'pixi.js';

export type ParticleName = 'ink' | 'petal' | 'paper' | 'ember' | 'smoke';

const registry = new Map<ParticleName, Texture>();

export const setParticleTexture = (name: ParticleName, texture: Texture | undefined) => {
	if (texture) registry.set(name, texture);
};

export const getParticleTexture = (name: ParticleName): Texture | undefined =>
	registry.get(name);
