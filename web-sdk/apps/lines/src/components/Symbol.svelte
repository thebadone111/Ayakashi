<script lang="ts">
	// All Ayakashi symbol states are static sprites — motion is procedural
	// (see game/fxManager.ts). The SymbolSpine path was removed with the
	// reference Spine assets.
	import SymbolSprite from './SymbolSprite.svelte';
	import { getSymbolInfo } from '../game/utils';
	import type { SymbolState, RawSymbol } from '../game/types';
	import { Text } from 'pixi-svelte';

	type Props = {
		x?: number;
		y?: number;
		state: SymbolState;
		rawSymbol: RawSymbol;
		oncomplete?: () => void;
		loop?: boolean;
	};

	const props: Props = $props();
	const symbolInfo = $derived(getSymbolInfo({ rawSymbol: props.rawSymbol, state: props.state }));
</script>

<SymbolSprite {symbolInfo} state={props.state} x={props.x} y={props.y} oncomplete={props.oncomplete} />

{#if props.rawSymbol.multiplier && props.rawSymbol.multiplier > 1}
	<!-- multiplier badge: real Text in a digit-capable font (the old 'gold'
	     bitmap font had no usable digits → "no numbers / weird X"). Anchored
	     bottom-right inside the cell so it never overhangs the frame. -->
	<Text
		anchor={{ x: 1, y: 1 }}
		x={(props.x ?? 0) + 52}
		y={(props.y ?? 0) + 56}
		text={`${props.rawSymbol.multiplier}X`}
		style={{
			fontFamily: 'Yuji Syuku',
			fontSize: 44,
			fontWeight: '900',
			fill: 0xffd24a,
			stroke: { color: 0x1a0d06, width: 6 },
			dropShadow: { color: 0x000000, blur: 4, distance: 2, alpha: 0.7 },
		}}
	/>
{/if}
