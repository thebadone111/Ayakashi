<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';

	import { stateUi, stateModal, stateSound } from 'state-shared';
	import { BLACK } from 'constants-shared/colors';
	import { FadeContainer } from 'components-pixi';
	import { MainContainer } from 'components-layout';
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { waitForResolve } from 'utils-shared/wait';

	import LabelFreeSpinCounter from './LabelFreeSpinCounter.svelte';
	import ButtonDrawer from './ButtonDrawer.svelte';
	import type { LayoutUiProps } from '../types';
	import { getContext } from '../context';

	const props: LayoutUiProps = $props();
	const context = getContext();

	const canvasW = $derived(context.stateLayoutDerived.canvasSizes().width);
	const canvasH = $derived(context.stateLayoutDerived.canvasSizes().height);

	const DRAWER_Y = {
		unfold: 0,
		fold: 550,
	};
	const drawerTween = new Tween(stateUi.drawerFold ? DRAWER_Y.fold : DRAWER_Y.unfold, {
		easing: cubicInOut,
	});

	const DRAWER_BUTTON_Y = {
		unfold: 0,
		fold: 50,
	};
	const drawerButtonTween = new Tween(
		stateUi.drawerFold ? DRAWER_BUTTON_Y.fold : DRAWER_BUTTON_Y.unfold,
		{
			easing: cubicInOut,
		},
	);

	let drawerButtonFadeComplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		drawerButtonShow: async () => {
			if (!stateUi.drawerButtonShow) {
				stateUi.drawerButtonShow = true;
				await waitForResolve((resolve) => (drawerButtonFadeComplete = resolve));
			}
		},
		drawerButtonHide: async () => {
			if (stateUi.drawerButtonShow) {
				stateUi.drawerButtonShow = false;
				await waitForResolve((resolve) => (drawerButtonFadeComplete = resolve));
			}
		},
		drawerUnfold: async () => {
			if (stateUi.drawerFold) {
				drawerButtonTween.set(DRAWER_BUTTON_Y.unfold);
				await drawerTween.set(DRAWER_Y.unfold);
			}
		},
		drawerFold: async () => {
			if (!stateUi.drawerFold) {
				drawerButtonTween.set(DRAWER_BUTTON_Y.fold);
				await drawerTween.set(DRAWER_Y.fold);
			}
		},
	});
</script>

<Container x={20}>
	{@render props.gameName()}
</Container>

<Container x={context.stateLayoutDerived.canvasSizes().width - 20}>
	{@render props.logo()}
</Container>

<MainContainer standard alignVertical="bottom">
	<!-- drawer container -->
	<Container y={drawerTween.current}>
		<Container
			x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5 - 440}
			y={context.stateLayoutDerived.mainLayoutStandard().height - 400}
		>
			{@render props.buttonMenu({ anchor: 0.5 })}
		</Container>

		<Container
			x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5 + 440}
			y={context.stateLayoutDerived.mainLayoutStandard().height - 400}
		>
			{@render props.buttonBuyBonus({ anchor: 0.5 })}
		</Container>

		<Container
			x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5}
			y={context.stateLayoutDerived.mainLayoutStandard().height - 400}
		>
			{@render props.buttonBet({ anchor: 0.5 })}
		</Container>

		<Container
			x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5 - 250}
			y={context.stateLayoutDerived.mainLayoutStandard().height - 400}
		>
			{@render props.buttonAutoSpin({ anchor: 0.5 })}
		</Container>

		<Container
			x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5 + 250}
			y={context.stateLayoutDerived.mainLayoutStandard().height - 400}
		>
			{@render props.buttonTurbo({ anchor: 0.5 })}
		</Container>

		<Container
			x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5}
			y={context.stateLayoutDerived.mainLayoutStandard().height - 270}
		>
			{@render props.amountBalance({ stacked: true })}
		</Container>
	</Container>

	<Container y={Math.min(drawerTween.current, 350)}>
		<Container
			x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5}
			y={context.stateLayoutDerived.mainLayoutStandard().height - 670}
		>
			{@render props.amountWin({ stacked: true })}
		</Container>
	</Container>
</MainContainer>

<MainContainer standard alignVertical="bottom">
	{#if stateUi.freeSpinCounterShow}
		<Container
			x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5}
			y={context.stateLayoutDerived.mainLayoutStandard().height - 130}
		>
			<LabelFreeSpinCounter stacked />
		</Container>
	{:else}
		<Container
			x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5}
			y={context.stateLayoutDerived.mainLayoutStandard().height - 130}
		>
			{@render props.amountBet({ stacked: true })}
		</Container>

		<Container
			x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5 - 390}
			y={context.stateLayoutDerived.mainLayoutStandard().height - 85}
		>
			{@render props.buttonDecrease({ anchor: 0.5 })}
		</Container>

		<Container
			x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5 + 390}
			y={context.stateLayoutDerived.mainLayoutStandard().height - 85}
		>
			{@render props.buttonIncrease({ anchor: 0.5 })}
		</Container>
	{/if}

	<!-- drawer button -->
	<FadeContainer
		persistent
		show={stateUi.drawerButtonShow}
		oncomplete={drawerButtonFadeComplete}
		y={drawerButtonTween.current}
	>
		<Container
			x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5 + 440}
			y={context.stateLayoutDerived.mainLayoutStandard().height - 105}
		>
			<ButtonDrawer disabled={!stateUi.drawerButtonShow} anchor={0.5} />
		</Container>
	</FadeContainer>
