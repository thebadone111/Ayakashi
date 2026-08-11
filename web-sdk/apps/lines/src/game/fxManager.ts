/**
 * Ayakashi — fxManager: single point of wiring between the declarative
 * pixi-svelte world and the imperative animation modules.
 *
 * Containers are registered by <FxHost> instances in the component tree
 * (Game.svelte etc.); modules are constructed lazily on first use so the
 * PIXI application and loaded assets are guaranteed to exist.
 *
 * Coordinate model:
 *   - "board space"  = MainContainer space, board top-left at boardOrigin().
 *   - "canvas space" = full renderer canvas (overlay screens).
 *   - Book event positions use PADDED row indices (board has 1 padding row
 *     on top) — use toVisible() before handing them to FX modules.
 *
 * NOTE: full-screen modules capture canvas sizes at first construction.
 * On window resize mid-session the overlays keep their original size —
 * acceptable for Storybook/desktop v1, revisit for production mobile.
 */

import { Graphics, Rectangle, Texture } from 'pixi.js';
import type { Application, Container } from 'pixi.js';

import {
	WinCelebration,
	BonusTriggerAnimation,
	FreeSpinsScreen,
	TransitionWipe,
	KanaboSmash,
	OfudaCharm,
	TumbleExplosion,
	SymbolWinFx,
	ReelSpinFx,
	PaylineHighlight,
	WildLandingAnimation,
	SymbolIdleManager,
	BackgroundAmbient,
	AvatarActor,
	TweenRunner,
	PALETTE,
	PostFx,
	CameraGrammar,
	setParticleTexture,
	setParticleAnim,
	type ParticleName,
} from './animations';

import { SYMBOL_SIZE, BOARD_SIZES, BOARD_ANCHOR, BOARD_DIMENSIONS } from './constants';
import { stateApp } from './stateApp';
import { stateLayoutDerived } from './stateLayout';
import manifest from './winSheets.manifest.json';
import type { Position } from './types';

const PADDING_ROW_OFFSET = 1; // board reels carry 1 padding symbol on top
// Locally-hosted brush face (see app.html @font-face).
//
// 2026-07-03: DISPLAY_FONT switched off 'Ninja Kage' — it is a DEMO face with
// no commercial licence (a submission hard-stop) and empty digit glyphs.
// Yuji Syuku ships under the OFL, covers the full character set, and already
// renders every numeric string in the game. If a punchier display face is
// wanted later, license one and swap DISPLAY_FONT only.
const DISPLAY_FONT = 'Yuji Syuku'; // titles (BIG WIN, FREE SPINS, …)
const TEXT_FONT = 'Yuji Syuku'; // anything with numbers

// --- registered containers (set by FxHost callbacks) -------------------------

let shakeTarget: Container | null = null;
let boardFxLayer: Container | null = null;
let overlayLayer: Container | null = null;

// --- lazy module instances ----------------------------------------------------

let _winCelebration: WinCelebration | null = null;
let _bonusTrigger: BonusTriggerAnimation | null = null;
let _freeSpins: FreeSpinsScreen | null = null;
let _transitionWipe: TransitionWipe | null = null;
let _kanabo: KanaboSmash | null = null;
let _ofuda: OfudaCharm | null = null;
let _tumbleExplosion: TumbleExplosion | null = null;
let _symbolWinFx: SymbolWinFx | null = null;
let _reelSpinFx: ReelSpinFx | null = null;
let _paylineHighlight: PaylineHighlight | null = null;
let _wildLanding: WildLandingAnimation | null = null;
let _symbolIdles: SymbolIdleManager | null = null;
let _avatar: AvatarActor | null = null;
let _backgroundAmbient: BackgroundAmbient | null = null;
let _postFx: PostFx | null = null;
let _camera: CameraGrammar | null = null;

// --- helpers -------------------------------------------------------------------

let _textureGcDisabled = false;

const app = (): Application => {
	const pixiApp = stateApp.pixiApplication;
	if (!pixiApp) throw new Error('fxManager: PIXI application not ready');
	if (!_textureGcDisabled) {
		// PIXI v8.8 (WebGPU) bug: TextureGCSystem unloads an idle texture whose
		// source a live BindGroup still references, then BindGroup._updateKey reads
		// `_resourceId` on the now-null resource and throws EVERY FRAME. We hit this
		// at free-spin end (FX teardown leaves a just-idled texture briefly bound).
		// Our generated/loaded textures are a bounded, long-lived set (glow cache,
		// atlas, particle webps) we want resident anyway — so turn the GC off.
		const renderer = pixiApp.renderer as unknown as { textureGC?: { active: boolean } };
		if (renderer.textureGC) renderer.textureGC.active = false;
		_textureGcDisabled = true;
	}
	return pixiApp;
};

