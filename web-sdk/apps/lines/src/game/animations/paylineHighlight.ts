/**
 * Ayakashi — winning payline highlight.
 *
 * For each win in the `winInfo` book event: a glowing ink-brush stroke is
 * traced left-to-right through the centres of the winning symbol cells, a
 * foxfire comet rides the stroke leaving a wisp trail, winning cells get a
 * soft under-glow pulse, and an optional win-amount tag pops at the line's
 * midpoint. Strokes self-erase when dismissed.
 *
 * Wiring (Tom) — in the `winInfo` handler, alongside boardWithAnimateSymbols:
 *
 *   const lineFx = new PaylineHighlight({ app, effectsLayer, boardOrigin, symbolSize: SYMBOL_SIZE });
 *   await lineFx.showLine({
 *     positions: win.positions,            // [{reel, row}] — board coords
 *     amount: win.win, formatAmount,       // optional tag
 *     color: undefined,                    // auto-cycles per lineIndex if omitted
 *     lineIndex: win.meta.lineIndex,
 *   });
 *   lineFx.clear();   // before next tumble/spin
 *   lineFx.destroy(); // on unmount
 */

import {
	Application,
	Container,
	Graphics,
	Sprite,
	Text,
	TextStyle,
	Ticker,
} from 'pixi.js';

import {
	PALETTE,
	TweenRunner,
	ParticlePool,
	makeGlowTexture,
	easings,
	delay,
} from './fx';

const LINE_COLORS = [
	PALETTE.GOLD,
	PALETTE.FOXFIRE,
	PALETTE.EMBER,
	PALETTE.SPIRIT,
	PALETTE.BLOOD,
	0x6ee7b7,
	0xf472b6,
];

export interface PaylineHighlightOptions {
	app: Application;
	effectsLayer: Container;
	/** Top-left of the visible board, effectsLayer space. */
	boardOrigin: { x: number; y: number };
	symbolSize?: number;
	fontFamily?: string;
}

export class PaylineHighlight {
	private app: Application;
	private effectsLayer: Container;
	private tweens: TweenRunner;
	private particles: ParticlePool;
	private origin: { x: number; y: number };
	private symbolSize: number;
	private fontFamily: string;
	private liveLines = new Set<Container>();
	private cometTicks = new Map<Container, (t: Ticker) => void>();

	constructor(opts: PaylineHighlightOptions) {
		this.app = opts.app;
		this.effectsLayer = opts.effectsLayer;
		this.origin = opts.boardOrigin;
		this.symbolSize = opts.symbolSize ?? 120;
		this.fontFamily = opts.fontFamily ?? 'Arial';
		this.tweens = new TweenRunner(opts.app.ticker);
		this.particles = new ParticlePool(opts.app.ticker, opts.app.renderer, 200);
		this.effectsLayer.addChild(this.particles.container);
	}

	private cellCenter(pos: { reel: number; row: number }): { x: number; y: number } {
		return {
			x: this.origin.x + (pos.reel + 0.5) * this.symbolSize,
			y: this.origin.y + (pos.row + 0.5) * this.symbolSize,
		};
	}

