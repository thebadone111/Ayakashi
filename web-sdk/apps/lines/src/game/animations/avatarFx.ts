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
 *   bonus    → double hop + aura      fsintro  → sustained excitement
 *   bigwin   → celebration hops scaled by win tier, long excitement
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

import {
	PALETTE,
	makeGlowTexture,
	fxBus,
	type FxEvent,
	delay,
} from './fx';

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
	private scaleFit: number;

	// physics — soft, slightly under-damped: lifelike sway, no twitch
	private squash = makeSpring(55, 8); // scale-y overshoot (jelly)
	private sway = makeSpring(22, 6); // lean / horizontal shear
	private hop = makeSpring(45, 7); // vertical hop offset
	private excite = 0; // 0..~2.5, decays
	private time = Math.random() * 100;
	private lastMicroImpulse = 0; // cooldown so 5 reel stops don't machine-gun her

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

		if (opts.autoReact ?? true) this.subscribe();
		this.app.ticker.add(this.tick);
	}

	// =========================================================================
	// Reactions
	// =========================================================================

	react(event: FxEvent, data?: unknown) {
		if (this.destroyed) return;
		switch (event) {
			case 'reelstop': {
				// micro-bounce, rate-limited (one per 180 ms max)
				const now = performance.now();
				if (now - this.lastMicroImpulse > 180) {
					this.lastMicroImpulse = now;
					this.squash.velocity += 0.7;
				}
				break;
			}
			case 'tumble':
				this.squash.velocity += 2.0;
				this.hop.velocity += 0.9;
				break;
			case 'wildland':
				this.squash.velocity += 2.4;
				this.sway.velocity += (Math.random() < 0.5 ? -1 : 1) * 2.6;
				this.excite = Math.max(this.excite, 0.5);
				break;
			case 'smash':
				this.squash.velocity += 4.5;
				this.sway.velocity += (Math.random() < 0.5 ? -1 : 1) * 4.0;
				this.excite = Math.max(this.excite, 0.8);
				break;
			case 'bonus':
				this.excite = Math.max(this.excite, 1.4);
				this.hopSequence(2, 4.5);
				break;
			case 'fsintro':
				this.excite = Math.max(this.excite, 1.2);
				this.sway.velocity += 3.0;
				break;
			case 'bigwin': {
				const level = (data as { level?: string } | undefined)?.level ?? 'big';
				const intensity = TIER_INTENSITY[level] ?? 1;
				this.excite = Math.max(this.excite, intensity);
				this.hopSequence(Math.min(2 + Math.round(intensity), 5), 3.5 + intensity * 1.2);
				break;
			}
		}
	}

	private async hopSequence(count: number, power: number) {
		for (let i = 0; i < count; i++) {
			if (this.destroyed) return;
			this.hop.velocity += power * 0.8;
			this.squash.velocity += power * 0.45;
			await delay(380);
		}
	}

	setVisible(visible: boolean) {
		this.root.visible = visible;
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

		const excitement = 1 + this.excite * 1.2;

		// --- whole-body transforms --------------------------------------------
		// breathing + jelly squash (bottom anchored: scale up = grows upward)
		const breath = Math.sin(t * (1.0 * excitement)) * 0.011;
		const squashAmt = Math.tanh(this.squash.value * 0.7) * 0.05; // soft-saturating
		this.mesh.scale.set(
			this.scaleFit * (1 - breath * 0.6 - squashAmt * 0.55),
			this.scaleFit * (1 + breath + squashAmt),
		);
		// lean — soft-limited so she sways, never tips
		this.mesh.rotation = Math.tanh(this.sway.value * 0.5) * 0.05 + Math.sin(t * 0.45) * 0.01;
		// hop — tanh gives a smooth arc with a tiny natural dip on landing,
		// plus a gentle idle bob so she's never frozen to the floor
		this.root.y = this.baseY - Math.tanh(this.hop.value * 0.6) * 30 + Math.sin(t * 0.9) * 2.5;

		// --- mesh flow waves -----------------------------------------------------
		const buffer = this.mesh.geometry.getBuffer('aPosition');
		const data = buffer.data as Float32Array;
		const base = this.basePositions;
		const waveAmp = this.texH * 0.0042 * excitement;
		const swayShear = Math.tanh(this.sway.value * 0.5) * this.texW * 0.04;
		for (let i = 0; i < base.length; i += 2) {
			const x0 = base[i];
			const y0 = base[i + 1];
			const ny = y0 / this.texH; // 0 = top (head), 1 = bottom (feet)
			const topWeight = Math.pow(1 - ny, 1.4); // top flows, feet planted
			const flow =
				Math.sin(t * 1.5 + ny * 4.0) * waveAmp * 0.7 +
				Math.sin(t * 2.6 + ny * 6.0 + x0 * 0.01) * waveAmp * 0.35;
			data[i] = x0 + (flow + swayShear) * topWeight;
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
		this.unsubscribe();
		this.app.ticker.remove(this.tick);
		// texture belongs to the asset loader — keep it
		this.root.destroy({ children: true, texture: false });
	}
}
