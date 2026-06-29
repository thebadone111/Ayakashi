<script lang="ts">
	import { stateUi, stateModal, stateSound } from 'state-shared';
	import { BLACK } from 'constants-shared/colors';
	import { MainContainer } from 'components-layout';
	import { Container, Rectangle, Text, anchorToPivot } from 'pixi-svelte';

	import { DESKTOP_BASE_SIZE, DESKTOP_BACKGROUND_WIDTH_LIST } from '../constants';
	import { getContext } from '../context';
	import type { LayoutUiProps } from '../types';

	const props: LayoutUiProps = $props();
	const context = getContext();

	const BAR_SCALE = 0.76;
	const canvasW = $derived(context.stateLayoutDerived.canvasSizes().width);
	const canvasH = $derived(context.stateLayoutDerived.canvasSizes().height);
</script>

<!-- Ground strip — full-width dark base to seat the bar against the game bg -->
<Rectangle
	x={canvasW * 0.5}
	y={canvasH}
	anchor={{ x: 0.5, y: 1 }}
	width={canvasW}
	height={160}
	backgroundColor={0x000005}
	alpha={0.58}
	eventMode="none"
/>

<Container x={20}>
	{@render props.gameName()}
</Container>

<Container x={context.stateLayoutDerived.canvasSizes().width - 20}>
	{@render props.logo()}
</Container>

<MainContainer standard alignVertical="bottom">
	<Container
		x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5}
		y={context.stateLayoutDerived.mainLayoutStandard().height - DESKTOP_BASE_SIZE * BAR_SCALE - 75}
		scale={BAR_SCALE}
		pivot={anchorToPivot({
			anchor: { x: 0.5, y: 0 },
			sizes: {
				height: DESKTOP_BASE_SIZE,
				width: DESKTOP_BACKGROUND_WIDTH_LIST.reduce((sum, width) => sum + width, 0),
			},
		})}
	>
		{@const TOTAL_WIDTH = DESKTOP_BACKGROUND_WIDTH_LIST.reduce((s, w) => s + w, 0)}
		{@const CENTER = TOTAL_WIDTH / 2}
		{@const MID = DESKTOP_BASE_SIZE * 0.5}
		{@const LABEL_Y = MID - 10}
		{@const BTN = 0.75}
		{@const HERO = 1.0}

		<!-- Pill: left edge at CENTER-640, right edge at CENTER+580 -->
		{@const PILL_L = 640}
		{@const PILL_R = 460}
		{@const PILL_W = PILL_L + PILL_R + 120}
		{@const PILL_CX = CENTER - PILL_L + PILL_W / 2}

		<!-- Dark pill — only behind the center cluster, NOT turbo or SPIN -->
		<Rectangle
			x={PILL_CX} y={MID}
			anchor={0.5}
			width={PILL_W} height={DESKTOP_BASE_SIZE * 1.08}
			backgroundColor={0x0a0a1e}
			alpha={0.90}
			borderRadius={DESKTOP_BASE_SIZE / 2}
			eventMode="none"
		/>

		<!-- ⚡ Turbo — outside pill, left -->
		<Container y={MID} x={CENTER - 700} scale={BTN}>
			{@render props.buttonTurbo({ anchor: 0.5 })}
		</Container>

		<!-- ☰ Menu — inside left pill cap -->
		<Container y={MID} x={CENTER - 540} scale={BTN * 0.9}>
			{@render props.buttonMenu({ anchor: 0.5 })}
		</Container>

		<!-- BALANCE | WIN | BET readouts — shifted right to clear menu -->
		<Container y={LABEL_Y} x={CENTER - 390}>
			{@render props.amountBalance({ stacked: true })}
		</Container>
		<Container y={LABEL_Y} x={CENTER - 155}>
			{@render props.amountWin({ stacked: true })}
		</Container>
		<Container y={LABEL_Y} x={CENTER + 80}>
			{@render props.amountBet({ stacked: true })}
		</Container>

		<!-- ▲ / ▼ stacked bet arrows — smaller, wider gap so they don't overlap -->
		<Container y={MID - 36} x={CENTER + 262} scale={0.38}>
			{@render props.buttonIncrease({ anchor: 0.5 })}
		</Container>
		<Container y={MID + 36} x={CENTER + 262} scale={0.38}>
			{@render props.buttonDecrease({ anchor: 0.5 })}
		</Container>

		<!-- AUTO — right of arrows, inside pill -->
		<Container y={MID} x={CENTER + 455} scale={BTN}>
			{@render props.buttonAutoSpin({ anchor: 0.5 })}
		</Container>

		<!-- SPIN — outside pill, hero element on the far right -->
		<Container y={MID} x={CENTER + 640} scale={HERO}>
			{@render props.buttonBet({ anchor: 0.5 })}
		</Container>
	</Container>
</MainContainer>

