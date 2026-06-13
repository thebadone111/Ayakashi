/**
 * Ayakashi — motion engine (GSAP).
 *
 * GSAP is the industry-standard tween/timeline engine: richer eases, true
 * timelines (sequence/stagger/overlap), and far more reliable than the custom
 * TweenRunner for complex choreography. As of 2025 it's fully free incl. all
 * plugins. We adopt it for NEW and REBUILT animations (bell, symbol destroy,
 * transition, win choreography); the existing TweenRunner stays for the simple
 * effects already wired to it — no need to churn what works.
 *
 * GSAP tweens plain JS object properties, so it drives PixiJS display objects
 * directly (gsap.to(sprite, { x, alpha, ... })). It runs on its own RAF ticker,
 * which coexists with Pixi's. One caveat: GSAP does NOT see Pixi's
 * ticker.speed, so hit-stop (which slows the Pixi ticker) won't slow GSAP
 * tweens — keep hit-stop-coupled motion on TweenRunner, everything else on GSAP.
 *
 * Usage:
 *   import { gsap } from './motion';
 *   const tl = gsap.timeline();
 *   tl.to(sprite, { pixi: { scale: 1.2 }, duration: 0.3, ease: 'back.out(2)' });
 *
 * The PixiPlugin lets you tween pixi-specific props (scale, tint, etc.) via the
 * `pixi:{}` wrapper with correct handling. Registered once here.
 */

import { gsap } from 'gsap';
import { PixiPlugin } from 'gsap/PixiPlugin';
import * as PIXI from 'pixi.js';

let registered = false;
export function ensureGsapPixi() {
	if (registered) return;
	registered = true;
	PixiPlugin.registerPIXI(PIXI);
	gsap.registerPlugin(PixiPlugin);
	// sensible defaults for game feel
	gsap.defaults({ ease: 'power2.out' });
}

ensureGsapPixi();

export { gsap };
