/**
 * Ayakashi — Ofuda Talisman charm activation (the M "fsMultiplier" symbol).
 *
 * Math: in free spins, the `fsMultiplier` event assigns a multiplier via the
 * M symbol. This is its on-board activation effect.
 *
 * Choreography (on theme — a sacred sealing charm waking up):
 *   1. LEVITATE — the talisman sprite lifts off its cell and hovers, faint
 *                 spirit-purple aura blooming behind it.
 *   2. SEAL     — two counter-rotating "spirit seal" rings of rune dashes
 *                 materialise around it (the ward circle), foxfire sparks
 *                 crawling the rims.
 *   3. BEAM     — a vertical pillar of light snaps up through the talisman;
 *                 paper-slip particles flutter outward (shide paper).
 *   4. REVEAL   — the multiplier value (e.g. x5) slams in above the charm
 *                 with an elastic pop and a gold flash.
 *   5. RELEASE  — rings collapse inward, beam fades, talisman settles back.
 *
 * Wiring (Tom) — on the `fsMultiplier` book event, for the M position:
 *
 *   const ofuda = new OfudaCharm({ app, effectsLayer, boardOrigin, symbolSize });
 *   await ofuda.playAt({
 *     cell: { reel, row },           // M symbol position from the event
 *     multiplier: bookEvent.multiplier,
 *     symbol: symbolContainer,       // optional — gets the levitate float
 *   });
 *   ofuda.destroy(); // board teardown; instance reusable across spins
 */

import {
	Application,
	Container,
	Graphics,
	Sprite,
	Text,
	TextStyle,
} from 'pixi.js';

import {
	PALETTE,
	TweenRunner,
	ParticlePool,
	makeGlowTexture,
	easings,
	delay,
} from './fx';

export interface OfudaCharmOptions {
	app: Application;
	effectsLayer: Container;
	boardOrigin: { x: number; y: number };
	symbolSize?: number;
	fontFamily?: string;
}

export class OfudaCharm {
	private app: Application;
	private effectsLayer: Container;
	private tweens: TweenRunner;
	private particles: ParticlePool;
	private origin: { x: number; y: number };
	private symbolSize: number;
	private fontFamily: string;
	private liveNodes = new Set<Container>();

	constructor(opts: OfudaCharmOptions) {
		this.app = opts.app;
		this.effectsLayer = opts.effectsLayer;
		this.origin = opts.boardOrigin;
		this.symbolSize = opts.symbolSize ?? 120;
		this.fontFamily = opts.fontFamily ?? 'Arial';
		this.tweens = new TweenRunner(opts.app.ticker);
		this.particles = new ParticlePool(opts.app.ticker, opts.app.renderer, 150);
		this.effectsLayer.addChild(this.particles.container);
	}