const texture = (key: string): Texture | undefined =>
	stateApp.loadedAssets?.[key] as Texture | undefined;

const canvas = () => stateLayoutDerived.canvasSizes();

/** Board top-left in MainContainer (board) space. */
const boardOrigin = () => {
	const main = stateLayoutDerived.mainLayout();
	return {
		x: main.width * BOARD_ANCHOR.x - BOARD_SIZES.width / 2,
		y: main.height * BOARD_ANCHOR.y - BOARD_SIZES.height / 2,
	};
};

/** Padded book-event position → visible-board position. */
const toVisible = (pos: Position): Position => ({ reel: pos.reel, row: pos.row - PADDING_ROW_OFFSET });

/** Visible-board cell centre → canvas-space point (for overlay modules). */
const boardCellToCanvas = (pos: Position) => {
	const main = stateLayoutDerived.mainLayout();
	const sizes = canvas();
	const origin = boardOrigin();
	const bx = origin.x + (pos.reel + 0.5) * SYMBOL_SIZE;
	const by = origin.y + (pos.row + 0.5) * SYMBOL_SIZE;
	return {
		x: sizes.width * 0.5 + (bx - main.width * 0.5) * main.scale,
		y: sizes.height * 0.5 + (by - main.height * 0.5) * main.scale,
	};
};

// Generated alpha sprites for ParticlePool (background-loaded; modules fall
// back to the glow dot until these resolve). Refreshed on every module getter
// because assets can land after the layers register.
const PARTICLE_ASSET_MAP: Record<Exclude<ParticleName, 'petal'>, string> = {
	ink: 'particleInk',
	paper: 'particlePaper',
	ember: 'particleEmber',
	smoke: 'particleSmoke',
	foxfire: 'particleFoxfire',
};

// Petal asset keys — each one is a 4x4 sprite sheet (16 frames at 256 px) of
// a tumbling-rotation Wan/Hailuo I2V cycle. We slice each loaded sheet into a
// Texture[] of frames and register all of them with particleLib so emit sites
// random-pick one cycle per particle for natural ambient drift variety.
const PETAL_SHEET_KEYS = [
	'particlePetal1',
	'particlePetal2',
	'particlePetal3',
	'particlePetal4',
	'particlePetal5',
	'particlePetal6',
	'particlePetal7',
	'particlePetal8',
];
const PETAL_GRID = { cols: 4, rows: 4 };

// Cache the slice work — sheet sources don't change after load, so we only
// build the frame arrays once per source.
const _petalFrameCache = new Map<unknown, Texture[]>();

const sliceSheet = (sheet: Texture, cols: number, rows: number): Texture[] => {
	const cached = _petalFrameCache.get(sheet.source);
	if (cached) return cached;
	const fw = sheet.width / cols;
	const fh = sheet.height / rows;
	const frames: Texture[] = [];
	for (let i = 0; i < cols * rows; i++) {
		const c = i % cols;
		const r = Math.floor(i / cols);
		frames.push(
			new Texture({
				source: sheet.source,
				frame: new Rectangle(c * fw, r * fh, fw, fh),
			}),
		);
	}
	// Ping-pong: append the sequence reversed (excluding endpoints) so the loop
	// seam is invisible. [0..15] → [0..15, 14..1] = 30-frame seamless cycle.
	// The particle pool starts each new particle at a random frame, so the swarm
	// always looks varied even though every particle shares the same cycle.
	const pingPong = [...frames, ...frames.slice(1, -1).reverse()];
	_petalFrameCache.set(sheet.source, pingPong);
	return pingPong;
};

const refreshParticleTextures = () => {
	for (const [name, key] of Object.entries(PARTICLE_ASSET_MAP)) {
		setParticleTexture(name as ParticleName, texture(key));
	}
	// Slice each loaded petal sheet into its 16 frames and register them.
	const petalSheets: Texture[][] = [];
	for (const key of PETAL_SHEET_KEYS) {
		const sheet = texture(key);
		if (sheet) petalSheets.push(sliceSheet(sheet, PETAL_GRID.cols, PETAL_GRID.rows));
	}
	setParticleAnim('petal', petalSheets);
};