	/**
	 * Trace and hold one winning line. Resolves when the trace + tag pop are
	 * done (the stroke stays visible until clear()).
	 */
	async showLine(opts: {
		positions: { reel: number; row: number }[];
		lineIndex?: number;
		color?: number;
		amount?: number;
		formatAmount?: (n: number) => string;
		/** ms for the full left-to-right trace. */
		traceDuration?: number;
	}): Promise<void> {
		const points = opts.positions
			.slice()
			.sort((a, b) => a.reel - b.reel)
			.map((p) => this.cellCenter(p));
		if (points.length < 2) return;

		const color = opts.color ?? LINE_COLORS[(opts.lineIndex ?? 0) % LINE_COLORS.length];
		const node = new Container();
		this.effectsLayer.addChild(node);
		this.liveLines.add(node);

		// under-glow pulse at each winning cell
		for (const pt of points) {
			const cellGlow = new Sprite(makeGlowTexture(this.app.renderer, Math.round(this.symbolSize * 0.62), color));
			cellGlow.anchor.set(0.5);
			cellGlow.position.set(pt.x, pt.y);
			cellGlow.blendMode = 'add';
			cellGlow.alpha = 0;
			node.addChild(cellGlow);
			void this.tweens.to(cellGlow, { alpha: 0.55 }, { duration: 300 });
			void this.tweens.to(cellGlow, { alpha: 0.3 }, { duration: 500, ease: easings.sineInOut, repeat: -1, yoyo: true });
		}

		// stroke layers: wide soft halo + tight core, redrawn as the trace grows
		const halo = new Graphics();
		halo.blendMode = 'add';
		halo.alpha = 0.45;
		const core = new Graphics();
		core.blendMode = 'add';
		node.addChild(halo, core);

		// comet head
		const comet = new Sprite(makeGlowTexture(this.app.renderer, 36, color));
		comet.anchor.set(0.5);
		comet.blendMode = 'add';
		comet.position.set(points[0].x, points[0].y);
		node.addChild(comet);

		// total polyline length for constant-speed trace
		const segLengths: number[] = [];
		let total = 0;
		for (let i = 0; i < points.length - 1; i++) {
			const len = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
			segLengths.push(len);
			total += len;
		}

		const pointAt = (dist: number): { x: number; y: number } => {
			let remaining = dist;
			for (let i = 0; i < segLengths.length; i++) {
				if (remaining <= segLengths[i]) {
					const t = segLengths[i] === 0 ? 0 : remaining / segLengths[i];
					return {
						x: points[i].x + (points[i + 1].x - points[i].x) * t,
						y: points[i].y + (points[i + 1].y - points[i].y) * t,
					};
				}
				remaining -= segLengths[i];
			}
			return points[points.length - 1];
		};

		const drawStrokeTo = (dist: number) => {
			halo.clear();
			core.clear();
			halo.moveTo(points[0].x, points[0].y);
			core.moveTo(points[0].x, points[0].y);
			let walked = 0;
			for (let i = 0; i < segLengths.length; i++) {
				const end = Math.min(dist - walked, segLengths[i]);
				if (end <= 0) break;
				const t = segLengths[i] === 0 ? 1 : end / segLengths[i];
				const x = points[i].x + (points[i + 1].x - points[i].x) * t;
				const y = points[i].y + (points[i + 1].y - points[i].y) * t;
				halo.lineTo(x, y);
				core.lineTo(x, y);
				walked += segLengths[i];
			}
			halo.stroke({ color, width: 18, alpha: 0.45, cap: 'round', join: 'round' });
			core.stroke({ color: 0xffffff, width: 5, alpha: 0.95, cap: 'round', join: 'round' });
		};

		// wisp trail behind the comet while tracing
		let accumulator = 0;
		const trailTick = (ticker: Ticker) => {
			accumulator += ticker.deltaMS;
			if (accumulator < 60) return;
			accumulator = 0;
			this.particles.emit({
				x: comet.x, y: comet.y,
				count: 2,
				speed: [10, 50],
				gravity: -40,
				life: [300, 700],
				scaleStart: [0.3, 0.7],
				tints: [color, 0xffffff],
			});
		};
		this.app.ticker.add(trailTick);
		this.cometTicks.set(node, trailTick);

		// trace
		const trace = { dist: 0 };
		await this.tweens.to(trace, { dist: total }, {
			duration: opts.traceDuration ?? 450,
			ease: easings.cubicInOut,
			onUpdate: () => {
				drawStrokeTo(trace.dist);
				const p = pointAt(trace.dist);
				comet.position.set(p.x, p.y);
			},
		});
		drawStrokeTo(total);

		// comet pops at the end of the line
		this.particles.emit({
			x: comet.x, y: comet.y,
			count: 10,
			speed: [80, 240],
			life: [300, 700],
			scaleStart: [0.4, 0.8],
			tints: [color, 0xffffff],
		});
		void this.tweens.to(comet, { alpha: 0 }, { duration: 300 });

		// win amount tag at line midpoint
		if (opts.amount !== undefined) {
			const fmt = opts.formatAmount ?? ((n: number) => n.toFixed(2));
			const mid = pointAt(total / 2);
			const tag = new Text({
				text: fmt(opts.amount),
				style: new TextStyle({
					fontFamily: this.fontFamily,
					fontSize: Math.round(this.symbolSize * 0.3),
					fontWeight: '900',
					fill: PALETTE.GOLD,
					stroke: { color: PALETTE.INK, width: 5 },
					dropShadow: { color, blur: 8, distance: 0, alpha: 0.9 },
				}),
			});
			tag.anchor.set(0.5);
			tag.position.set(mid.x, mid.y - this.symbolSize * 0.45);
			tag.scale.set(0);
			node.addChild(tag);
			await this.tweens.to(tag.scale, { x: 1, y: 1 }, { duration: 350, ease: easings.backOut });
		}

		await delay(150);
	}

	/** Fade out and remove all live line strokes (call before next tumble/spin). */
	async clear(fadeMs = 250): Promise<void> {
		const nodes = [...this.liveLines];
		this.liveLines.clear();
		for (const node of nodes) {
			const tick = this.cometTicks.get(node);
			if (tick) {
				this.app.ticker.remove(tick);
				this.cometTicks.delete(node);
			}
		}
		await Promise.all(
			nodes.map((node) =>
				this.tweens.to(node, { alpha: 0 }, { duration: fadeMs }).then(() => {
					if (!node.destroyed) node.destroy({ children: true });
				}),
			),
		);
	}

	destroy() {
		for (const [node, tick] of this.cometTicks) {
			this.app.ticker.remove(tick);
			node.destroy({ children: true });
		}
		this.cometTicks.clear();
		for (const node of this.liveLines) {
			if (!node.destroyed) node.destroy({ children: true });
		}
		this.liveLines.clear();
		this.tweens.destroy();
		this.effectsLayer.removeChild(this.particles.container);
		this.particles.destroy();
	}
}