</MainContainer>

{#if stateUi.menuOpen}
	{@const ROW_H = 72}
	{@const PW = Math.min(canvasW - 60, 340)}
	{@const PH = ROW_H * 6 + 24}
	{@const MENU_FONT = { fontFamily: 'proxima-nova', fontWeight: '700', fontSize: 27, fill: 0xffffff } as const}
	{@const DIV = 0x252540}

	<!-- Backdrop — tap outside to close -->
	<Rectangle
		eventMode="static"
		cursor="pointer"
		alpha={0.65}
		anchor={0.5}
		backgroundColor={BLACK}
		width={canvasW}
		height={canvasH}
		x={canvasW * 0.5}
		y={canvasH * 0.5}
		onpointerup={() => (stateUi.menuOpen = false)}
	/>

	<!-- Panel -->
	<Container x={canvasW * 0.5} y={canvasH * 0.5}>
		<Rectangle anchor={0.5} width={PW} height={PH} backgroundColor={0x08081a} alpha={0.98} borderRadius={20} eventMode="none" />

		<!-- BUY BONUS -->
		<Rectangle y={-ROW_H * 2.5} anchor={0.5} width={PW} height={ROW_H} backgroundColor={0} alpha={0.001}
			eventMode="static" cursor="pointer"
			onpointerup={() => { stateModal.modal = { name: 'buyBonus' }; stateUi.menuOpen = false; }} />
		<Text y={-ROW_H * 2.5} anchor={0.5} text="BUY BONUS" eventMode="none"
			style={{ fontFamily: 'proxima-nova', fontWeight: '800', fontSize: 27, fill: 0xffd700 }} />
		<Rectangle y={-ROW_H * 2} anchor={0.5} width={PW - 40} height={1} backgroundColor={DIV} eventMode="none" />

		<!-- PAYTABLE -->
		<Rectangle y={-ROW_H * 1.5} anchor={0.5} width={PW} height={ROW_H} backgroundColor={0} alpha={0.001}
			eventMode="static" cursor="pointer"
			onpointerup={() => { stateModal.modal = { name: 'payTable' }; stateUi.menuOpen = false; }} />
		<Text y={-ROW_H * 1.5} anchor={0.5} text="PAYTABLE" eventMode="none" style={MENU_FONT} />
		<Rectangle y={-ROW_H} anchor={0.5} width={PW - 40} height={1} backgroundColor={DIV} eventMode="none" />

		<!-- INFO -->
		<Rectangle y={-ROW_H * 0.5} anchor={0.5} width={PW} height={ROW_H} backgroundColor={0} alpha={0.001}
			eventMode="static" cursor="pointer"
			onpointerup={() => { stateModal.modal = { name: 'gameRules' }; stateUi.menuOpen = false; }} />
		<Text y={-ROW_H * 0.5} anchor={0.5} text="INFO" eventMode="none" style={MENU_FONT} />
		<Rectangle y={0} anchor={0.5} width={PW - 40} height={1} backgroundColor={DIV} eventMode="none" />

		<!-- SETTINGS -->
		<Rectangle y={ROW_H * 0.5} anchor={0.5} width={PW} height={ROW_H} backgroundColor={0} alpha={0.001}
			eventMode="static" cursor="pointer"
			onpointerup={() => { stateModal.modal = { name: 'settings' }; stateUi.menuOpen = false; }} />
		<Text y={ROW_H * 0.5} anchor={0.5} text="SETTINGS" eventMode="none" style={MENU_FONT} />
		<Rectangle y={ROW_H} anchor={0.5} width={PW - 40} height={1} backgroundColor={DIV} eventMode="none" />

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
		<Rectangle y={ROW_H * 2} anchor={0.5} width={PW - 40} height={1} backgroundColor={DIV} eventMode="none" />

		<!-- EXIT -->
		<Rectangle y={ROW_H * 2.5} anchor={0.5} width={PW} height={ROW_H} backgroundColor={0} alpha={0.001}
			eventMode="static" cursor="pointer"
			onpointerup={() => (stateUi.menuOpen = false)} />
		<Text y={ROW_H * 2.5} anchor={0.5} text="EXIT" eventMode="none"
			style={{ fontFamily: 'proxima-nova', fontWeight: '700', fontSize: 27, fill: 0xff6b6b }} />
	</Container>
{/if}