const needBoardFx = (): Container => {
	if (!boardFxLayer) throw new Error('fxManager: board FX layer not registered');
	refreshParticleTextures();
	return boardFxLayer;
};

const needOverlay = (): Container => {
	if (!overlayLayer) throw new Error('fxManager: overlay layer not registered');
	// overlay modules (FS intro foxfire, bonus, celebration) use textured
	// particles too — refresh here so they don't depend on a board-FX having
	// run first to populate the registry.
	refreshParticleTextures();
	return overlayLayer;
};

const needShakeTarget = (): Container => shakeTarget ?? needOverlay();

// --- registration (FxHost callbacks; return value is the cleanup) ----------------

const registerShakeTarget = (container: Container) => {
	shakeTarget = container;
	if (stateApp.pixiApplication) {
		_camera = new CameraGrammar({ app: app(), dipTarget: container });
	}
	return () => {
		_camera?.destroy();
		_camera = null;
		shakeTarget = null;
	};
};

// PostFx needs both layers — created when the second one registers,
// torn down when either unregisters.
const maybeInitPostFx = () => {
	if (_postFx || !boardFxLayer || !overlayLayer || !stateApp.pixiApplication) return;
	_postFx = new PostFx({
		app: app(),
		boardFxLayer,
		overlayLayer,
	});
};

const teardownPostFx = () => {
	_postFx?.destroy();
	_postFx = null;
};

let _boardFxMask: Graphics | null = null;

const registerBoardFx = (container: Container) => {
	boardFxLayer = container;
	// Clip board-space FX (paylines, symbol win bursts, kanabo, ofuda, tumble
	// explosions, dust) to the 5x5 cell rectangle. Without a mask these bled
	// into the lacquer-frame padding above/below the reels, making win FX look
	// like they were connecting through the border art. The overlay layer
	// (big-win celebrations, FS intro, bonus trigger, mist wipe) is intentionally
	// unmasked — those are full-screen.
	const origin = boardOrigin();
	const mask = new Graphics()
		.rect(origin.x, origin.y, BOARD_SIZES.width, BOARD_SIZES.height)
		.fill(0xffffff);
	container.addChild(mask);
	container.mask = mask;
	_boardFxMask = mask;
	maybeInitPostFx();
	return () => {
		teardownPostFx();
		if (spotlightG && !spotlightG.destroyed) spotlightG.destroy();
		spotlightG = null;
		_fxTweens?.destroy();
		_fxTweens = null;
		_kanabo?.destroy();
		_ofuda?.destroy();
		_tumbleExplosion?.destroy();
		_symbolWinFx?.destroy();
		_reelSpinFx?.destroy();
		_paylineHighlight?.destroy();
		_wildLanding?.destroy();
		_symbolIdles?.destroy();
		_kanabo = _ofuda = _tumbleExplosion = _symbolWinFx = null;
		_reelSpinFx = _paylineHighlight = _wildLanding = null;
		_symbolIdles = null;
		if (boardFxLayer) boardFxLayer.mask = null;
		if (_boardFxMask && !_boardFxMask.destroyed) _boardFxMask.destroy();
		_boardFxMask = null;
		boardFxLayer = null;
	};
};

const registerOverlay = (container: Container) => {
	overlayLayer = container;
	maybeInitPostFx();
	return () => {
		teardownPostFx();
		_winCelebration?.destroy();
		_bonusTrigger?.destroy();
		_freeSpins?.destroy();
		_transitionWipe?.destroy();
		_winCelebration = _bonusTrigger = _freeSpins = _transitionWipe = null;
		overlayLayer = null;
	};
};

/** Plain 4x4 grid slice (no ping-pong — AvatarActor ping-pongs idles itself). */
const sliceGrid = (sheet: Texture, cols: number, rows: number): Texture[] => {
	const fw = sheet.width / cols;
	const fh = sheet.height / rows;
	const frames: Texture[] = [];
	for (let i = 0; i < cols * rows; i++) {
		frames.push(
			new Texture({
				source: sheet.source,
				frame: new Rectangle((i % cols) * fw, Math.floor(i / cols) * fh, fw, fh),
			}),
		);
	}
	return frames;
};

