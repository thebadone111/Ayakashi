<script lang="ts">
	// Bespoke Ayakashi Buy Bonus modal.
	// Replaces the SDK's generic ModalBuyBonus. Renders TWO bespoke cards:
	//   1) BASE GAME  — torii gate art, "PLAY" closes back to spin
	//   2) YOKAI BONUS — kitsune avatar art, 100x cost, "BUY BONUS" CTA
	// Lacquer black panel, gold trim, brush-ink corner accents. Uses the same
	// stateBet/stateModal/eventEmitter wiring as the SDK modal so the engine
	// flow (activeBetModeKey -> /wallet/play) is unchanged.
	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import {
		stateBet,
		stateModal,
		stateBetDerived,
		stateConfig,
		stateMeta,
	} from 'state-shared';
	import { getContextEventEmitter } from 'utils-event-emitter';
	import { numberToCurrencyString } from 'utils-shared/amount';
	import { stateBonus } from 'components-ui-html/src/stateBonus.svelte';
	import type { EmitterEventModal } from 'components-ui-html/src/types';

	import toriiUrl from '../../static/assets/sprites/uiSlotsAssetsBespoke/torii.webp';
	import avatarUrl from '../../static/assets/sprites/avatar/avatar.webp';
	import brushUrl from '../../static/assets/sprites/particles/brush_wide.webp';

	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();

	const base = $derived(stateMeta.betModeMeta.base);
	const bonus = $derived(stateMeta.betModeMeta.bonus);

	const baseCost = $derived(stateBet.betAmount * (base?.costMultiplier ?? 1));
	const bonusCost = $derived(stateBet.betAmount * (bonus?.costMultiplier ?? 100));

	const canAffordBonus = $derived(
		stateBet.betAmount > 0 && stateBet.balanceAmount >= bonusCost,
	);

	// Bet stepping walks the operator bet levels (same behaviour as the betting
	// bar's increase/decrease buttons) instead of free halving/doubling, so the
	// bet can never leave the configured range.
	const atMinBet = $derived(stateBet.betAmount <= stateConfig.betAmountOptions[0]);
	const atMaxBet = $derived(
		stateBet.betAmount >= stateConfig.betAmountOptions[stateConfig.betAmountOptions.length - 1],
	);

	function stepBetDown() {
		const nextSmaller = [...stateConfig.betAmountOptions]
			.sort((a, b) => b - a)
			.find((option) => option < stateBet.betAmount);
		stateBetDerived.setBetAmount(nextSmaller ?? stateConfig.betAmountOptions[0]);
	}

	function stepBetUp() {
		const nextBigger = [...stateConfig.betAmountOptions]
			.sort((a, b) => a - b)
			.find((option) => option > stateBet.betAmount);
		stateBetDerived.setBetAmount(
			nextBigger ?? stateConfig.betAmountOptions[stateConfig.betAmountOptions.length - 1],
		);
	}

	function close() {
		stateModal.modal = null;
	}

	function play() {
		stateBet.activeBetModeKey = 'base';
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		close();
	}

	function buyBonus() {
		if (!canAffordBonus) return;
		stateBet.activeBetModeKey = 'bonus';
		// Sync the SDK's bonus picker so ModalBuyBonusConfirm can resolve the
		// mode meta (`betModeMeta[selectedBetModeKey]`). Our meta is keyed
		// lowercase, but stateBonus defaults to 'BASE' (uppercase) — without
		// this, the confirm dialog renders blank and the bet broadcast no-ops.
		stateBonus.selectedBetModeKey = 'bonus';
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		// Defer to SDK confirm dialog — second tap required (no accidental spend).
		eventEmitter.broadcast({ type: 'buyBonusConfirm' });
	}
</script>

