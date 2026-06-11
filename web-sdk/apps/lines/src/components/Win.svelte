<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventWin =
		| { type: 'winShow' }
		| { type: 'winHide' }
		| { type: 'winUpdate'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	// Win presentation.
	// big tiers (BIG/SUPER/MEGA/EPIC/MAX) → procedural WinCelebration
	// small/medium tiers → simple count-up text (as reference behaviour)
	import { Container } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider, ResponsiveBitmapText } from 'components-pixi';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';

	import WinCoins from './WinCoins.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import { SYMBOL_SIZE } from '../game/constants';
	import { getContext } from '../game/context';
	import { fxManager } from '../game/fxManager';
	import type { BigWinAlias } from '../game/animations';

	const context = getContext();

	const BIG_ALIASES = ['big', 'superwin', 'mega', 'epic', 'max'] as const;

	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let bigWinActive = $state(false);
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		winShow: () => (show = true),
		winHide: () => (show = false),
		winUpdate: async (emitterEvent) => {
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;

			if (
				winLevelData.type === 'big' &&
				(BIG_ALIASES as readonly string[]).includes(winLevelData.alias)
			) {
				// cinematic celebration — module renders its own overlay
				show = false;
				bigWinActive = true;
				try {
					await fxManager.winCelebration().play({
						level: winLevelData.alias as BigWinAlias,
						amount: emitterEvent.amount,
						formatAmount: bookEventAmountToCurrencyString,
						duration: winLevelData.presentDuration,
					});
				} catch (error) {
					console.warn('[fx bigwin]', error);
				} finally {
					bigWinActive = false;
				}
				return;
			}

			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

{#if bigWinActive}
	<PressToContinue onpress={() => fxManager.winCelebration().skip()} />
{/if}

<FadeContainer {show}>
	{#if winLevelData}
		{@const duration = winLevelData.presentDuration}
		<WinCountUpProvider {amount} {duration} oncomplete={() => onCountUpComplete()}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				<OnMount
					onmount={async () => {
						await startCountUp();
						await waitForTimeout(120);
						oncomplete();
					}}
				/>

				<MainContainer>
					<Container
						x={context.stateGameDerived.boardLayout().x}
						y={context.stateGameDerived.boardLayout().y}
					>
						<ResponsiveBitmapText
							anchor={0.5}
							maxWidth={context.stateLayoutDerived.canvasSizes().width /
								context.stateLayoutDerived.mainLayout().scale}
							text={bookEventAmountToCurrencyString(countUpAmount)}
							style={{
								fontFamily: 'gold',
								fontSize: SYMBOL_SIZE,
								align: 'center',
								fontWeight: 'bold',
								letterSpacing: 0,
							}}
						/>
					</Container>
				</MainContainer>

				<WinCoins emit={!countUpCompleted} levelAlias={winLevelData?.alias} />

				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