const registerAvatar = (container: Container) => {
	const avatarTexture = texture('avatar');
	if (avatarTexture) {
		const main = stateLayoutDerived.mainLayout();
		// Mirrored 2026-06-27 (Max): avatar on the LEFT. Height bumped 560 → 640
		// the same day — source is 1536×2688 (aspect 0.571), so at h=640 she
		// renders ~366 px wide in main-space, well under the avatar/frame gap.
		// We're downsampling 4.2x from source, so plenty of headroom remains;
		// further size bumps are texture-quality safe.
		//
		// Wan I2V idle (green-screen render, baked 4x4): when the sheet is
		// loaded the mesh cycles real animation frames (ping-pong inside
		// AvatarActor) UNDER the procedural flow/jiggle — texture motion +
		// mesh motion together is the "alive" look. The static webp remains
		// the fallback when the sheet hasn't landed.
		const idleSheet = texture('avatarIdleSheet');
		const idleFrames = idleSheet
			? sliceGrid(idleSheet, manifest.avatarIdle.cols, manifest.avatarIdle.rows).slice(
					0,
					manifest.avatarIdle.frames,
				)
			: undefined;
		_avatar = new AvatarActor({
			app: app(),
			parent: container,
			texture: idleFrames?.[0] ?? avatarTexture,
			x: main.width * 0.155,
			y: main.height * 0.81,
			height: 640,
			idleFrames,
			// 40 frames ping-pong at 16 fps ≈ 4.9 s breath cycle — dense enough
			// that no step reads as stop-motion; pace matches the source clip.
			idleFps: 16,
		});
		// Animated cheer (Wan clip) on big wins; static pose textures stay as a
		// fallback path if only those exist. Ping-pong so the loop wrap during
		// a long pose hold never pops from end-pose back to start-pose.
		const cheerSheet = texture('avatarCheerSheet');
		if (cheerSheet) {
			const f = sliceGrid(cheerSheet, manifest.avatarCheer.cols, manifest.avatarCheer.rows).slice(
				0,
				manifest.avatarCheer.frames,
			);
			_avatar.setPoseFrames({ cheer: [...f, ...f.slice(1, -1).reverse()] });
		}
		const cheer = texture('avatarCheer');
		const wink = texture('avatarWink');
		if (cheer || wink) _avatar.setPoses({ cheer, wink });
	}
	return () => {
		_avatar?.destroy();
		_avatar = null;
	};
};

const registerBackground = (container: Container) => {
	const base = texture('bgBg');
	if (base) {
		const sizes = canvas();
		_backgroundAmbient = new BackgroundAmbient({
			app: app(),
			parent: container,
			textures: {
				base,
				// trim (bg_fg) removed 2026-06-27: cherry branches baked into bg_bg.
				// effect (bg_effect) also dropped 2026-06-27: bg already carries
				// its own bokeh + light dynamics.
				// mist (bg_mist) dropped 2026-06-27 (afternoon): Max wanted the
				// remaining grey wash gone too — the new bg paints its own mist
				// into the lower portion of the scene already, so a separate
				// drifting mist layer was just washing the painting.
			},
			width: sizes.width,
			height: sizes.height,
		});
	}
	return () => {
		_backgroundAmbient?.destroy();
		_backgroundAmbient = null;
	};
};

// --- lazy getters --------------------------------------------------------------

const winCelebration = (): WinCelebration => {
	if (!_winCelebration) {
		const sizes = canvas();
		_winCelebration = new WinCelebration({
			app: app(),
			parent: needOverlay(),
			shakeTarget: needShakeTarget(),
			width: sizes.width,
			height: sizes.height,
			fontFamily: DISPLAY_FONT, // tier title (letters)
			numberFontFamily: TEXT_FONT, // win amount (digits) — NinjaKage has none
			brushTexture: texture('brushWide'),
			// the celebration anchors foxfire + the win banner to the live avatar
			getAvatarFocus: () => _avatar?.getScreenBounds() ?? null,
		});
	}
	return _winCelebration;
};

const bonusTrigger = (): BonusTriggerAnimation => {
	if (!_bonusTrigger) {
		const sizes = canvas();
		_bonusTrigger = new BonusTriggerAnimation({
			app: app(),
			parent: needOverlay(),
			shakeTarget: needShakeTarget(),
			width: sizes.width,
			height: sizes.height,
		});
	}
	return _bonusTrigger;
};

