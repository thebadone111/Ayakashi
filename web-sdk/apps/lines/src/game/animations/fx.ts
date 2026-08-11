/**
 * Ayakashi — shared FX toolkit for all animation modules.
 *
 * Pure PixiJS (v8). No Spine, no external tween libs.
 * Every class here owns its ticker callbacks and releases them in destroy().
 *
 * Theme palette (yokai / ink / foxfire):
 *   INK        0x0a0a12  — near-black backdrop
 *   FOXFIRE    0x7df9ff  — spectral cyan flame
 *   SPIRIT     0x9d4edd  — yokai purple
 *   EMBER      0xff6b1a  — fire orange
 *   EMBER_HI   0xffb347  — hot ember highlight
 *   GOLD       0xffd700  — win gold
 *   BLOOD      0xc41e3a  — oni red
 */

import {
	Container,
	Graphics,
	Sprite,
	Texture,
	Ticker,
	type Renderer,
} from 'pixi.js';

export const PALETTE = {
	INK: 0x0a0a12,
	FOXFIRE: 0x7df9ff,
	SPIRIT: 0x9d4edd,
	EMBER: 0xff6b1a,
	EMBER_HI: 0xffb347,
	GOLD: 0xffd700,
	BLOOD: 0xc41e3a,
	WHITE: 0xffffff,
} as const;

// ---------------------------------------------------------------------------
// Easings
// ---------------------------------------------------------------------------

export type EaseFn = (t: number) => number;

export const easings = {
	linear: (t: number) => t,
	quadIn: (t: number) => t * t,
	quadOut: (t: number) => t * (2 - t),
	cubicOut: (t: number) => 1 - Math.pow(1 - t, 3),
	cubicInOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
	backOut: (t: number) => {
		const c1 = 1.70158;
		const c3 = c1 + 1;
		return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
	},
	elasticOut: (t: number) => {
		if (t === 0 || t === 1) return t;
		const c4 = (2 * Math.PI) / 3;
		return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
	},
	sineInOut: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
} satisfies Record<string, EaseFn>;

