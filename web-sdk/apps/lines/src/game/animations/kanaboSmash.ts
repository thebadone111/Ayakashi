/**
 * Ayakashi — Oni Kanabo 3x3 smash (the X "exploder" symbol).
 *
 * Math: when any win occurs, every X on the board destroys the 3x3 area
 * centred on itself (symbols arrive with `explode: true` in the book).
 *
 * Choreography:
 *   1. WIND-UP   — the club rises out of its cell, growing past cell size,
 *                  blood-red aura igniting, brief hover.
 *   2. SPIN      — 2.5 accelerating full rotations, ember trail spinning off
 *                  the club head.
 *   3. SLAM      — club crashes down on the 3x3 centre: white impact flash,
 *                  heavy screen shake, shockwave ring sized to the 3x3 area,
 *                  radial crack lines, ink-shard + ember debris.
 *   4. RIPPLE    — the 8 surrounding cells each take a staggered mini-burst
 *                  radiating outward (sells the area destruction; actual
 *                  symbol removal is TumbleExplosion / the tumble handler).
 *   5. FADE      — club dissolves into rising spirit wisps.
 *
 * Uses the x2.png art (pass `clubTexture`); falls back to a procedural club
 * silhouette so the module works before assets are wired.
 *
 * Wiring (Tom) — in the tumbleBoard/winInfo handler, before exploding
 * symbols, for each X with `explode` neighbours:
 *
 *   const kanabo = new KanaboSmash({ app, effectsLayer, boardOrigin, symbolSize, shakeTarget, clubTexture });
 *   await kanabo.playAt({ center: {reel, row}, affected: positionsIn3x3 });
 *   kanabo.destroy(); // board teardown (instance is reusable across spins)
 */

import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';

import { getParticleTexture } from './particleLib';

import {
	PALETTE,
	TweenRunner,
	ParticlePool,
	ScreenShaker,
	makeGlowTexture,
	speedLineBurst,
	easings,
	delay,
	fxBus,
	hitStop,
} from './fx';

export interface KanaboSmashOptions {
	app: Application;
	effectsLayer: Container;
	boardOrigin: { x: number; y: number };
	shakeTarget: Container;
	symbolSize?: number;
	/** x2.png — the Oni Kanabo art. Optional; procedural fallback drawn if omitted. */
	clubTexture?: Texture;
}

export class KanaboSmash {
	private app: Application;
	private effectsLayer: Container;
	private tweens: TweenRunner;
	private particles: ParticlePool;
	private shaker: ScreenShaker;
	private origin: { x: number; y: number };
	private symbolSize: number;
	private clubTexture: Texture | null;
	private liveNodes = new Set<Container>();

	constructor(opts: KanaboSmashOptions) {
		this.app = opts.app;
		this.effectsLayer = opts.effectsLayer;
		this.origin = opts.boardOrigin;
		this.symbolSize = opts.symbolSize ?? 120;
		this.clubTexture = opts.clubTexture ?? null;
		this.tweens = new TweenRunner(opts.app.ticker);
		this.particles = new ParticlePool(opts.app.ticker, opts.app.renderer, 250);
		this.shaker = new ScreenShaker(opts.shakeTarget, opts.app.ticker);
		this.effectsLayer.addChild(this.particles.container);
	}

	private cellCenter(pos: { reel: number; row: number }) {
		return {
			x: this.origin.x + (pos.reel + 0.5) * this.symbolSize,
			y: this.origin.y + (pos.row + 0.5) * this.symbolSize,
		};
	}

