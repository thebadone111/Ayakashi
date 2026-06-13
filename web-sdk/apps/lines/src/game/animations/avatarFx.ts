/**
 * Ayakashi — Avatar actor (gacha-style flowy/jiggly character, no Spine,
 * no layer segmentation needed).
 *
 * Takes the flat avatar PNG (art/finals/processed/avatar.png) and renders it
 * on a deformable MeshPlane grid. Two systems drive the "alive" feel:
 *
 *   FLOW   — continuous traveling sine waves through the mesh vertices,
 *            weighted toward the top (bottom-anchored), so hair/clothes/body
 *            ripple like the Live2D idle look. Plus a slow breathing bob.
 *
 *   JIGGLE — spring-damper physics (squash/stretch, sway, hop). Impulses
 *            inject velocity; the springs overshoot and settle, giving the
 *            jelly bounce gacha games have.
 *
 * REACTIONS — the actor auto-subscribes to fxBus, so it responds to the other
 * animation modules with zero wiring:
 *
 *   reelstop → tiny bounce            tumble   → bounce
 *   wildland → lean + jiggle          smash    → big squash + wobble
 *   bonus    → pirouette + aura       fsintro  → sustained excitement
 *   bigwin   → happy spin-on-the-spot (two turns on monster tiers)
 *
 * Excitement is a decaying scalar that amplifies wave amplitude, bob speed
 * and aura glow — after a big event the avatar visibly buzzes, then calms.
 *
 * Wiring (Tom):
 *
 *   const avatar = new AvatarActor({
 *     app, parent: sceneLayer,
 *     texture: avatarTexture,        // flat PNG
 *     x: 1180, y: 760,               // feet position (bottom-center anchor)
 *     height: 420,                   // display height, keeps aspect
 *   });
 *   avatar.react('bigwin', { level: 'mega' }); // manual trigger also works
 *   avatar.setVisible(false);                  // hide in portrait if cramped
 *   avatar.destroy();
 *
 * Manual mode: pass `autoReact: false` and call react() yourself.
 */

import {
	Application,
	Container,
	MeshPlane,
	Sprite,
	Texture,
	Ticker,
} from 'pixi.js';

import { PALETTE, makeGlowTexture, fxBus, type FxEvent } from './fx';

export interface AvatarActorOptions {
	app: Application;
	parent: Container;
	texture: Texture;
	/** Feet position — the avatar is anchored bottom-center. */
	x: number;
	y: number;
	/** Display height in px; width follows the texture aspect. */
	height?: number;
	/** Mesh density. Higher = smoother flow, more CPU. 10x14 is plenty. */
	verticesX?: number;
	verticesY?: number;
	/** Subscribe to fxBus automatically (default true). */
	autoReact?: boolean;
}

interface Spring {
	value: number;
	velocity: number;
	stiffness: number;
	damping: number;
}

const makeSpring = (stiffness: number, damping: number): Spring => ({
	value: 0,
	velocity: 0,
	stiffness,
	damping,
});

const TIER_INTENSITY: Record<string, number> = {
	big: 1,
	superwin: 1.3,
	mega: 1.6,
	epic: 2.1,
	max: 2.6,
};

export class AvatarActor {
	private app: Application;
	private root: Container;
	private mesh: MeshPlane;
	private aura: Sprite;
	private basePositions: Float32Array;
	private texW: number;
	private texH: number;
	private baseY: number;
	private baseX = 0;
	private scaleFit: number;