export const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Hit-stop: freeze game time for a beat on a heavy impact (the anime "contact
 * frame"). Drops ticker.speed to near-zero and restores it on a wall-clock
 * timeout (setTimeout is unaffected by ticker speed). Re-entrant calls during
 * an active stop are ignored — overlapping impacts shouldn't stack freezes.
 */
let hitStopActive = false;
export const hitStop = (ticker: Ticker, durationMs = 80, speed = 0.04) => {
	if (hitStopActive) return;
	hitStopActive = true;
	const original = ticker.speed;
	ticker.speed = speed;
	setTimeout(() => {
		ticker.speed = original;
		hitStopActive = false;
	}, durationMs);
};

// ---------------------------------------------------------------------------
// fxBus — tiny pub/sub so passive actors (avatar) can react to game FX
// without coupling modules to each other. Modules emit, listeners subscribe.
// ---------------------------------------------------------------------------

export type FxEvent =
	| 'bigwin' // data: { level: 'big'|'superwin'|'mega'|'epic'|'max' }
	| 'bigwinEnd' // celebration torn down (natural end AND skip) — release camera etc.
	| 'bonus'
	| 'smash'
	| 'wildland'
	| 'tumble'
	| 'fsintro'
	| 'reelstop';

type FxHandler = (data?: unknown) => void;

class FxBus {
	private handlers = new Map<FxEvent, Set<FxHandler>>();

	on(event: FxEvent, handler: FxHandler) {
		let set = this.handlers.get(event);
		if (!set) {
			set = new Set();
			this.handlers.set(event, set);
		}
		set.add(handler);
	}

	off(event: FxEvent, handler: FxHandler) {
		this.handlers.get(event)?.delete(handler);
	}

	emit(event: FxEvent, data?: unknown) {
		const set = this.handlers.get(event);
		if (!set) return;
		for (const handler of [...set]) handler(data);
	}
}

export const fxBus = new FxBus();

// ---------------------------------------------------------------------------
// TweenRunner — minimal promise-based tween manager bound to a Ticker.
// ---------------------------------------------------------------------------

type TweenTarget = Record<string, unknown>;

interface ActiveTween {
	target: TweenTarget;
	from: Record<string, number>;
	to: Record<string, number>;
	elapsed: number;
	duration: number;
	ease: EaseFn;
	repeat: number; // -1 = infinite
	yoyo: boolean;
	reversed: boolean;
	onUpdate?: (t: number) => void;
	resolve: () => void;
	killed: boolean;
}

export interface TweenOptions {
	duration: number; // ms
	ease?: EaseFn;
	repeat?: number;
	yoyo?: boolean;
	onUpdate?: (t: number) => void;
}

export class TweenRunner {
	private tweens: ActiveTween[] = [];
	private ticker: Ticker;
	private tick = (ticker: Ticker) => this.update(ticker.deltaMS);

	constructor(ticker: Ticker) {
		this.ticker = ticker;
		this.ticker.add(this.tick);
	}

	/** Tween numeric properties on any object. Resolves when complete (or killed). */
	to(target: TweenTarget | null | undefined, props: Record<string, number>, opts: TweenOptions): Promise<void> {
		// Destroyed Pixi objects null their transform observables (sprite.scale
		// becomes null), so chained tweens racing a teardown can receive null.
		// Treat it as already-finished rather than crashing the FX pipeline.
		if (target == null) return Promise.resolve();
		return new Promise<void>((resolve) => {
			const from: Record<string, number> = {};
			for (const key of Object.keys(props)) from[key] = Number(target[key] ?? 0);
			this.tweens.push({
				target,
				from,
				to: { ...props },
				elapsed: 0,
				duration: Math.max(1, opts.duration),
				ease: opts.ease ?? easings.quadOut,
				repeat: opts.repeat ?? 0,
				yoyo: opts.yoyo ?? false,
				reversed: false,
				onUpdate: opts.onUpdate,
				resolve,
				killed: false,
			});
		});
	}

	private update(deltaMS: number) {
		if (this.tweens.length === 0) return;
		const finished: ActiveTween[] = [];
		for (const tw of this.tweens) {
			if (tw.killed) {
				finished.push(tw);
				continue;
			}
			// drop tweens whose display-object target was destroyed externally
			if ((tw.target as { destroyed?: boolean }).destroyed === true) {
				tw.killed = true;
				finished.push(tw);
				continue;
			}
			// A throwing tween must NEVER abort the frame: this ticker callback is
			// one of many in a shared linked list, so an uncaught throw here stops
			// every FX listener registered after us — that froze the game when a
			// stale onUpdate touched a destroyed Graphics. Isolate the failure:
			// kill the offending tween, resolve its promise, keep the rest going.
			try {
				tw.elapsed += deltaMS;
				const t = Math.min(1, tw.elapsed / tw.duration);
				const eased = tw.ease(tw.reversed ? 1 - t : t);
				for (const key of Object.keys(tw.to)) {
					(tw.target as Record<string, number>)[key] =
						tw.from[key] + (tw.to[key] - tw.from[key]) * eased;
				}
				tw.onUpdate?.(eased);
				if (t >= 1) {
					if (tw.repeat !== 0) {
						if (tw.repeat > 0) tw.repeat -= 1;
						tw.elapsed = 0;
						if (tw.yoyo) tw.reversed = !tw.reversed;
					} else {
						finished.push(tw);
					}
				}
			} catch (error) {
				console.warn('[TweenRunner] tween update failed, dropping it', error);
				tw.killed = true;
				finished.push(tw);
			}
		}
		for (const tw of finished) {
			const i = this.tweens.indexOf(tw);
			if (i !== -1) this.tweens.splice(i, 1);
			tw.resolve();
		}
	}

	/** Kill all running tweens (resolves their promises). */
	killAll() {
		for (const tw of this.tweens) tw.killed = true;
	}

	destroy() {
		this.killAll();
		this.update(0);
		this.ticker.remove(this.tick);
		this.tweens = [];
	}
}

// ---------------------------------------------------------------------------
// Procedural textures — radial glow, light ray, soft particle.
// Cached per renderer so repeated module construction is cheap.
// ---------------------------------------------------------------------------

const textureCache = new WeakMap<Renderer, Map<string, Texture>>();

function getCache(renderer: Renderer): Map<string, Texture> {
	let cache = textureCache.get(renderer);
	if (!cache) {
		cache = new Map();
		textureCache.set(renderer, cache);
	}
	return cache;
}

/** Soft radial glow texture (layered circles approximate a radial gradient). */
export function makeGlowTexture(renderer: Renderer, radius = 64, color = PALETTE.WHITE): Texture {
	const key = `glow_${radius}_${color}`;
	const cache = getCache(renderer);
	const hit = cache.get(key);
	if (hit) return hit;

	const g = new Graphics();
	const layers = 12;
	for (let i = layers; i >= 1; i--) {
		const r = (radius * i) / layers;
		const alpha = Math.pow(1 - i / layers, 2) * 0.55 + (i === 1 ? 0.45 : 0);
		g.circle(radius, radius, r).fill({ color, alpha });
	}
	const texture = renderer.generateTexture(g);
	g.destroy();
	cache.set(key, texture);
	return texture;
}

/** Tapered light-ray texture pointing right; rotate the sprite to aim it. */
export function makeRayTexture(renderer: Renderer, length = 600, width = 90, color = PALETTE.GOLD): Texture {
	const key = `ray_${length}_${width}_${color}`;
	const cache = getCache(renderer);
	const hit = cache.get(key);
	if (hit) return hit;

	const g = new Graphics();
	const steps = 6;
	for (let i = steps; i >= 1; i--) {
		const w = (width * i) / steps;
		const alpha = 0.10 + (1 - i / steps) * 0.22;
		g.poly([0, -w / 8, length, -w / 2, length, w / 2, 0, w / 8]).fill({ color, alpha });
	}
	const texture = renderer.generateTexture(g);
	g.destroy();
	cache.set(key, texture);
	return texture;
}

/** Small soft dot — default particle texture. */
export function makeParticleTexture(renderer: Renderer, radius = 12, color = PALETTE.WHITE): Texture {
	return makeGlowTexture(renderer, radius, color);
}

// ---------------------------------------------------------------------------
// Screen shake
// ---------------------------------------------------------------------------

export interface ShakeOptions {
	intensity?: number; // px at start
	duration?: number; // ms
	frequency?: number; // direction changes per second
}

/**
 * Shake a container (board, whole stage, camera group). Restores the original
 * position when done. Safe to call repeatedly — a new call replaces the last.
 */
export class ScreenShaker {
	private ticker: Ticker;
	private target: Container;
	private origin = { x: 0, y: 0 };
	private active = false;
	private elapsed = 0;
	private opts: Required<ShakeOptions> = { intensity: 12, duration: 500, frequency: 30 };
	private resolve: (() => void) | null = null;
	private tick = (ticker: Ticker) => this.update(ticker.deltaMS);

	constructor(target: Container, ticker: Ticker) {
		this.target = target;
		this.ticker = ticker;
		this.ticker.add(this.tick);
	}

	shake(opts: ShakeOptions = {}): Promise<void> {
		if (this.target.destroyed || !this.target.position) return Promise.resolve();
		if (this.active) this.finish(); // replace running shake
		this.opts = { intensity: 12, duration: 500, frequency: 30, ...opts };
		this.origin = { x: this.target.position.x, y: this.target.position.y };
		this.elapsed = 0;
		this.active = true;
		return new Promise<void>((r) => (this.resolve = r));
	}

	private update(deltaMS: number) {
		if (!this.active) return;
		// destroyed containers null their position observable — stop shaking
		if (this.target.destroyed || !this.target.position) {
			this.finish();
			return;
		}
		this.elapsed += deltaMS;
		const t = this.elapsed / this.opts.duration;
		if (t >= 1) {
			this.finish();
			return;
		}
		const falloff = Math.pow(1 - t, 2);
		const amp = this.opts.intensity * falloff;
		const angle = Math.random() * Math.PI * 2;
		this.target.position.set(
			this.origin.x + Math.cos(angle) * amp,
			this.origin.y + Math.sin(angle) * amp,
		);
	}

	private finish() {
		this.active = false;
		if (!this.target.destroyed && this.target.position) {
			this.target.position.set(this.origin.x, this.origin.y);
		}
		this.resolve?.();
		this.resolve = null;
	}

	destroy() {
		if (this.active) this.finish();
		this.ticker.remove(this.tick);
	}
}

// ---------------------------------------------------------------------------
// ParticlePool — pooled sprite particle system. One pool per effect layer.
// ---------------------------------------------------------------------------

interface Particle {
	sprite: Sprite;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	scaleStart: number;
	scaleEnd: number;
	alphaStart: number;
	alphaEnd: number;
	rotationSpeed: number;
	gravity: number;
	drag: number;
	active: boolean;
	/** Optional flipbook — cycles `frames` at `frameMs` per frame. null = static. */
	frames: Texture[] | null;
	frameMs: number;
	frameTime: number;
	frameIdx: number;
}

export interface EmitConfig {
	x: number;
	y: number;
	count: number;
	texture?: Texture;
	/** Optional flipbook frames. If set, each particle cycles `animFrames` at
	 *  `animFps` (default 24) starting from a random frame for natural variety. */
	animFrames?: Texture[];
	animFps?: number;
	/** [min, max] speed px/sec */
	speed?: [number, number];
	/** [min, max] emission angle in radians (0 = right, -PI/2 = up) */
	angle?: [number, number];
	/** px/sec^2, positive = down */
	gravity?: number;
	/** velocity multiplier per second, 1 = none, 0.5 = halve each second */
	drag?: number;
	/** [min, max] lifetime ms */
	life?: [number, number];
	scaleStart?: [number, number];
	scaleEnd?: number;
	alphaStart?: number;
	alphaEnd?: number;
	/** [min, max] radians/sec */
	rotationSpeed?: [number, number];
	tints?: number[];
	blendMode?: 'normal' | 'add' | 'screen';
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export class ParticlePool {
	readonly container: Container;
	private pool: Particle[] = [];
	private ticker: Ticker;
	private defaultTexture: Texture;
	private capacity: number;
	private tick = (ticker: Ticker) => this.update(ticker.deltaMS);

	constructor(ticker: Ticker, renderer: Renderer, capacity = 200) {
		this.ticker = ticker;
		this.capacity = capacity;
		this.container = new Container();
		this.defaultTexture = makeParticleTexture(renderer);
		this.ticker.add(this.tick);
	}

	get activeCount(): number {
		return this.pool.reduce((n, p) => n + (p.active ? 1 : 0), 0);
	}

	emit(config: EmitConfig) {
		const {
			x, y, count,
			texture = this.defaultTexture,
			animFrames,
			animFps = 24,
			speed = [60, 240],
			angle = [0, Math.PI * 2],
			gravity = 0,
			drag = 1,
			life = [500, 1200],
			scaleStart = [0.5, 1],
			scaleEnd = 0,
			alphaStart = 1,
			alphaEnd = 0,
			rotationSpeed = [-2, 2],
			tints = [PALETTE.WHITE],
			blendMode = 'add',
		} = config;
		const useAnim = animFrames && animFrames.length > 1;
		const frameMs = useAnim ? 1000 / animFps : 0;

		for (let i = 0; i < count; i++) {
			const p = this.obtain();
			if (!p) break; // capacity reached — drop excess, never grow unbounded
			const a = rand(angle[0], angle[1]);
			const s = rand(speed[0], speed[1]);
			if (useAnim) {
				const startIdx = (Math.random() * animFrames!.length) | 0;
				p.frames = animFrames!;
				p.frameMs = frameMs;
				p.frameIdx = startIdx;
				p.frameTime = 0;
				p.sprite.texture = animFrames![startIdx];
			} else {
				p.frames = null;
				p.sprite.texture = texture;
			}
			p.sprite.position.set(x, y);
			p.sprite.tint = tints[(Math.random() * tints.length) | 0];
			p.sprite.blendMode = blendMode;
			p.sprite.rotation = Math.random() * Math.PI * 2;
			p.sprite.visible = true;
			p.vx = Math.cos(a) * s;
			p.vy = Math.sin(a) * s;
			p.maxLife = rand(life[0], life[1]);
			p.life = p.maxLife;
			p.scaleStart = rand(scaleStart[0], scaleStart[1]);
			p.scaleEnd = scaleEnd;
			p.alphaStart = alphaStart;
			p.alphaEnd = alphaEnd;
			p.rotationSpeed = rand(rotationSpeed[0], rotationSpeed[1]);
			p.gravity = gravity;
			p.drag = drag;
			p.active = true;
		}
	}

	private obtain(): Particle | null {
		for (const p of this.pool) if (!p.active) return p;
		if (this.pool.length >= this.capacity) return null;
		const sprite = new Sprite(this.defaultTexture);
		sprite.anchor.set(0.5);
		sprite.visible = false;
		this.container.addChild(sprite);
		const p: Particle = {
			sprite, vx: 0, vy: 0, life: 0, maxLife: 1,
			scaleStart: 1, scaleEnd: 0, alphaStart: 1, alphaEnd: 0,
			rotationSpeed: 0, gravity: 0, drag: 1, active: false,
			frames: null, frameMs: 0, frameTime: 0, frameIdx: 0,
		};
		this.pool.push(p);
		return p;
	}

	private update(deltaMS: number) {
		const dt = deltaMS / 1000;
		for (const p of this.pool) {
			if (!p.active) continue;
			p.life -= deltaMS;
			if (p.life <= 0) {
				p.active = false;
				p.sprite.visible = false;
				continue;
			}
			const t = 1 - p.life / p.maxLife; // 0..1 over lifetime
			p.vy += p.gravity * dt;
			const dragFactor = Math.pow(p.drag, dt);
			p.vx *= dragFactor;
			p.vy *= dragFactor;
			p.sprite.x += p.vx * dt;
			p.sprite.y += p.vy * dt;
			p.sprite.rotation += p.rotationSpeed * dt;
			const scale = p.scaleStart + (p.scaleEnd - p.scaleStart) * t;
			p.sprite.scale.set(scale);
			p.sprite.alpha = p.alphaStart + (p.alphaEnd - p.alphaStart) * t;
			if (p.frames) {
				p.frameTime += deltaMS;
				while (p.frameTime >= p.frameMs) {
					p.frameTime -= p.frameMs;
					p.frameIdx = (p.frameIdx + 1) % p.frames.length;
				}
				p.sprite.texture = p.frames[p.frameIdx];
			}
		}
	}

	/** Hide all active particles immediately. */
	clear() {
		for (const p of this.pool) {
			p.active = false;
			p.sprite.visible = false;
		}
	}

	destroy() {
		this.ticker.remove(this.tick);
		this.container.destroy({ children: true });
		this.pool = [];
	}
}

// ---------------------------------------------------------------------------
// Full-screen flash
// ---------------------------------------------------------------------------

/** One-shot white/colored flash over a region. Adds, plays, removes itself. */
export async function flash(
	parent: Container,
	tweens: TweenRunner,
	opts: { width: number; height: number; color?: number; peakAlpha?: number; duration?: number } ,
): Promise<void> {
	const { width, height, color = PALETTE.WHITE, peakAlpha = 0.85, duration = 350 } = opts;
	const g = new Graphics().rect(0, 0, width, height).fill({ color });
	g.alpha = 0;
	g.blendMode = 'add';
	parent.addChild(g);
	await tweens.to(g, { alpha: peakAlpha }, { duration: duration * 0.25, ease: easings.quadOut });
	await tweens.to(g, { alpha: 0 }, { duration: duration * 0.75, ease: easings.quadOut });
	g.destroy();
}

// ---------------------------------------------------------------------------
// Speed-line burst — radial strike lines that flash and expand (impact accent)
// ---------------------------------------------------------------------------

export function speedLineBurst(
	parent: Container,
	tweens: TweenRunner,
	opts: {
		x: number;
		y: number;
		color?: number;
		count?: number;
		innerRadius?: number;
		length?: number;
		duration?: number;
	},
) {
	const {
		x, y,
		color = PALETTE.WHITE,
		count = 14,
		innerRadius = 50,
		length = 170,
		duration = 300,
	} = opts;

	const g = new Graphics();
	for (let i = 0; i < count; i++) {
		const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
		const r0 = innerRadius * (0.85 + Math.random() * 0.3);
		const r1 = r0 + length * (0.6 + Math.random() * 0.4);
		g.moveTo(Math.cos(angle) * r0, Math.sin(angle) * r0)
			.lineTo(Math.cos(angle) * r1, Math.sin(angle) * r1)
			.stroke({ color, width: 2 + Math.random() * 3, alpha: 0.95, cap: 'round' });
	}
	g.blendMode = 'add';
	g.position.set(x, y);
	g.scale.set(0.55);

	parent.addChild(g);
	const state = { scale: 0.55, alpha: 1 };
	void tweens
		.to(state, { scale: 1.35, alpha: 0 }, {
			duration,
			ease: easings.cubicOut,
			onUpdate: () => {
				g.scale.set(state.scale);
				g.alpha = state.alpha;
			},
		})
		.then(() => {
			if (!g.destroyed) g.destroy();
		});
}

// ---------------------------------------------------------------------------
// Rotating light-ray fan (the classic big-win sunburst, yokai-tinted)
// ---------------------------------------------------------------------------

export class RayBurst {
	readonly container: Container;
	private ticker: Ticker;
	private speed: number;
	private tick = (ticker: Ticker) => {
		this.container.rotation += this.speed * (ticker.deltaMS / 1000);
	};

	constructor(
		ticker: Ticker,
		renderer: Renderer,
		opts: { rayCount?: number; length?: number; width?: number; colors?: number[]; rotationSpeed?: number } = {},
	) {
		const { rayCount = 12, length = 900, width = 110, colors = [PALETTE.GOLD, PALETTE.EMBER], rotationSpeed = 0.25 } = opts;
		this.ticker = ticker;
		this.speed = rotationSpeed;
		this.container = new Container();
		for (let i = 0; i < rayCount; i++) {
			const color = colors[i % colors.length];
			const ray = new Sprite(makeRayTexture(renderer, length, width, color));
			ray.anchor.set(0, 0.5);
			ray.rotation = (i / rayCount) * Math.PI * 2;
			ray.blendMode = 'add';
			this.container.addChild(ray);
		}
		this.container.alpha = 0;
		this.ticker.add(this.tick);
	}

	destroy() {
		this.ticker.remove(this.tick);
		this.container.destroy({ children: true });
	}
}
