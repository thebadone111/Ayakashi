import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';
import { stateBet, stateUi } from 'state-shared';

import { eventEmitter } from './eventEmitter';
import { playBookEvent } from './utils';
import { winLevelMap, type WinLevel, type WinLevelData } from './winLevelMap';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import { fxManager } from './fxManager';
import { BOARD_DIMENSIONS } from './constants';
import type { BookEvent, BookEventOfType, BookEventContext } from './typesBookEvent';
import type { Position } from './types';
import type { SoundName } from './sound';
import config from './config';

const winLevelSoundsPlay = ({ winLevelData }: { winLevelData: WinLevelData }) => {
	if (winLevelData?.alias === 'max') eventEmitter.broadcastAsync({ type: 'uiHide' });
	if (winLevelData?.sound?.sfx) {
		eventEmitter.broadcast({ type: 'soundOnce', name: winLevelData.sound.sfx });
	}
	if (winLevelData?.sound?.bgm) {
		eventEmitter.broadcast({ type: 'soundMusic', name: winLevelData.sound.bgm });
	}
	if (winLevelData?.type === 'big') {
		eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_bigwin_coinloop' });
	}
};

const winLevelSoundsStop = () => {
	eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_bigwin_coinloop' });
	if (stateBet.activeBetModeKey === 'SUPERSPIN' || stateGame.gameType === 'freegame') {
		// check if SUPERSPIN, when finishing a bet.
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
	} else {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
	}
	eventEmitter.broadcastAsync({ type: 'uiShow' });
};

const animateSymbols = async ({ positions }: { positions: Position[] }) => {
	eventEmitter.broadcast({ type: 'boardShow' });
	await eventEmitter.broadcastAsync({
		type: 'boardWithAnimateSymbols',
		symbolPositions: positions,
	});
};

/** Safe FX wrapper — animations must never break book playback. */
const tryFx = async (run: () => Promise<unknown> | unknown) => {
	try {
		await run();
	} catch (error) {
		console.warn('[fx]', error);
	}
};

// Escalating koto pluck per consecutive tumble win — resets each new spin.
let tumbleWinStep = 0;

// Once the 2000x cap is hit, the math book STILL contains the remaining free
// spins (it keeps simulating). That's not the intended experience — the round
// should end at max win. This flag makes every subsequent spin-visual event a
// no-op so the game stops "rolling" after wincap; the final total + outro still
// resolve. Reset per book in playBet via resetRoundFlags().
let winCapped = false;
export const resetRoundFlags = () => {
	winCapped = false;
	tumbleWinStep = 0;
};

