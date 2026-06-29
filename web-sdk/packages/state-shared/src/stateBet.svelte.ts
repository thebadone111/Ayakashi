import type { BaseBet } from 'utils-bet';
import { stateMeta } from './stateMeta.svelte';

export type Currency = string;
export type BetToResume = BaseBet | null;
export type BetModeKey = string;

export const stateBet = $state({
	currency: 'USD' as Currency,
	balanceAmount: 0,
	betAmount: 1,
	wageredBetAmount: 1,
	betToResume: null as BetToResume,
	activeBetModeKey: 'BASE' as BetModeKey,
	winBookEventAmount: 0,
	autoSpinsLoss: 0,
	autoSpinsCounter: 0,
	autoSpinsLossLimitAmount: Infinity,
	autoSpinsSingleWinLimitAmount: Infinity,
	isSpaceHold: false,
	isTurbo: false,
	// 3 speed modes driven by the turbo button: 0 = normal, 1 = medium, 2 = fast.
	// `isTurbo` is kept as a derived mirror (speedMode > 0) so the shared
	// utils-slots engine (which only understands the boolean) keeps working,
	// while `speedMode` lets timeScale()/spinOptions distinguish medium vs fast.
	speedMode: 0,
});

const correctBetAmount = (value: number) => {
	if (value <= 0) return 0;
	const costMultiplier = betCostMultiplier();
	if (costMultiplier === 0) return 0;
	const max = stateBet.balanceAmount / costMultiplier;
	if (value >= max) return max;
	return value;
};

const setBetAmount = (value: number) => {
	stateBet.betAmount = correctBetAmount(value);
};

const updateBetAmount = (update: (value: number) => number) => {
	stateBet.betAmount = correctBetAmount(update(stateBet.betAmount));
};

let isTurboLocked = false;

const updateIsTurbo = (value: boolean, options: { persistent: boolean }) => {
	const { persistent } = options;

	if (!persistent && isTurboLocked) return;
	if (persistent) isTurboLocked = value;

	stateBet.isTurbo = value;
	// Note: the transient (persistent:false) path — e.g. holding the stop button
	// mid-spin — intentionally does NOT touch speedMode. It only forces the
	// boolean isTurbo for the engine's skip logic; the user's persistent
	// medium/fast selection (and the button icon) must survive a stop.
};

// Source of truth for the 3-state turbo button. Sets speedMode and mirrors it
// onto the boolean isTurbo the shared engine consumes.
const setSpeedMode = (mode: number, options: { persistent: boolean }) => {
	const clamped = ((mode % 3) + 3) % 3;
	stateBet.speedMode = clamped;
	updateIsTurbo(clamped > 0, options);
};

// Effective speed tier (1/2) including transient stop-button turbo: if turbo is
// forced on while the user's persistent tier is 0, treat it as "fast".
const effectiveSpeedMode = () =>
	stateBet.speedMode > 0 ? stateBet.speedMode : stateBet.isTurbo ? 2 : 0;

const activeBetMode = () => stateMeta.betModeMeta?.[stateBet.activeBetModeKey.toUpperCase()]
	?? stateMeta.betModeMeta?.[stateBet.activeBetModeKey.toLowerCase()]
	?? null;
const isContinuousBet = () => stateBet.autoSpinsCounter > 1 || stateBet.isSpaceHold;
// Win-presentation / animation speed multiplier. Mode 0 = real time,
// mode 1 (medium) = 2x, mode 2 (fast) = 4x. Falls back to the boolean for any
// turbo state set outside the button (speedMode mirrors isTurbo there anyway).
const TIME_SCALE_BY_MODE = [1, 2, 4];
const timeScale = () => TIME_SCALE_BY_MODE[effectiveSpeedMode()] ?? (stateBet.isTurbo ? 2 : 1);
const betCostMultiplier = () =>
	stateBetDerived.activeBetMode().type === 'activate'
		? stateBetDerived.activeBetMode().costMultiplier
		: 1;
const betCost = () => stateBet.betAmount * betCostMultiplier();
const isBetCostAvailable = () => betCost() > 0 && betCost() <= stateBet.balanceAmount;
const hasAutoBetCounter = () => stateBet.autoSpinsCounter !== 0;

export const stateBetDerived = {
	setBetAmount,
	updateBetAmount,
	updateIsTurbo,
	setSpeedMode,
	effectiveSpeedMode,
	activeBetMode,
	isContinuousBet,
	timeScale,
	betCost,
	isBetCostAvailable,
	hasAutoBetCounter,
};