	// physics — soft and well-damped: she should breathe and settle like silk,
	// not vibrate. (Stiffness ~halved from the first pass, which read as jittery.)
	private squash = makeSpring(26, 9); // scale-y overshoot (jelly)
	private sway = makeSpring(13, 7); // lean / horizontal shear
	private hop = makeSpring(30, 8.5); // vertical hop offset
	private excite = 0; // 0..~2.5, decays
	private time = Math.random() * 100;
	private lastMicroImpulse = 0; // cooldown so 5 reel stops don't machine-gun her
	// twirl — a single happy pirouette: scale.x sweeps cos(2π·turns) so she
	// visibly turns on the spot (front → edge-on → back → front)
	private twirlPhase = 1; // 1 = idle / finished
	private twirlTurns = 1;
	private twirlDuration = 0.9; // seconds
	// reaction poses (img2img variants of the same texture). Swapped exactly
	// at the twirl's edge-on frame (scale.x ≈ 0) so no crossfade is needed —
	// she spins and comes back around in the new pose.
	private poses: Partial<Record<'cheer' | 'wink', Texture>> = {};
	private baseTexture: Texture;
	private pendingTexture: Texture | null = null;
	private poseRevertTimer: ReturnType<typeof setTimeout> | null = null;

	private busHandlers: Partial<Record<FxEvent, (data?: unknown) => void>> = {};
	private tick = (ticker: Ticker) => this.update(ticker.deltaMS);
	private destroyed = false;

	constructor(opts: AvatarActorOptions) {
		this.app = opts.app;

		const height = opts.height ?? 420;
		this.texW = opts.texture.width;
		this.texH = opts.texture.height;
		this.scaleFit = height / this.texH;
		this.baseY = opts.y;
		this.baseX = opts.x;

		this.root = new Container();
		this.root.position.set(opts.x, opts.y);
		opts.parent.addChild(this.root);

		// aura behind the character — breathes with excitement
		this.aura = new Sprite(makeGlowTexture(this.app.renderer, 150, PALETTE.SPIRIT));
		this.aura.anchor.set(0.5, 0.75);
		this.aura.blendMode = 'add';
		this.aura.alpha = 0.12;
		this.aura.scale.set((height / 220) * 1.4);
		this.root.addChild(this.aura);

		// deformable mesh, bottom-center pivot
		this.mesh = new MeshPlane({
			texture: opts.texture,
			verticesX: opts.verticesX ?? 10,
			verticesY: opts.verticesY ?? 14,
		});
		this.mesh.pivot.set(this.texW / 2, this.texH);
		this.mesh.scale.set(this.scaleFit);
		this.root.addChild(this.mesh);

		const buffer = this.mesh.geometry.getBuffer('aPosition');
		this.basePositions = new Float32Array(buffer.data);
		this.baseTexture = opts.texture;

		if (opts.autoReact ?? true) this.subscribe();
		this.app.ticker.add(this.tick);
	}

	/**
	 * Register reaction-pose textures (img2img variants of the base art —
	 * same character, same dimensions). Optional: without them the twirl
	 * simply spins the base pose.
	 */
	setPoses(poses: Partial<Record<'cheer' | 'wink', Texture>>) {
		this.poses = { ...this.poses, ...poses };
	}

	// =========================================================================
	// Reactions
	// =========================================================================

	react(event: FxEvent, data?: unknown) {
		if (this.destroyed) return;
		switch (event) {
			case 'reelstop': {
				// micro-bounce, rate-limited — barely perceptible acknowledgement
				const now = performance.now();
				if (now - this.lastMicroImpulse > 420) {
					this.lastMicroImpulse = now;
					this.squash.velocity += 0.4;
				}
				break;
			}
			case 'tumble':
				this.squash.velocity += 1.2;
				this.hop.velocity += 0.5;
				break;
			case 'wildland':
				this.squash.velocity += 1.4;
				this.sway.velocity += (Math.random() < 0.5 ? -1 : 1) * 1.8;
				this.excite = Math.max(this.excite, 0.5);
				break;
			case 'smash':
				this.squash.velocity += 2.8;
				this.sway.velocity += (Math.random() < 0.5 ? -1 : 1) * 2.6;
				this.excite = Math.max(this.excite, 0.8);
				break;
			case 'bonus':
				this.excite = Math.max(this.excite, 1.1);
				this.twirl(1, 'wink');
				break;
			case 'fsintro':
				this.excite = Math.max(this.excite, 1.2);
				this.sway.velocity += 2.0;
				break;
			case 'bigwin': {
				const level = (data as { level?: string } | undefined)?.level ?? 'big';
				const intensity = TIER_INTENSITY[level] ?? 1;
				this.excite = Math.max(this.excite, intensity);
				// one delighted pirouette — two full turns for the monster tiers
				this.twirl(intensity >= 1.6 ? 2 : 1, 'cheer');
				break;
			}
		}
	}

