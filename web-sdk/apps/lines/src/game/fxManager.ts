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

import { Graphics } from 'pixi.js';
import type { Application, Container, Texture } from 'pixi.js';

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
	type ParticleName,
} from './animations';

import { SYMBOL_SIZE, BOARD_SIZES, BOARD_ANCHOR, BOARD_DIMENSIONS } from './constants';
import { stateApp } from './stateApp';
import { stateLayoutDerived } from './stateLayout';
import type { Position } from './types';

const PADDING_ROW_OFFSET = 1; // board reels carry 1 padding symbol on top
// Locally-hosted brush face (see app.html @font-face) — used by every
// procedural Text the FX modules draw (BIG WIN title, count-ups, badges).
const FONT_FAMILY = 'Yuji Syuku';

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

const app = (): Application => {
	const pixiApp = stateApp.pixiApplication;
	if (!pixiApp) throw new Error('fxManager: PIXI application not ready');
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
const PARTICLE_ASSET_MAP: Record<ParticleName, string> = {
	ink: 'particleInk',
	petal: 'particlePetal',
	paper: 'particlePaper',
	ember: 'particleEmber',
	smoke: 'particleSmoke',
};

const refreshParticleTextures = () => {
	for (const [name, key] of Object.entries(PARTICLE_ASSET_MAP)) {
		setParticleTexture(name as ParticleName, texture(key));
	}
};

const needBoardFx = (): Container => {
	if (!boardFxLayer) throw new Error('fxManager: board FX layer not registered');
	refreshParticleTextures();
	return boardFxLayer;
};

const needOverlay = (): Container => {
	if (!overlayLayer) throw new Error('fxManager: overlay layer not registered');
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

const registerBoardFx = (container: Container) => {
	boardFxLayer = container;
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

const registerAvatar = (container: Container) => {
	const avatarTexture = texture('avatar');
	if (avatarTexture) {
		const main = stateLayoutDerived.mainLayout();
		// right side of the screen (board sits left), large and raised
		_avatar = new AvatarActor({
			app: app(),
			parent: container,
			texture: avatarTexture,
			x: main.width * 0.76, // moved in from the right (0.84) toward centre per Max
			y: main.height * 0.86,
			height: 560,
		});
		// reaction poses (img2img variants) — registered if present; the
		// avatar no-ops the pose swap when a variant is missing
		_avatar.setPoses({
			cheer: texture('avatarCheer'),
			wink: texture('avatarWink'),
		});
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
				trim: texture('bgFg'),
				effect: texture('bgEffect'),
				mist: texture('bgMist'),
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
			fontFamily: FONT_FAMILY,
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
			fontFamily: FONT_FAMILY,
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
	return _kanabo;
};

const ofuda = (): OfudaCharm => {
	if (!_ofuda) {
		_ofuda = new OfudaCharm({
			app: app(),
			effectsLayer: needBoardFx(),
			boardOrigin: boardOrigin(),
			symbolSize: SYMBOL_SIZE,
			fontFamily: FONT_FAMILY,
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
			fontFamily: FONT_FAMILY,
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
			fontFamily: FONT_FAMILY,
		});
	}
	return _wildLanding;
};

const symbolIdles = (): SymbolIdleManager => {
	if (!_symbolIdles) _symbolIdles = new SymbolIdleManager(app());
	return _symbolIdles;
};

// --- convenience helpers used by handlers/components ------------------------------

/** Win burst at a padded book-event position (visible cell centre). */
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
		symbol: undefined,
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
