import _ from 'lodash';

import type { RawSymbol, SymbolState } from './types';

export const SYMBOL_SIZE = 80; // 5x5 board at 400x400 (-20% per Max's feedback)

export const REEL_PADDING = 0.53;

// Board placement as a fraction of the main layout — shared by boardLayout()
// and fxManager.boardOrigin(). Moved toward centre (0.34 -> 0.43) per Max so
// the reel frame sits more central; the avatar moves in from the right to match.
export const BOARD_ANCHOR = { x: 0.43, y: 0.52 };

// Frame assembly: frame_bg1 panel behind the reels, reel_frame.webp (new HQ
// cloud-FLUX ornate red/gold frame) on top. MEASURED (process-reel-frame.py):
// this frame's transparent square window is 72.8% x 68.8% of the art, so the
// frame is scaled up by 1/fraction to map the window onto the board.
export const FRAME_RATIOS = {
	width: 1 / 0.728,
	height: 1 / 0.688,
};

// 5x5 visible board + 1 padding row top and bottom = 7 symbols per reel.
const INITIAL_BOARD_NAMES = [
	['L2', 'L1', 'L4', 'H2', 'L1', 'L3', 'H4'],
	['H1', 'L5', 'L2', 'H3', 'L4', 'L1', 'L2'],
	['L3', 'L5', 'L3', 'H4', 'L4', 'L2', 'H2'],
	['H4', 'H3', 'L4', 'L5', 'L1', 'L3', 'L5'],
	['H3', 'L3', 'L3', 'H1', 'H1', 'L4', 'L1'],
] as const;

export const INITIAL_BOARD: RawSymbol[][] = INITIAL_BOARD_NAMES.map((reel) =>
	reel.map((name) => ({ name })),
);

export const BOARD_DIMENSIONS = { x: INITIAL_BOARD.length, y: INITIAL_BOARD[0].length - 2 };

export const BOARD_SIZES = {
	width: SYMBOL_SIZE * BOARD_DIMENSIONS.x,
	height: SYMBOL_SIZE * BOARD_DIMENSIONS.y,
};

export const BACKGROUND_RATIO = 2039 / 1000;
export const PORTRAIT_BACKGROUND_RATIO = 1242 / 2208;
const PORTRAIT_RATIO = 800 / 1422;
const LANDSCAPE_RATIO = 1600 / 900;
const DESKTOP_RATIO = 1422 / 800;

const DESKTOP_HEIGHT = 800;
const LANDSCAPE_HEIGHT = 900;
const PORTRAIT_HEIGHT = 1422;
export const DESKTOP_MAIN_SIZES = { width: DESKTOP_HEIGHT * DESKTOP_RATIO, height: DESKTOP_HEIGHT };
export const LANDSCAPE_MAIN_SIZES = {
	width: LANDSCAPE_HEIGHT * LANDSCAPE_RATIO,
	height: LANDSCAPE_HEIGHT,
};
export const PORTRAIT_MAIN_SIZES = {
	width: PORTRAIT_HEIGHT * PORTRAIT_RATIO,
	height: PORTRAIT_HEIGHT,
};

export const HIGH_SYMBOLS = ['H1', 'H2', 'H3', 'H4', 'H5'];

export const INITIAL_SYMBOL_STATE: SymbolState = 'static';

const HIGH_SYMBOL_SIZE = 0.9;
const LOW_SYMBOL_SIZE = 0.9;
const SPECIAL_SYMBOL_SIZE = 1;

// Tuned Ayakashi reel feel — heavier, weightier stop and a longer scatter
// tease than the SDK reference. This is the single source of truth read by
// stateGame's spinOptions plumbing.
export const SPIN_OPTIONS_DEFAULT = {
	reelPreSpinSpeed: 2.2,
	reelSpinSpeed: 3.4,
	reelBounceSizeMulti: 0.38, // weightier stop than reference 0.3
	reelBounceBackSpeed: 0.13,
	reelSpinSpeedBeforeBounce: 4.5,
	reelPaddingMultiplierNormal: 1.2,
	reelPaddingMultiplierAnticipated: 12, // long scatter tease
	reelSpinDelay: 145,
};

export const SPIN_OPTIONS_FAST = {
	reelPreSpinSpeed: 5,
	reelSpinSpeed: 5.5,
	reelBounceSizeMulti: 0.06,
	reelBounceBackSpeed: 0.15,
	reelSpinSpeedBeforeBounce: 5.5,
	reelPaddingMultiplierNormal: 1.2,
	reelPaddingMultiplierAnticipated: 6,
	reelSpinDelay: 70,
};

export const MOTION_BLUR_VELOCITY = 31;

export const zIndexes = {
	background: {
		backdrop: -3,
		normal: -2,
		feature: -1,
	},
};

// All symbol states are static sprites from the Ayakashi atlas.
// Motion (win pop, landing, explosion) is procedural — see game/fxManager.ts.
const spriteState = (assetKey: string, ratio = 0.92) =>
	({ type: 'sprite', assetKey, sizeRatios: { width: ratio, height: ratio } }) as const;

const makeSymbolInfo = (assetKey: string, ratio?: number) => {
	const state = spriteState(assetKey, ratio);
	return {
		static: state,
		spin: state,
		land: state,
		win: state,
		postWinStatic: state,
		explosion: state,
	} as const;
};

export const SYMBOL_INFO_MAP = {
	H1: makeSymbolInfo('h1.webp'),
	H2: makeSymbolInfo('h2.webp'),
	H3: makeSymbolInfo('h3.webp'),
	H4: makeSymbolInfo('h4.webp'),
	H5: makeSymbolInfo('h5.webp'), // not on current reels — kept for safety
	L1: makeSymbolInfo('l1.webp'),
	L2: makeSymbolInfo('l2.webp'),
	L3: makeSymbolInfo('l3.webp'),
	L4: makeSymbolInfo('l4.webp'),
	L5: makeSymbolInfo('l5.webp'),
	W: makeSymbolInfo('w.png', 1.0), // Kitsune Spirit Orb (wild)
	S: makeSymbolInfo('s.png', 1.0), // Temple Bell (scatter)
	M: makeSymbolInfo('x.png', 1.0), // Ofuda Talisman (free-spin multiplier)
	X: makeSymbolInfo('x2.png', 1.0), // Oni Kanabo (3x3 exploder)
} as const;

export const SCATTER_LAND_SOUND_MAP = {
	1: 'sfx_scatter_stop_1',
	2: 'sfx_scatter_stop_2',
	3: 'sfx_scatter_stop_3',
	4: 'sfx_scatter_stop_4',
	5: 'sfx_scatter_stop_5',
} as const;
