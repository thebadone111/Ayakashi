<script lang="ts">
	import { stateUi } from 'state-shared';
	import { BLACK } from 'constants-shared/colors';
	import { MainContainer } from 'components-layout';
	import { Container, Rectangle, anchorToPivot } from 'pixi-svelte';

	import { DESKTOP_BASE_SIZE, DESKTOP_BACKGROUND_WIDTH_LIST } from '../constants';
	import { getContext } from '../context';
	import type { LayoutUiProps } from '../types';

	const props: LayoutUiProps = $props();
	const context = getContext();

	// Ayakashi: compact betting bar
	const BAR_SCALE = 0.72;
</script>

<Container x={20}>
	{@render props.gameName()}
</Container>

<Container x={context.stateLayoutDerived.canvasSizes().width - 20}>
	{@render props.logo()}
</Container>

<MainContainer standard alignVertical="bottom">
	<Container
		x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5}
		y={context.stateLayoutDerived.mainLayoutStandard().height - DESKTOP_BASE_SIZE * BAR_SCALE - 8 - context.stateLayoutDerived.mainLayoutStandard().height * 0.05}
		scale={BAR_SCALE}
		pivot={anchorToPivot({
			anchor: { x: 0.5, y: 0 },
			sizes: {
				height: DESKTOP_BASE_SIZE,
				width: DESKTOP_BACKGROUND_WIDTH_LIST.reduce((sum, width) => sum + width, 0),
			},
		})}
	>
		<!-- Three readout columns (Balance | Win | Bet), evenly spaced and not
		     overlapping, each with its controls aligned directly beneath it.
		     Column centres are symmetric about the bar centre (CENTER). -->
		{@const CENTER = DESKTOP_BACKGROUND_WIDTH_LIST.reduce((s, w) => s + w, 0) / 2}
		{@const COL = 580}
		{@const COL_BAL = CENTER - COL}
		{@const COL_WIN = CENTER}
		{@const COL_BET = CENTER + COL}
		{@const ROW_TOP = DESKTOP_BASE_SIZE * 0.5 - 150}
		{@const ROW_BTM = DESKTOP_BASE_SIZE * 0.5 + 20}

		<!-- readouts -->
		<Container y={ROW_TOP} x={COL_BAL} scale={0.8}>
			{@render props.amountBalance({ stacked: true })}
		</Container>
		<Container y={ROW_TOP} x={COL_WIN} scale={0.8}>
			{@render props.amountWin({ stacked: true })}
		</Container>
		<Container y={ROW_TOP} x={COL_BET} scale={0.8}>
			{@render props.amountBet({ stacked: true })}
		</Container>

		<!-- under Balance: menu + buy bonus (wide pills, ±100 centers) -->
		<Container y={ROW_BTM} x={COL_BAL - 100} scale={0.8}>
			{@render props.buttonMenu({ anchor: 0.5 })}
		</Container>
		<Container y={ROW_BTM} x={COL_BAL + 100} scale={0.8}>
			{@render props.buttonBuyBonus({ anchor: 0.5 })}
		</Container>

		<!-- under Win: auto · SPIN (hero) · turbo (wider pills, ±195 centers) -->
		<Container y={ROW_BTM} x={COL_WIN - 195} scale={0.8}>
			{@render props.buttonAutoSpin({ anchor: 0.5 })}
		</Container>
		<Container y={ROW_BTM} x={COL_WIN} scale={0.96}>
			{@render props.buttonBet({ anchor: 0.5 })}
		</Container>
		<Container y={ROW_BTM} x={COL_WIN + 195} scale={0.8}>
			{@render props.buttonTurbo({ anchor: 0.5 })}
		</Container>

		<!-- under Bet: − / + -->
		<Container y={ROW_BTM} x={COL_BET - 82} scale={0.8}>
			{@render props.buttonDecrease({ anchor: 0.5 })}
		</Container>
		<Container y={ROW_BTM} x={COL_BET + 82} scale={0.8}>
			{@render props.buttonIncrease({ anchor: 0.5 })}
		</Container>
	</Container>
</MainContainer>

{#if stateUi.menuOpen}
	<Rectangle
		eventMode="static"
		cursor="pointer"
		alpha={0.5}
		anchor={0.5}
		backgroundColor={BLACK}
		width={context.stateLayoutDerived.canvasSizes().width}
		height={context.stateLayoutDerived.canvasSizes().height}
		x={context.stateLayoutDerived.canvasSizes().width * 0.5}
		y={context.stateLayoutDerived.canvasSizes().height * 0.5}
		onpointerup={() => (stateUi.menuOpen = false)}
	/>

	<MainContainer standard alignVertical="bottom">
		<Container
			x={298}
			y={context.stateLayoutDerived.mainLayoutStandard().height - DESKTOP_BASE_SIZE - 10}
		>
			<Container scale={0.8} y={DESKTOP_BASE_SIZE * 0.5 - 150 - 170 * 3}>
				{@render props.buttonPayTable({ anchor: 0.5 })}
			</Container>

			<Container scale={0.8} y={DESKTOP_BASE_SIZE * 0.5 - 150 - 170 * 2}>
				{@render props.buttonGameRules({ anchor: 0.5 })}
			</Container>

			<Container scale={0.8} y={DESKTOP_BASE_SIZE * 0.5 - 150 - 170 * 1}>
				{@render props.buttonSettings({ anchor: 0.5 })}
			</Container>

			<Container scale={0.8} y={DESKTOP_BASE_SIZE * 0.5 - 150}>
				{@render props.buttonSoundSwitch({ anchor: 0.5 })}
			</Container>

			<Container scale={0.8} y={DESKTOP_BASE_SIZE * 0.5}>
				{@render props.buttonMenuClose({ anchor: 0.5 })}
			</Container>
		</Container>
	</MainContainer>
{/if}
