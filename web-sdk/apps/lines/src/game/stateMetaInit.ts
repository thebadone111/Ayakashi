// Ayakashi bet-mode meta — overrides the SDK's 6-mode demo default
// (BASE/ANTE/SUPERANTE/SUPERSPIN/BONUS/SUPER). Our math `index.json` only
// declares `base` and `bonus` (lowercase), so any other mode key, or the
// wrong case, fails the engine's `/wallet/play` validation with ERR_VAL.
//
// Run once from setContext() before any UI mounts.
import { stateMeta, stateBet, type BetModeData } from 'state-shared';

const EMPTY_ASSETS = {
	icon: '',
	dialogImage: '',
	dialogVolatility: '',
	volatility: '',
	button: '',
};

const BASE: BetModeData = {
	mode: 'base',
	costMultiplier: 1,
	type: 'default',
	parent: '',
	children: '',
	assets: EMPTY_ASSETS,
	text: {
		title: 'BASE GAME',
		dialog: '',
		button: '',
		betAmountLabel: 'BET',
		tickerIdle: 'PLACE YOUR BET',
		tickerSpin: 'GOOD LUCK',
	},
	maxWin: 2000,
};

const BONUS: BetModeData = {
	mode: 'bonus',
	costMultiplier: 100,
	type: 'buy',
	parent: '',
	children: '',
	assets: EMPTY_ASSETS,
	text: {
		title: 'YOKAI BONUS',
		dialog:
			'Buy your way into the Yokai Bonus for 100× your bet. Triggers Free Spins with an active Global Multiplier that can climb as kitsune wilds land.',
		description: 'Skip the wait — enter Free Spins immediately.',
		button: 'BUY BONUS',
		tickerIdle: 'PLACE YOUR BET',
		tickerSpin: 'YOKAI BONUS ACTIVE',
	},
	maxWin: 2000,
};

export const initBetModeMeta = () => {
	stateMeta.betModeMeta = { base: BASE, bonus: BONUS };
	stateBet.activeBetModeKey = 'base';
};