	async playAt(opts: {
		cell: { reel: number; row: number };
		multiplier: number;
		/** Optional M symbol container — driven through the levitate float. */
		symbol?: Container;
	}): Promise<void> {
		const s = this.symbolSize;
		const x = this.origin.x + (opts.cell.reel + 0.5) * s;
		const y = this.origin.y + (opts.cell.row + 0.5) * s;

		const node = new Container();
		node.position.set(x, y);
		this.effectsLayer.addChild(node);
		this.liveNodes.add(node);

		// --- 1) LEVITATE -------------------------------------------------------
		const aura = new Sprite(makeGlowTexture(this.app.renderer, Math.round(s * 0.8), PALETTE.SPIRIT));
		aura.anchor.set(0.5);
		aura.blendMode = 'add';
		aura.alpha = 0;
		aura.scale.set(0.5);
		node.addChild(aura);
		void this.tweens.to(aura, { alpha: 0.8 }, { duration: 350 });
		void this.tweens.to(aura.scale, { x: 1.5, y: 1.5 }, { duration: 500, ease: easings.backOut });

		let symbolBaseY = 0;
		if (opts.symbol) {
			symbolBaseY = opts.symbol.y;
			void this.tweens.to(opts.symbol, { y: symbolBaseY - s * 0.12 }, { duration: 450, ease: easings.cubicOut });
		}

		// --- 2) SEAL — counter-rotating rune rings ------------------------------
		const ringOuter = this.buildSealRing(s * 0.62, 14, PALETTE.FOXFIRE);
		const ringInner = this.buildSealRing(s * 0.45, 10, PALETTE.SPIRIT);
		node.addChild(ringOuter, ringInner);
		for (const ring of [ringOuter, ringInner]) {
			ring.alpha = 0;
			ring.scale.set(0.2);
			void this.tweens.to(ring, { alpha: 1 }, { duration: 300 });
			void this.tweens.to(ring.scale, { x: 1, y: 1 }, { duration: 500, ease: easings.backOut });
		}
		// continuous counter-rotation (killed on dispose)
		const spin = { t: 0 };
		void this.tweens.to(spin, { t: 1 }, {
			duration: 60000,
			ease: easings.linear,
			repeat: -1,
			onUpdate: () => {
				ringOuter.rotation += 0.0035;
				ringInner.rotation -= 0.005;
			},
		});

		// rim sparks
		this.particles.emit({
			x, y,
			count: 12,
			speed: [30, 90],
			drag: 0.6,
			life: [600, 1200],
			scaleStart: [0.25, 0.55],
			tints: [PALETTE.FOXFIRE, PALETTE.SPIRIT, 0xb7fdff],
		});
		await delay(450);

		// --- 3) BEAM + paper flutter --------------------------------------------
		const beam = new Graphics();
		const beamH = s * 3.2;
		for (const [w, alpha] of [[s * 0.5, 0.12], [s * 0.28, 0.2], [s * 0.1, 0.5]] as const) {
			beam.rect(-w / 2, -beamH, w, beamH).fill({ color: 0xeafcff, alpha });
		}
		beam.blendMode = 'add';
		beam.scale.y = 0;
		beam.alpha = 0.9;
		node.addChildAt(beam, 0);
		void this.tweens.to(beam.scale, { y: 1 }, { duration: 250, ease: easings.cubicOut });

		// shide paper slips fluttering out — slow, tumbling, normal blend
		this.particles.emit({
			x, y,
			count: 10,
			speed: [60, 170],
			angle: [-Math.PI, 0],
			gravity: 120,
			drag: 0.45,
			life: [900, 1800],
			scaleStart: [0.35, 0.7],
			scaleEnd: 0.25,
			alphaStart: 0.95,
			tints: [0xf5f1e6, 0xe8e0cc, 0xffffff],
			blendMode: 'normal',
			rotationSpeed: [-7, 7],
		});

		// --- 4) REVEAL — multiplier slam ------------------------------------------
		const mult = new Text({
			text: `x${opts.multiplier}`,
			style: new TextStyle({
				fontFamily: this.fontFamily,
				fontSize: Math.round(s * 0.5),
				fontWeight: '900',
				fill: PALETTE.GOLD,
				stroke: { color: PALETTE.INK, width: 7 },
				dropShadow: { color: PALETTE.SPIRIT, blur: 14, distance: 0, alpha: 1 },
				letterSpacing: 2,
			}),
		});
		mult.anchor.set(0.5);
		// float the reveal above the charm, but CLAMP so a top-row multiplier
		// never pokes above the reel frame (it used to escape the window).
		const revealCenterY = Math.max(y - s * 0.85, this.origin.y + s * 0.32);
		const revealOffsetY = revealCenterY - y;
		mult.position.set(0, revealOffsetY);
		mult.scale.set(0);
		node.addChild(mult);
		this.particles.emit({
			x, y: revealCenterY,
			count: 14,
			speed: [80, 260],
			life: [350, 800],
			scaleStart: [0.3, 0.7],
			tints: [PALETTE.GOLD, 0xfff2b0, PALETTE.EMBER_HI],
		});
		await this.tweens.to(mult.scale, { x: 1.25, y: 1.25 }, { duration: 450, ease: easings.elasticOut });
		void this.tweens.to(mult.scale, { x: 1, y: 1 }, { duration: 200 });
		await delay(350);

		// --- 5) RELEASE -----------------------------------------------------------
		void this.tweens.to(beam.scale, { y: 0 }, { duration: 250, ease: easings.quadIn });
		for (const ring of [ringOuter, ringInner]) {
			void this.tweens.to(ring.scale, { x: 0.1, y: 0.1 }, { duration: 350, ease: easings.quadIn });
			void this.tweens.to(ring, { alpha: 0 }, { duration: 350 });
		}
		void this.tweens.to(aura, { alpha: 0 }, { duration: 400 });
		void this.tweens.to(mult, { alpha: 0, y: revealOffsetY - s * 0.2 }, { duration: 400, ease: easings.quadOut });
		if (opts.symbol && !opts.symbol.destroyed) {
			void this.tweens.to(opts.symbol, { y: symbolBaseY }, { duration: 350, ease: easings.backOut });
		}
		await delay(420);
		this.disposeNode(node);
	}

	/** Ring of rune-like dashes (alternating long/short ticks around a circle). */
	private buildSealRing(radius: number, marks: number, color: number): Container {
		const ring = new Container();
		const g = new Graphics();
		g.circle(0, 0, radius).stroke({ color, width: 2, alpha: 0.55 });
		for (let i = 0; i < marks; i++) {
			const a = (i / marks) * Math.PI * 2;
			const long = i % 2 === 0;
			const r0 = radius - (long ? 7 : 4);
			const r1 = radius + (long ? 7 : 4);
			g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0)
				.lineTo(Math.cos(a) * r1, Math.sin(a) * r1)
				.stroke({ color, width: long ? 3 : 2, alpha: 0.95, cap: 'round' });
		}
		g.blendMode = 'add';
		ring.addChild(g);
		return ring;
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
	}
}