const freeSpins = (): FreeSpinsScreen => {
	if (!_freeSpins) {
		const sizes = canvas();
		_freeSpins = new FreeSpinsScreen({
			app: app(),
			parent: needOverlay(),
			width: sizes.width,
			height: sizes.height,
			fontFamily: DISPLAY_FONT, // FREE SPINS / TOTAL WIN titles (letters)
			numberFontFamily: TEXT_FONT, // FS count + total amount (digits)
			toriiTexture: texture('torii'),
		});
	}
	return _freeSpins;
};

const transitionWipe = (): TransitionWipe => {
	if (!_transitionWipe) {
		const sizes = canvas();
		_transitionWipe = new TransitionWipe({
			app: app(),
			parent: needOverlay(),
			width: sizes.width,
			height: sizes.height,
			mistTexture: texture('bgMist'), // fog uses the scene's own painted mist
		});
	}
	return _transitionWipe;
};

const kanabo = (): KanaboSmash => {
	if (!_kanabo) {
		_kanabo = new KanaboSmash({
			app: app(),
			effectsLayer: needBoardFx(),
			boardOrigin: boardOrigin(),
			shakeTarget: needShakeTarget(),
			symbolSize: SYMBOL_SIZE,
			clubTexture: texture('x2.png'),
		});
	}
	// the symbolsStatic atlas background-loads (phase 2) — backfill the club art
	// if the module was built before the atlas landed
	_kanabo.setClubTexture(texture('x2.png'));
	return _kanabo;
};

const ofuda = (): OfudaCharm => {
	if (!_ofuda) {
		_ofuda = new OfudaCharm({
			app: app(),
			effectsLayer: needBoardFx(),
			boardOrigin: boardOrigin(),
			symbolSize: SYMBOL_SIZE,
			fontFamily: TEXT_FONT, // x-multiplier / amount (digits) — NinjaKage has none
		});
	}
	return _ofuda;
};

const tumbleExplosion = (): TumbleExplosion => {
	if (!_tumbleExplosion) {
		_tumbleExplosion = new TumbleExplosion({
			app: app(),
			effectsLayer: needBoardFx(),
			boardOrigin: boardOrigin(),
			symbolSize: SYMBOL_SIZE,
		});
	}
	// authored Wan ink-burst clip (background-loads) — replaces the procedural
	// glow/particle spray once the sheet lands
	const burstSheet = texture('fxInkBurst');
	if (burstSheet)
		_tumbleExplosion.setBurstFrames(
			sliceGrid(burstSheet, manifest.inkBurst.cols, manifest.inkBurst.rows).slice(
				0,
				manifest.inkBurst.frames,
			),
		);
	return _tumbleExplosion;
};

const symbolWinFx = (): SymbolWinFx => {
	if (!_symbolWinFx) {
		_symbolWinFx = new SymbolWinFx({
			app: app(),
			effectsLayer: needBoardFx(),
			symbolSize: SYMBOL_SIZE,
		});
	}
	return _symbolWinFx;
};

const reelSpinFx = (): ReelSpinFx => {
	if (!_reelSpinFx) {
		_reelSpinFx = new ReelSpinFx({
			app: app(),
			effectsLayer: needBoardFx(),
			boardOrigin: boardOrigin(),
			reelCount: BOARD_DIMENSIONS.x,
			rowCount: BOARD_DIMENSIONS.y,
			symbolSize: SYMBOL_SIZE,
		});
	}
	return _reelSpinFx;
};

const paylineHighlight = (): PaylineHighlight => {
	if (!_paylineHighlight) {
		_paylineHighlight = new PaylineHighlight({
			app: app(),
			effectsLayer: needBoardFx(),
			boardOrigin: boardOrigin(),
			symbolSize: SYMBOL_SIZE,
			fontFamily: TEXT_FONT, // x-multiplier / amount (digits) — NinjaKage has none
		});
	}
	return _paylineHighlight;
};

const wildLanding = (): WildLandingAnimation => {
	if (!_wildLanding) {
		_wildLanding = new WildLandingAnimation({
			app: app(),
			effectsLayer: needBoardFx(),
			symbolSize: SYMBOL_SIZE,
			fontFamily: TEXT_FONT, // x-multiplier / amount (digits) — NinjaKage has none
		});
	}
	return _wildLanding;
};

