<script lang="ts">
	// All symbols are sprites in Ayakashi; exploded symbols are filtered out
	// by TumbleBoard after the procedural explosion FX play.
	import Symbol from './Symbol.svelte';
	import SymbolWrap from './SymbolWrap.svelte';
	import { getSymbolX } from '../game/utils';
	import type { TumbleSymbol } from '../game/stateGame.svelte';

	type Props = {
		reelIndex: number;
		tumbleSymbol: TumbleSymbol;
	};

	const props: Props = $props();
</script>

{#if props.tumbleSymbol.symbolState !== 'explosion'}
	<SymbolWrap
		x={getSymbolX(props.reelIndex)}
		y={props.tumbleSymbol.symbolY.current}
		animating={false}
	>
		<Symbol
			state={props.tumbleSymbol.symbolState}
			rawSymbol={props.tumbleSymbol.rawSymbol}
			oncomplete={props.tumbleSymbol.oncomplete}
		/>
	</SymbolWrap>
{/if}
