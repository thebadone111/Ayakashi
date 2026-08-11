<script lang="ts">
	// 2026-07-03: the MM_pressanywhere bitmap (reference-game asset) is gone —
	// this renders live brush text in Yuji Syuku instead, matching every other
	// text element in the game.
	import { MainContainer, OnPressFullScreen } from 'components-layout';
	import { OnHotkey } from 'components-shared';
	import { Text } from 'pixi-svelte';

	import { getContext } from '../game/context';

	type Props = {
		onpress: () => void;
	};

	const props: Props = $props();
	const context = getContext();
</script>

<MainContainer alignVertical="bottom">
	<Text
		text={'PRESS ANYWHERE TO CONTINUE'}
		anchor={{ x: 0.5, y: 1 }}
		x={context.stateLayoutDerived.mainLayout().width * 0.5}
		y={context.stateLayoutDerived.mainLayout().height - 24}
		style={{
			fontFamily: 'Yuji Syuku',
			fontSize: 42,
			fontWeight: '900',
			letterSpacing: 6,
			fill: 0xffd24a,
			stroke: { color: 0x1a0d06, width: 6 },
			dropShadow: { color: 0x000000, blur: 6, distance: 2, alpha: 0.7 },
		}}
	/>
</MainContainer>
<OnHotkey hotkey="Space" onpress={() => props.onpress()} />
<OnPressFullScreen onpress={() => props.onpress()} />