const symbolIdles = (): SymbolIdleManager => {
	if (!_symbolIdles) _symbolIdles = new SymbolIdleManager(app());
	return _symbolIdles;
};

// --- convenience helpers used by handlers/components ------------------------------

/**
 * Win burst at a padded book-event position (visible cell centre).
 *
 * Cell-only by design: the elastic pop/shimmer on the symbol itself is played
 * by SymbolSprite when boardWithAnimateSymbols flips its state to 'win' (the
 * declarative board owns its display objects — there is no imperative symbol
 * Container to hand to SymbolWinFx). This layer adds the tier-tinted glow
 * flare + spark spray behind the popping symbol.
 */
const winBurstAt = async (paddedPos: Position, symbolName?: string) => {
	if (!boardFxLayer) return;
	const pos = toVisible(paddedPos);
	const origin = boardOrigin();
	const tier =
		symbolName === 'W'
			? 'wild'
			: symbolName === 'S'
				? 'scatter'
				: symbolName && ['X', 'M'].includes(symbolName)
					? 'special'
					: symbolName?.startsWith('H')
						? 'high'
						: 'low';
	await symbolWinFx().play({
		x: origin.x + (pos.reel + 0.5) * SYMBOL_SIZE,
		y: origin.y + (pos.row + 0.5) * SYMBOL_SIZE,
		tier,
	});
};

// --- win spotlight: dims the board except the winning cells -------------------

let _fxTweens: TweenRunner | null = null;
let spotlightG: Graphics | null = null;

const fxTweens = (): TweenRunner => {
	if (!_fxTweens) _fxTweens = new TweenRunner(app().ticker);
	return _fxTweens;
};

/** Dim the board, with rounded holes punched over winning cells (visible positions). */
const spotlightShow = (visiblePositions: Position[]) => {
	if (!boardFxLayer) return;
	if (spotlightG && !spotlightG.destroyed) spotlightG.destroy();
	const origin = boardOrigin();
	const g = new Graphics();
	g.rect(origin.x, origin.y, BOARD_SIZES.width, BOARD_SIZES.height).fill({ color: PALETTE.INK });
	for (const pos of visiblePositions) {
		g.roundRect(
			origin.x + pos.reel * SYMBOL_SIZE + 3,
			origin.y + pos.row * SYMBOL_SIZE + 3,
			SYMBOL_SIZE - 6,
			SYMBOL_SIZE - 6,
			12,
		).cut();
	}
	g.alpha = 0;
	boardFxLayer.addChildAt(g, 0); // below paylines/bursts
	spotlightG = g;
	void fxTweens().to(g, { alpha: 0.5 }, { duration: 180 });
};

const spotlightHide = async () => {
	const g = spotlightG;
	spotlightG = null;
	if (!g || g.destroyed) return;
	await fxTweens().to(g, { alpha: 0 }, { duration: 250 });
	if (!g.destroyed) g.destroy();
};

const backgroundMood = (mood: 'base' | 'freespin') => _backgroundAmbient?.setMood(mood);
const backgroundResize = (width: number, height: number) => _backgroundAmbient?.resize(width, height);
const avatar = () => _avatar;

export const fxManager = {
	// registration
	registerShakeTarget,
	registerBoardFx,
	registerOverlay,
	registerAvatar,
	registerBackground,
	// modules
	winCelebration,
	bonusTrigger,
	freeSpins,
	transitionWipe,
	kanabo,
	ofuda,
	tumbleExplosion,
	symbolWinFx,
	reelSpinFx,
	paylineHighlight,
	wildLanding,
	symbolIdles,
	avatar,
	// helpers
	toVisible,
	boardOrigin,
	boardCellToCanvas,
	winBurstAt,
	spotlightShow,
	spotlightHide,
	backgroundMood,
	backgroundResize,
	PADDING_ROW_OFFSET,
};

// Dev-only hook: expose the live (registered) instance so headless/Storybook
// verification drives the SAME singleton the components register into (a bare
// dynamic import resolves to a different, unregistered module copy under HMR).
if (import.meta.env?.DEV && typeof window !== 'undefined') {
	(window as unknown as { __fxManager?: typeof fxManager }).__fxManager = fxManager;
}