{#if stateUi.menuOpen}
	{@const ROW_H = 58}
	{@const PW = 280}
	{@const PH = ROW_H * 6 + 20}
	{@const MENU_FONT = { fontFamily: 'proxima-nova', fontWeight: '700', fontSize: 22, fill: 0xffffff } as const}
	{@const DIV = 0x252540}
	<!-- Panel anchored just above the menu button (left side of bar) -->
	{@const PANEL_X = 210}
	{@const PANEL_Y = canvasH - 80 - PH * 0.5}

	<Rectangle
		eventMode="static"
		cursor="pointer"
		alpha={0.55}
		anchor={0.5}
		backgroundColor={BLACK}
		width={canvasW}
		height={canvasH}
		x={canvasW * 0.5}
		y={canvasH * 0.5}
		onpointerup={() => (stateUi.menuOpen = false)}
	/>

	<Container x={PANEL_X} y={PANEL_Y}>
		<Rectangle anchor={0.5} width={PW} height={PH} backgroundColor={0x08081a} alpha={0.98} borderRadius={16} eventMode="none" />

		<!-- BUY BONUS -->
		<Rectangle y={-ROW_H * 2.5} anchor={0.5} width={PW} height={ROW_H} backgroundColor={0} alpha={0.001}
			eventMode="static" cursor="pointer"
			onpointerup={() => { stateModal.modal = { name: 'buyBonus' }; stateUi.menuOpen = false; }} />
		<Text y={-ROW_H * 2.5} anchor={0.5} text="BUY BONUS" eventMode="none"
			style={{ fontFamily: 'proxima-nova', fontWeight: '800', fontSize: 22, fill: 0xffd700 }} />
		<Rectangle y={-ROW_H * 2} anchor={0.5} width={PW - 32} height={1} backgroundColor={DIV} eventMode="none" />

		<!-- PAYTABLE -->
		<Rectangle y={-ROW_H * 1.5} anchor={0.5} width={PW} height={ROW_H} backgroundColor={0} alpha={0.001}
			eventMode="static" cursor="pointer"
			onpointerup={() => { stateModal.modal = { name: 'payTable' }; stateUi.menuOpen = false; }} />
		<Text y={-ROW_H * 1.5} anchor={0.5} text="PAYTABLE" eventMode="none" style={MENU_FONT} />
		<Rectangle y={-ROW_H} anchor={0.5} width={PW - 32} height={1} backgroundColor={DIV} eventMode="none" />

		<!-- INFO -->
		<Rectangle y={-ROW_H * 0.5} anchor={0.5} width={PW} height={ROW_H} backgroundColor={0} alpha={0.001}
			eventMode="static" cursor="pointer"
			onpointerup={() => { stateModal.modal = { name: 'gameRules' }; stateUi.menuOpen = false; }} />
		<Text y={-ROW_H * 0.5} anchor={0.5} text="INFO" eventMode="none" style={MENU_FONT} />
		<Rectangle y={0} anchor={0.5} width={PW - 32} height={1} backgroundColor={DIV} eventMode="none" />

		<!-- SETTINGS -->
		<Rectangle y={ROW_H * 0.5} anchor={0.5} width={PW} height={ROW_H} backgroundColor={0} alpha={0.001}
			eventMode="static" cursor="pointer"
			onpointerup={() => { stateModal.modal = { name: 'settings' }; stateUi.menuOpen = false; }} />
		<Text y={ROW_H * 0.5} anchor={0.5} text="SETTINGS" eventMode="none" style={MENU_FONT} />
		<Rectangle y={ROW_H} anchor={0.5} width={PW - 32} height={1} backgroundColor={DIV} eventMode="none" />

		<!-- SOUND -->
		<Rectangle y={ROW_H * 1.5} anchor={0.5} width={PW} height={ROW_H} backgroundColor={0} alpha={0.001}
			eventMode="static" cursor="pointer"
			onpointerup={() => {
				context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
				stateSound.volumeValueMaster = stateSound.volumeValueMaster === 0 ? 50 : 0;
			}} />
		<Text y={ROW_H * 1.5} anchor={0.5} eventMode="none"
			text={stateSound.volumeValueMaster === 0 ? 'SOUND OFF' : 'SOUND ON'}
			style={MENU_FONT} />
		<Rectangle y={ROW_H * 2} anchor={0.5} width={PW - 32} height={1} backgroundColor={DIV} eventMode="none" />

		<!-- EXIT -->
		<Rectangle y={ROW_H * 2.5} anchor={0.5} width={PW} height={ROW_H} backgroundColor={0} alpha={0.001}
			eventMode="static" cursor="pointer"
			onpointerup={() => (stateUi.menuOpen = false)} />
		<Text y={ROW_H * 2.5} anchor={0.5} text="EXIT" eventMode="none"
			style={{ fontFamily: 'proxima-nova', fontWeight: '700', fontSize: 22, fill: 0xff6b6b }} />
	</Container>
{/if}