	/**
	 * A happy spin-on-the-spot: one hop + full turn(s) around her vertical
	 * axis. If a reaction pose is registered she comes out of the spin in it,
	 * holds for a moment, then twirls back to the base pose.
	 */
	private twirl(turns = 1, pose?: 'cheer' | 'wink') {
		if (this.twirlPhase < 1) return; // already mid-spin — let it finish
		this.twirlTurns = turns;
		this.twirlDuration = 0.75 + turns * 0.3;
		this.twirlPhase = 0;
		this.hop.velocity += 3.4;
		this.squash.velocity += 1.0;

		const poseTexture = pose && this.poses[pose];
		if (poseTexture) {
			this.pendingTexture = poseTexture;
			if (this.poseRevertTimer) clearTimeout(this.poseRevertTimer);
			this.poseRevertTimer = setTimeout(() => {
				this.poseRevertTimer = null;
				if (this.destroyed || this.mesh.texture === this.baseTexture) return;
				this.pendingTexture = this.baseTexture;
				this.twirl(1); // spin back to the base pose
			}, 2600);
		}
	}

	setVisible(visible: boolean) {
		this.root.visible = visible;
	}

	/**
	 * Her current on-screen rectangle in GLOBAL (canvas) space — used by the
	 * win celebration to anchor foxfire + the win banner around her, wherever
	 * the layout has placed her. Returns null if she's hidden.
	 */
	getScreenBounds(): { x: number; y: number; width: number; height: number } | null {
		if (!this.root.visible || this.destroyed) return null;
		const r = this.mesh.getBounds().rectangle;
		return { x: r.x, y: r.y, width: r.width, height: r.height };
	}

	/** Move the actor (e.g. layout change portrait/landscape). */
	setPosition(x: number, y: number) {
		this.baseY = y;
		this.root.position.set(x, y);
	}

	// =========================================================================
	// Simulation
	// =========================================================================

	private integrate(spring: Spring, dt: number) {
		const accel = -spring.stiffness * spring.value - spring.damping * spring.velocity;
		spring.velocity += accel * dt;
		// clamp so stacked impulses can never snap the mesh around
		spring.velocity = Math.max(-9, Math.min(9, spring.velocity));
		spring.value += spring.velocity * dt;
	}