	async playAt(opts: {
		center: { reel: number; row: number };
		/** All affected cells (the 3x3, clipped to board edges). */
		affected: { reel: number; row: number }[];
	}): Promise<void> {
		const c = this.cellCenter(opts.center);
		const s = this.symbolSize;

		const node = new Container();
		this.effectsLayer.addChild(node);
		this.liveNodes.add(node);

		// --- club + aura -------------------------------------------------------
		const club = this.buildClub();
		club.position.set(c.x, c.y);
		club.scale.set(0.4);
		node.addChild(club);

		const aura = new Sprite(makeGlowTexture(this.app.renderer, Math.round(s * 0.9), PALETTE.BLOOD));
		aura.anchor.set(0.5);
		aura.blendMode = 'add';
		aura.alpha = 0;
		aura.position.set(c.x, c.y);
		node.addChildAt(aura, 0);

		// 1) WIND-UP — the club rises high above the board and grows way past
		// cell size (this is the hero moment — make it unmissable)
		void this.tweens.to(aura, { alpha: 0.9 }, { duration: 300 });
		void this.tweens.to(aura.scale, { x: 2.4, y: 2.4 }, { duration: 500, ease: easings.backOut });
		void this.tweens.to(club.scale, { x: 1.1, y: 1.1 }, { duration: 380, ease: easings.quadOut });
		await this.tweens.to(club, { y: c.y - s * 1.6 }, { duration: 420, ease: easings.cubicOut });
		await this.tweens.to(club.scale, { x: 2.1, y: 2.1 }, { duration: 260, ease: easings.backOut });

		// 2) SPIN — three full accelerating rotations with a heavy ember trail
		const spinState = { rot: 0 };
		const trail = setInterval(() => {
			// embers fly off tangentially from the club head
			const headAngle = spinState.rot - Math.PI / 2;
			const headR = s * 1.1; // matches the enlarged club
			this.particles.emit({
				x: club.x + Math.cos(headAngle) * headR,
				y: club.y + Math.sin(headAngle) * headR,
				count: 3,
				texture: getParticleTexture('ember'),
				speed: [140, 340],
				angle: [headAngle + Math.PI / 2 - 0.3, headAngle + Math.PI / 2 + 0.3],
				gravity: 300,
				life: [350, 750],
				scaleStart: [0.25, 0.5],
				tints: [PALETTE.EMBER, PALETTE.BLOOD, PALETTE.EMBER_HI],
				rotationSpeed: [-4, 4],
			});
		}, 30);
		await this.tweens.to(spinState, { rot: Math.PI * 2 * 3 }, {
			duration: 800,
			ease: easings.quadIn, // accelerating
			onUpdate: () => {
				club.rotation = spinState.rot;
			},
		});
		clearInterval(trail);

		// apex hold — one beat of silence before the strike (timing contrast)
		await delay(120);

		// 3) SLAM — crash down onto the 3x3 centre, still huge
		await this.tweens.to(club, { y: c.y }, { duration: 90, ease: easings.quadIn });
		void this.tweens.to(club.scale, { x: 1.6, y: 1.6 }, { duration: 130, ease: easings.quadOut });
		this.impact(node, c.x, c.y, opts.affected.length);

		// 4) RIPPLE — staggered mini-bursts radiating outward from the centre
		const ringCells = opts.affected
			.filter((p) => !(p.reel === opts.center.reel && p.row === opts.center.row))
			.map((p) => ({ p, d: Math.hypot(p.reel - opts.center.reel, p.row - opts.center.row) }))
			.sort((a, b) => a.d - b.d);
		for (let i = 0; i < ringCells.length; i++) {
			const pc = this.cellCenter(ringCells[i].p);
			void delay(60 * i).then(() => {
				this.particles.emit({
					x: pc.x, y: pc.y,
					count: 6,
					texture: getParticleTexture('ink'),
					speed: [80, 240],
					life: [300, 700],
					scaleStart: [0.15, 0.32],
					tints: [PALETTE.EMBER, PALETTE.BLOOD, 0x3a3a4a],
					rotationSpeed: [-5, 5],
				});
			});
		}

		// 5) FADE — club dissolves into rising wisps
		void this.tweens.to(aura, { alpha: 0 }, { duration: 450 });
		void this.tweens.to(club, { alpha: 0, y: c.y - s * 0.3 }, { duration: 500, ease: easings.quadOut });
		this.particles.emit({
			x: c.x, y: c.y,
			count: 10,
			texture: getParticleTexture('smoke'),
			speed: [30, 110],
			gravity: -160,
			drag: 0.5,
			life: [800, 1500],
			scaleStart: [0.3, 0.6],
			scaleEnd: 1.0,
			tints: [PALETTE.BLOOD, PALETTE.SPIRIT, PALETTE.FOXFIRE],
			rotationSpeed: [-1, 1],
		});

		await delay(550);
		this.disposeNode(node);
	}