{#if stateModal.modal?.name === 'buyBonus'}
	<Popup zIndex={zIndex.modal} onclose={close}>
		<div class="ayakashi-buy-bonus" role="dialog" aria-label="Buy Bonus">
			<header class="header">
				<div class="brush-strip" style:background-image="url({brushUrl})"></div>
				<h2 class="title">CHOOSE YOUR PATH</h2>
				<div class="brush-strip" style:background-image="url({brushUrl})"></div>
			</header>

			<div class="cards">
				<!-- BASE GAME CARD -->
				<article class="card card--base">
					<div class="card-art">
						<img src={toriiUrl} alt="" class="art-torii" />
					</div>
					<h3 class="card-title">BASE GAME</h3>
					<p class="card-desc">
						Spin the reels. Land 3+ scatter symbols to enter Free Spins.
					</p>
					<div class="price-row">
						<span class="price-label">PER SPIN</span>
						<span class="price">{numberToCurrencyString(baseCost)}</span>
					</div>
					<button class="cta cta--base" type="button" onclick={play}>
						PLAY
					</button>
				</article>

				<!-- YOKAI BONUS CARD -->
				<article class="card card--bonus" class:locked={!canAffordBonus}>
					<div class="badge">100×</div>
					<div class="card-art">
						<img src={avatarUrl} alt="" class="art-avatar" />
					</div>
					<h3 class="card-title">YOKAI BONUS</h3>
					<p class="card-desc">
						Skip the wait. Enter Free Spins directly with bonus reels
						active. Ofuda Talismans may multiply your spin count at
						trigger.
					</p>
					<p class="card-avg">Average win: ~96× your bet</p>
					<div class="price-row">
						<span class="price-label">BUY COST</span>
						<span class="price">{numberToCurrencyString(bonusCost)}</span>
					</div>
					<button
						class="cta cta--bonus"
						type="button"
						onclick={buyBonus}
						disabled={!canAffordBonus}
					>
						{canAffordBonus ? 'BUY BONUS' : 'INSUFFICIENT FUNDS'}
					</button>
				</article>
			</div>

			<footer class="footer">
				<button
					class="bet-step"
					type="button"
					onclick={stepBetDown}
					disabled={atMinBet}
					aria-label="Decrease bet"
				>
					−
				</button>
				<div class="bet-display">
					<span class="bet-label">BET</span>
					<span class="bet-value">{numberToCurrencyString(stateBet.betAmount)}</span>
				</div>
				<button
					class="bet-step"
					type="button"
					onclick={stepBetUp}
					disabled={atMaxBet}
					aria-label="Increase bet"
				>
					+
				</button>
			</footer>
		</div>
	</Popup>
{/if}

<style lang="scss">
	$ink: #0a0a12;
	$gold: #ffd24a;
	$gold-soft: #b88a2a;
	$ember: #ff6b1a;
	$red: #8b1a1a;

	.ayakashi-buy-bonus {
		position: relative;
		// The SDK Popup wraps content in a full-screen `.click-to-close-layer`
		// at z-index 2 to catch outside-clicks. Without an explicit stacking
		// context above it, every PLAY / BUY BONUS click hit the close layer
		// instead of our buttons. Matches the SDK convention (BaseContent uses
		// z-index 100).
		z-index: 100;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 1.25rem;
		width: min(820px, 92vw);
		max-height: 90vh;
		padding: 1.5rem 1.25rem 1.25rem;
		// Layered lacquer panel: deep ink wash + warm ember vignette + gold trim.
		background:
			radial-gradient(ellipse at top, rgba(255, 107, 26, 0.12), transparent 70%),
			linear-gradient(180deg, #0d0d18 0%, #050509 100%);
		border: 1px solid rgba($gold, 0.55);
		border-radius: 6px;
		box-shadow:
			inset 0 0 0 2px rgba($ink, 0.9),
			inset 0 0 0 3px rgba($gold, 0.25),
			0 30px 60px rgba(0, 0, 0, 0.7);
		font-family: 'Yuji Syuku', 'proxima-nova', sans-serif;
		color: #f1e4c0;
		overflow: hidden;

		// Corner brackets — gold L-shapes evoking the SDK ticker corners.
		&::before,
		&::after {
			content: '';
			position: absolute;
			width: 22px;
			height: 22px;
			border: 2px solid $gold;
			pointer-events: none;
		}
		&::before {
			top: 6px;
			left: 6px;
			border-right: none;
			border-bottom: none;
		}
		&::after {
			bottom: 6px;
			right: 6px;
			border-left: none;
			border-top: none;
		}
	}

	.header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		.brush-strip {
			flex: 1;
			height: 14px;
			background-size: 100% 100%;
			background-repeat: no-repeat;
			background-position: center;
			filter: drop-shadow(0 0 4px rgba($ember, 0.4));
			opacity: 0.55;
		}
		.title {
			margin: 0;
			font-size: 1.6rem;
			font-weight: 700;
			letter-spacing: 0.25em;
			color: $gold;
			text-shadow:
				0 0 8px rgba($ember, 0.6),
				1px 1px 0 $ink;
			white-space: nowrap;
		}
	}

	.cards {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		@media (max-width: 640px) {
			grid-template-columns: 1fr;
		}
	}

	.card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.65rem;
		padding: 1rem 1rem 1.1rem;
		background:
			linear-gradient(180deg, rgba(40, 18, 12, 0.95) 0%, rgba(10, 5, 4, 0.95) 100%);
		border: 1px solid rgba($gold, 0.4);
		border-radius: 4px;
		box-shadow: inset 0 0 0 1px rgba($ink, 0.9);
		transition: transform 0.18s ease, box-shadow 0.18s ease;

		&--bonus {
			background:
				radial-gradient(ellipse at top, rgba(255, 107, 26, 0.25), transparent 65%),
				linear-gradient(180deg, rgba(60, 16, 16, 0.95) 0%, rgba(15, 5, 5, 0.95) 100%);
			border-color: rgba($ember, 0.7);
			box-shadow:
				inset 0 0 0 1px rgba($ink, 0.9),
				0 0 24px rgba($ember, 0.25);
		}

		&:hover:not(.locked) {
			transform: translateY(-3px);
			box-shadow:
				inset 0 0 0 1px rgba($ink, 0.9),
				0 8px 24px rgba($ember, 0.35);
		}

		&.locked {
			opacity: 0.65;
		}
	}

	.badge {
		position: absolute;
		top: -10px;
		right: 12px;
		padding: 0.15rem 0.55rem;
		background: linear-gradient(180deg, $gold 0%, $gold-soft 100%);
		color: $ink;
		font-weight: 800;
		font-size: 0.95rem;
		letter-spacing: 0.05em;
		border-radius: 3px;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
	}

	.card-art {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 150px;
		width: 100%;
		.art-torii {
			max-height: 100%;
			max-width: 70%;
			filter: drop-shadow(0 4px 12px rgba($ember, 0.45));
		}
		.art-avatar {
			max-height: 100%;
			max-width: 75%;
			filter: drop-shadow(0 4px 16px rgba($ember, 0.5));
		}
	}

	.card-title {
		margin: 0.1rem 0 0;
		font-size: 1.15rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		color: $gold;
		text-shadow: 1px 1px 0 $ink;
	}

	.card-desc {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.3;
		text-align: center;
		color: #e8d8a8;
		min-height: 3.2rem;
		max-width: 22ch;
	}

	.card-avg {
		margin: 0;
		font-size: 0.78rem;
		letter-spacing: 0.06em;
		color: $gold;
		text-shadow: 1px 1px 0 $ink;
	}

	.price-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.6rem;
		width: 100%;
		padding: 0.45rem 0.6rem;
		background: rgba($ink, 0.7);
		border: 1px solid rgba($gold, 0.3);
		border-radius: 3px;
		.price-label {
			font-size: 0.68rem;
			letter-spacing: 0.15em;
			color: $gold-soft;
		}
		.price {
			font-size: 1.05rem;
			font-weight: 700;
			color: $gold;
		}
	}

	.cta {
		width: 100%;
		padding: 0.7rem 0.8rem;
		font-family: 'Yuji Syuku', sans-serif;
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: $ink;
		border: none;
		border-radius: 3px;
		cursor: pointer;
		transition: filter 0.15s, transform 0.1s;
		&--base {
			background: linear-gradient(180deg, #d9b25a 0%, #8b6a1f 100%);
		}
		&--bonus {
			background: linear-gradient(180deg, $ember 0%, $red 100%);
			color: #fff5d8;
			text-shadow: 1px 1px 0 rgba($ink, 0.7);
		}
		&:hover:not(:disabled) {
			filter: brightness(1.15);
		}
		&:active:not(:disabled) {
			transform: translateY(1px);
		}
		&:disabled {
			cursor: not-allowed;
			filter: grayscale(0.5) brightness(0.7);
		}
	}

	.footer {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		padding-top: 0.5rem;
		border-top: 1px solid rgba($gold, 0.25);
	}

	.bet-step {
		width: 2.5rem;
		height: 2.5rem;
		background: linear-gradient(180deg, #2a1612 0%, #110707 100%);
		border: 1px solid rgba($gold, 0.45);
		color: $gold;
		font-size: 1.4rem;
		font-weight: 700;
		border-radius: 50%;
		cursor: pointer;
		transition: filter 0.15s;
		&:hover:not(:disabled) {
			filter: brightness(1.3);
		}
		&:disabled {
			cursor: not-allowed;
			filter: grayscale(0.6) brightness(0.6);
		}
	}

	.bet-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 8rem;
		.bet-label {
			font-size: 0.7rem;
			letter-spacing: 0.2em;
			color: $gold-soft;
		}
		.bet-value {
			font-size: 1.1rem;
			font-weight: 700;
			color: $gold;
		}
	}
</style>