	private update(deltaMS: number) {
		const dt = Math.min(deltaMS, 50) / 1000; // clamp tab-switch spikes
		this.time += dt;
		const t = this.time;

		this.integrate(this.squash, dt);
		this.integrate(this.sway, dt);
		this.integrate(this.hop, dt);
		this.excite = Math.max(0, this.excite - dt * 0.35); // ~3-7 s calm-down

		// excitement raises wave amplitude, but only mildly raises tempo —
		// multiplying frequency by full excitement made her hyperventilate
		const excitement = 1 + this.excite * 0.8;
		const tempo = 1 + this.excite * 0.3;

		// --- twirl (pirouette around her vertical axis) -------------------------
		let facing = 1;
		if (this.twirlPhase < 1) {
			this.twirlPhase = Math.min(1, this.twirlPhase + dt / this.twirlDuration);
			const p = this.twirlPhase;
			// easeInOutQuad — she winds up, whips around, lands softly
			const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
			facing = Math.cos(Math.PI * 2 * this.twirlTurns * eased);
			// pose swap, hidden at the edge-on frame: nobody sees the cut
			if (this.pendingTexture && Math.abs(facing) < 0.12) {
				this.mesh.texture = this.pendingTexture;
				this.pendingTexture = null;
			}
			if (this.twirlPhase >= 1) this.squash.velocity += 1.4; // landing plop
		}

		// --- whole-body transforms --------------------------------------------
		// breathing + jelly squash (bottom anchored: scale up = grows upward)
		const breath = Math.sin(t * tempo) * 0.011;
		const squashAmt = Math.tanh(this.squash.value * 0.7) * 0.05; // soft-saturating
		this.mesh.scale.set(
			this.scaleFit * (1 - breath * 0.6 - squashAmt * 0.55) * facing,
			this.scaleFit * (1 + breath + squashAmt),
		);
		// lean — soft-limited so she sways, never tips
		this.mesh.rotation = Math.tanh(this.sway.value * 0.5) * 0.05 + Math.sin(t * 0.45) * 0.01;
		// hop — tanh gives a smooth arc with a tiny natural dip on landing,
		// plus a gentle idle bob so she's never frozen to the floor
		this.root.y = this.baseY - Math.tanh(this.hop.value * 0.6) * 30 + Math.sin(t * 0.9) * 2.5;
		// weight shift — she slowly rocks foot to foot, never statue-still
		this.root.x = this.baseX + Math.sin(t * 0.22) * 3;

		// --- mesh flow waves -----------------------------------------------------
		const buffer = this.mesh.geometry.getBuffer('aPosition');
		const data = buffer.data as Float32Array;
		const base = this.basePositions;
		const waveAmp = this.texH * 0.0042 * excitement;
		const swayShear = Math.tanh(this.sway.value * 0.5) * this.texW * 0.04;
		// follow-through: hair/cloth lag behind body motion — proportional to
		// sway VELOCITY (not position), so a stop produces a whip-and-settle
		const followThrough = this.sway.velocity * this.texW * 0.012;
		for (let i = 0; i < base.length; i += 2) {
			const x0 = base[i];
			const y0 = base[i + 1];
			const ny = y0 / this.texH; // 0 = top (head), 1 = bottom (feet)
			const topWeight = Math.pow(1 - ny, 1.4); // top flows, feet planted
			const hairWeight = Math.pow(1 - ny, 2.6); // hair-only band, even higher
			const flow =
				Math.sin(t * 1.5 + ny * 4.0) * waveAmp * 0.7 +
				// phase lags toward the top: the wave travels UP through her,
				// so hair arrives late — classic follow-through read
				Math.sin(t * 2.6 + ny * 6.0 - topWeight * 0.9 + x0 * 0.01) * waveAmp * 0.35;
			// slow head-lean arc, hair band only — she looks around, dreamily
			const headLean = Math.sin(t * 0.35) * this.texW * 0.009 * hairWeight;
			data[i] = x0 + (flow + swayShear) * topWeight + headLean - followThrough * hairWeight;
			// slight vertical ripple so fabric/hair feels loose
			data[i + 1] = y0 + Math.sin(t * 2.6 + ny * 5.5 + x0 * 0.013) * waveAmp * 0.3 * topWeight;
		}
		buffer.update();

		// --- aura -------------------------------------------------------------------
		this.aura.alpha = 0.1 + this.excite * 0.22;
		const auraPulse = 1 + Math.sin(t * 3) * 0.05 * excitement;
		this.aura.scale.set(((this.texH * this.scaleFit) / 220) * 1.4 * auraPulse);
	}

	// =========================================================================
	// fxBus subscription
	// =========================================================================

	private subscribe() {
		const events: FxEvent[] = ['bigwin', 'bonus', 'smash', 'wildland', 'tumble', 'fsintro', 'reelstop'];
		for (const event of events) {
			const handler = (data?: unknown) => this.react(event, data);
			this.busHandlers[event] = handler;
			fxBus.on(event, handler);
		}
	}

	private unsubscribe() {
		for (const [event, handler] of Object.entries(this.busHandlers)) {
			if (handler) fxBus.off(event as FxEvent, handler);
		}
		this.busHandlers = {};
	}

	destroy() {
		this.destroyed = true;
		if (this.poseRevertTimer) clearTimeout(this.poseRevertTimer);
		this.unsubscribe();
		this.app.ticker.remove(this.tick);
		// textures belong to the asset loader — keep them
		this.root.destroy({ children: true, texture: false });
	}
}