	/** Impact frame: white flash + speed lines + shake + shockwave + debris. */
	private impact(node: Container, x: number, y: number, cellCount: number) {
		// global (canvas-px) impact point so PostFx can centre the screen ripple
		const g = node.toGlobal({ x, y });
		fxBus.emit('smash', { x: g.x, y: g.y });
		// hit-stop one frame AFTER the contact visuals spawn, so the flash is
		// on screen when time freezes — the classic anime contact frame
		setTimeout(() => hitStop(this.app.ticker, 85, 0.04), 16);
		const s = this.symbolSize;
		const areaRadius = s * 1.5; // 3x3 extent

		// impact frame — radial strike lines (the "anime hit" read)
		speedLineBurst(node, this.tweens, {
			x, y,
			count: 16,
			innerRadius: s * 0.8,
			length: s * 2.2,
			duration: 280,
		});

		// white impact flash at the cell
		const flashGlow = new Sprite(makeGlowTexture(this.app.renderer, Math.round(s), 0xffffff));
		flashGlow.anchor.set(0.5);
		flashGlow.position.set(x, y);
		flashGlow.blendMode = 'add';
		flashGlow.scale.set(0.5);
		node.addChild(flashGlow);
		void this.tweens.to(flashGlow.scale, { x: 2.6, y: 2.6 }, { duration: 280, ease: easings.cubicOut });
		void this.tweens.to(flashGlow, { alpha: 0 }, { duration: 320 });

		// heavy shake — scales a little with how many cells were hit
		void this.shaker.shake({ intensity: 24 + cellCount * 1.5, duration: 550 });

		// shockwave ring expanding to the 3x3 boundary and beyond
		const ring = new Graphics().circle(0, 0, areaRadius).stroke({ color: PALETTE.BLOOD, width: 12, alpha: 1 });
		ring.position.set(x, y);
		ring.blendMode = 'add';
		const rs = { scale: 0.2, alpha: 1 };
		ring.scale.set(rs.scale);
		node.addChild(ring);
		void this.tweens.to(rs, { scale: 1.6, alpha: 0 }, {
			duration: 600,
			ease: easings.cubicOut,
			onUpdate: () => {
				ring.scale.set(rs.scale);
				ring.alpha = rs.alpha;
			},
		});

		// radial crack lines — jagged spokes, fade out
		const cracks = new Graphics();
		const spokes = 7;
		for (let i = 0; i < spokes; i++) {
			const a = (i / spokes) * Math.PI * 2 + Math.random() * 0.5;
			let px = x, py = y;
			cracks.moveTo(px, py);
			const segments = 3;
			for (let seg = 1; seg <= segments; seg++) {
				const r = (areaRadius * seg) / segments;
				const jitter = (Math.random() - 0.5) * 0.45;
				px = x + Math.cos(a + jitter) * r;
				py = y + Math.sin(a + jitter) * r;
				cracks.lineTo(px, py);
			}
			cracks.stroke({ color: 0x1a1622, width: 4 - i * 0.2, alpha: 0.9, cap: 'round' });
		}
		node.addChild(cracks);
		void this.tweens.to(cracks, { alpha: 0 }, { duration: 900, ease: easings.quadIn });

		// debris — heavy ink shards down, sparks out
		this.particles.emit({
			x, y,
			count: 26,
			speed: [200, 620],
			angle: [-Math.PI, 0],
			gravity: 1500,
			life: [500, 1100],
			scaleStart: [0.4, 0.9],
			scaleEnd: 0.1,
			tints: [0x2a2a38, 0x3a3a4a, PALETTE.BLOOD],
			blendMode: 'normal',
			rotationSpeed: [-8, 8],
		});
		this.particles.emit({
			x, y,
			count: 20,
			speed: [250, 700],
			life: [250, 600],
			scaleStart: [0.3, 0.6],
			tints: [PALETTE.EMBER_HI, PALETTE.GOLD, 0xffffff],
		});
	}

	/** Club sprite from x2.png, or a procedural kanabo silhouette fallback. */
	private buildClub(): Container {
		const club = new Container();
		const s = this.symbolSize;
		if (this.clubTexture) {
			const sprite = new Sprite(this.clubTexture);
			sprite.anchor.set(0.5);
			// base fit is 2 cells tall — wind-up scales it past 4 cells
			const fit = (s * 2.0) / Math.max(sprite.texture.width, sprite.texture.height);
			sprite.scale.set(fit);
			club.addChild(sprite);
			return club;
		}
		// fallback: dark studded club, blood-red rim
		const g = new Graphics();
		const shaftW = s * 0.14;
		const len = s * 1.05;
		g.roundRect(-shaftW / 2, -len / 2, shaftW, len, shaftW / 2).fill({ color: 0x1c1824 });
		// flared head
		g.poly([
			-shaftW * 1.4, -len / 2,
			shaftW * 1.4, -len / 2,
			shaftW * 1.1, -len * 0.12,
			-shaftW * 1.1, -len * 0.12,
		]).fill({ color: 0x241e30 });
		// studs
		for (let r = 0; r < 3; r++) {
			for (const sx of [-shaftW * 0.9, 0, shaftW * 0.9]) {
				g.circle(sx, -len / 2 + s * 0.09 + r * s * 0.115, s * 0.025).fill({ color: PALETTE.BLOOD });
			}
		}
		g.rect(-shaftW * 1.4, -len / 2, shaftW * 2.8, 3).fill({ color: PALETTE.BLOOD, alpha: 0.9 });
		club.addChild(g);
		return club;
	}

	private disposeNode(node: Container) {
		if (!this.liveNodes.has(node)) return;
		this.liveNodes.delete(node);
		if (!node.destroyed) node.destroy({ children: true });
	}

	destroy() {
		this.tweens.destroy();
		for (const node of [...this.liveNodes]) this.disposeNode(node);
		this.effectsLayer.removeChild(this.particles.container);
		this.particles.destroy();
		this.shaker.destroy();
	}
}