export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	reveal: async (bookEvent: BookEventOfType<'reveal'>, { bookEvents }: BookEventContext) => {
		if (winCapped) return; // max win reached — stop spinning
		tumbleWinStep = 0;
		const isBonusGame = checkIsMultipleRevealEvents({ bookEvents });
		if (isBonusGame) {
			eventEmitter.broadcast({ type: 'stopButtonEnable' });
			recordBookEvent({ bookEvent });
		}

		stateGame.gameType = bookEvent.gameType;
		// Continuous rolling bed under the spin so it isn't dead silent; it fades
		// out (stops) the moment every reel has settled. finally{} guarantees the
		// loop can never get stranded if the spin rejects.
		eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_reel_spin' });
		try {
			await stateGameDerived.enhancedBoard.spin({
				revealEvent: bookEvent,
				paddingBoard: config.paddingReels[bookEvent.gameType],
			});
		} finally {
			eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_reel_spin' });
		}
		eventEmitter.broadcast({ type: 'soundScatterCounterClear' });
	},
	winInfo: async (bookEvent: BookEventOfType<'winInfo'>) => {
		if (winCapped) return;
		// (No generic blip here — it stacked on the escalating tumble koto and the
		// final win-level flourish, which was the main "soundboard" pile-up. The
		// per-cascade win sound is the koto in updateTumbleWin.)

		// ONE clear presentation cycle for all wins at once (no per-line repeats):
		// board dims with the winning cells spotlit, all payline traces draw
		// simultaneously, each cell bursts exactly once.
		// B2 guard: a win must never present on a padding row. Padded rows
		// 1..BOARD_DIMENSIONS.y are the visible board; anything outside (the top
		// padding row 0 or bottom padding row) is dropped so no highlight/line
		// can ever draw outside the frame / connect to a padding symbol.
		const isVisible = (p: Position) => {
			const v = fxManager.toVisible(p).row;
			return v >= 0 && v < BOARD_DIMENSIONS.y;
		};
		const wins = bookEvent.wins
			.map((win) => ({ ...win, positions: win.positions.filter(isVisible) }))
			.filter((win) => win.positions.length > 0);

		const uniquePositions: Position[] = [];
		const seen = new Set<string>();
		const symbolAt = new Map<string, string>();
		for (const win of wins) {
			for (const position of win.positions) {
				const key = `${position.reel}:${position.row}`;
				if (!seen.has(key)) {
					seen.add(key);
					uniquePositions.push(position);
					symbolAt.set(key, win.symbol);
				}
			}
		}

		await tryFx(() => fxManager.spotlightShow(uniquePositions.map(fxManager.toVisible)));
		const lineFx = tryFx(() =>
			Promise.all(
				wins.map((win) =>
					fxManager.paylineHighlight().showLine({
						positions: win.positions.map(fxManager.toVisible),
						lineIndex: win.meta.lineIndex,
					}),
				),
			),
		);
		const burstFx = tryFx(() =>
			Promise.all(
				uniquePositions.map((position) =>
					fxManager.winBurstAt(position, symbolAt.get(`${position.reel}:${position.row}`)),
				),
			),
		);
		await Promise.all([animateSymbols({ positions: uniquePositions }), lineFx, burstFx]);
		await tryFx(() => Promise.all([fxManager.paylineHighlight().clear(), fxManager.spotlightHide()]));
	},
	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
	},
	// Ayakashi: tumble — winning symbols (and X 3x3 areas) explode, board cascades
	tumbleBoard: async (bookEvent: BookEventOfType<'tumbleBoard'>) => {
		if (winCapped) return;
		// Oni Kanabo: if an X is among the exploding cells, play the club smash first
		const rawBoard = stateGameDerived.boardRaw();
		const exploderPositions = bookEvent.explodingSymbols.filter(
			(pos) => rawBoard[pos.reel]?.[pos.row]?.name === 'X',
		);
		if (exploderPositions.length > 0) console.info('[fx] kanabo smash x', exploderPositions.length);
		for (const exploderPos of exploderPositions) {
			const center = fxManager.toVisible(exploderPos);
			const affected = bookEvent.explodingSymbols
				.map(fxManager.toVisible)
				.filter(
					(pos) => Math.abs(pos.reel - center.reel) <= 1 && Math.abs(pos.row - center.row) <= 1,
				);
			await tryFx(() => fxManager.kanabo().playAt({ center, affected }));
		}

		eventEmitter.broadcast({ type: 'boardHide' });
		eventEmitter.broadcast({ type: 'tumbleBoardShow' });
		eventEmitter.broadcast({ type: 'tumbleBoardInit', addingBoard: bookEvent.newSymbols });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_wild_explode' });
		await eventEmitter.broadcastAsync({
			type: 'tumbleBoardExplode',
			explodingPositions: bookEvent.explodingSymbols,
		});
		eventEmitter.broadcast({ type: 'tumbleBoardRemoveExploded' });
		await eventEmitter.broadcastAsync({ type: 'tumbleBoardSlideDown' });
		eventEmitter.broadcast({
			type: 'boardSettle',
			board: stateGameDerived
				.tumbleBoardCombined()
				.map((tumbleReel) => tumbleReel.map((tumbleSymbol) => tumbleSymbol.rawSymbol)),
		});
		eventEmitter.broadcast({ type: 'tumbleBoardReset' });
		eventEmitter.broadcast({ type: 'tumbleBoardHide' });
		eventEmitter.broadcast({ type: 'boardShow' });
	},
	updateTumbleWin: async (bookEvent: BookEventOfType<'updateTumbleWin'>) => {
		if (winCapped) return;
		// escalating koto pluck — each consecutive tumble win climbs a step
		tumbleWinStep = Math.min(tumbleWinStep + 1, 5);
		eventEmitter.broadcast({
			type: 'soundOnce',
			name: `tumble_win_${tumbleWinStep}` as SoundName,
		});
		stateBet.winBookEventAmount = bookEvent.amount;
	},
	freeSpinTrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		// animate scatters
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		await animateSymbols({ positions: bookEvent.positions });
		// temple bell toll — full-screen bonus trigger
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await tryFx(() =>
			fxManager.bonusTrigger().play({
				scatterPositions: bookEvent.positions.map((position) =>
					fxManager.boardCellToCanvas(fxManager.toVisible(position)),
				),
			}),
		);
		await eventEmitter.broadcastAsync({ type: 'transition' });
		eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'jng_intro_fs' });
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinIntroUpdate',
			totalFreeSpins: bookEvent.totalFs,
		});
		stateGame.gameType = 'freegame';
		await tryFx(() => fxManager.backgroundMood('freespin'));
		eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		eventEmitter.broadcast({ type: 'boardFrameGlowShow' });
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		stateUi.freeSpinCounterShow = true;
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: undefined,
			total: bookEvent.totalFs,
		});
		stateUi.freeSpinCounterTotal = bookEvent.totalFs;
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerButtonShow' });
		eventEmitter.broadcast({ type: 'drawerFold' });
	},
	// Ayakashi: scatters during free spins add more spins
	freeSpinRetrigger: async (bookEvent: BookEventOfType<'freeSpinRetrigger'>) => {
		if (winCapped) return;
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		await animateSymbols({ positions: bookEvent.positions });
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		stateUi.freeSpinCounterShow = true;
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			total: bookEvent.totalFs,
		});
		stateUi.freeSpinCounterTotal = bookEvent.totalFs;
	},
	// Ayakashi: Ofuda Talismans multiply the awarded free spins
	fsMultiplier: async (bookEvent: BookEventOfType<'fsMultiplier'>) => {
		await tryFx(() =>
			Promise.all(
				bookEvent.positions.map((position) =>
					fxManager.ofuda().playAt({
						cell: fxManager.toVisible(position),
						multiplier: bookEvent.multiplier,
					}),
				),
			),
		);
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			total: bookEvent.totalFs,
		});
		stateUi.freeSpinCounterTotal = bookEvent.totalFs;
	},
	updateFreeSpin: async (bookEvent: BookEventOfType<'updateFreeSpin'>) => {
		if (winCapped) return; // freeze the FS counter after max win
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		stateUi.freeSpinCounterShow = true;
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: bookEvent.amount + 1,
			total: bookEvent.total,
		});
		stateUi.freeSpinCounterCurrent = bookEvent.amount + 1;
		stateUi.freeSpinCounterTotal = bookEvent.total;
	},
	freeSpinEnd: async (bookEvent: BookEventOfType<'freeSpinEnd'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];

		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		stateGame.gameType = 'basegame';
		await tryFx(() => fxManager.backgroundMood('base'));
		eventEmitter.broadcast({ type: 'boardFrameGlowHide' });
		eventEmitter.broadcast({ type: 'freeSpinOutroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_youwon_panel' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinOutroCountUp',
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'freeSpinOutroHide' });
		eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
		stateUi.freeSpinCounterShow = false;
		await eventEmitter.broadcastAsync({ type: 'transition' });
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerUnfold' });
		eventEmitter.broadcast({ type: 'drawerButtonHide' });
	},
	setWin: async (bookEvent: BookEventOfType<'setWin'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];

		eventEmitter.broadcast({ type: 'winShow' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'winUpdate',
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'winHide' });
	},
	// Ayakashi: max win (2000x) reached — spin actions end here. The math book
	// still contains the remaining free spins after this; winCapped suppresses
	// their visuals so the round ends on the max-win celebration.
	wincap: async (bookEvent: BookEventOfType<'wincap'>) => {
		const winLevelData = winLevelMap[10]; // 'max'

		eventEmitter.broadcast({ type: 'winShow' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'winUpdate',
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'winHide' });
		winCapped = true; // stop all subsequent spin visuals this round
	},
	finalWin: async (bookEvent: BookEventOfType<'finalWin'>) => {
		// Do nothing
	},
	// customised
	createBonusSnapshot: async (bookEvent: BookEventOfType<'createBonusSnapshot'>) => {
		const { bookEvents } = bookEvent;

		function findLastBookEvent<T>(type: T) {
			return _.findLast(bookEvents, (bookEvent) => bookEvent.type === type) as
				| BookEventOfType<T>
				| undefined;
		}

		const lastFreeSpinTriggerEvent = findLastBookEvent('freeSpinTrigger' as const);
		const lastUpdateFreeSpinEvent = findLastBookEvent('updateFreeSpin' as const);
		const lastSetTotalWinEvent = findLastBookEvent('setTotalWin' as const);

		if (lastFreeSpinTriggerEvent) await playBookEvent(lastFreeSpinTriggerEvent, { bookEvents });
		if (lastUpdateFreeSpinEvent) playBookEvent(lastUpdateFreeSpinEvent, { bookEvents });
		if (lastSetTotalWinEvent) playBookEvent(lastSetTotalWinEvent, { bookEvents });
	},
};
