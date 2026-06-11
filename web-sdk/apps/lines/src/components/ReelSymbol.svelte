<script lang="ts">
	import Symbol from './Symbol.svelte';
	import SymbolWrap from './SymbolWrap.svelte';
	import { getSymbolX } from '../game/utils';
	import type { ReelSymbol } from '../game/stateGame.svelte';
	import { fxManager } from '../game/fxManager';

	type Props = {
		reelIndex: number;
		reelSymbol: ReelSymbol;
	};

	const props: Props = $props();

	// Kitsune orb impact when a Wild lands (procedural, replaces the
	// wild_dynamite_land Spine state). Fires once per land.
	let wildLandPlayed = $state(false);
	$effect(() => {
		const isLanding = props.reelSymbol.symbolState === 'land';
		if (!isLanding) {
			wildLandPlayed = false;
			return;
		}
		if (wildLandPlayed || props.reelSymbol.rawSymbol.name !== 'W') return;
		wildLandPlayed = true;
		try {
			const origin = fxManager.boardOrigin();
			void fxManager.wildLanding().playAt({
				x: origin.x + getSymbolX(props.reelIndex),
				y: origin.y + props.reelSymbol.symbolY(),
				multiplier: props.reelSymbol.rawSymbol.multiplier,
			});
		} catch (error) {
			console.warn('[fx wildLand]', error);
		}
	});
</script>

<SymbolWrap
	x={getSymbolX(props.reelIndex)}
	y={props.reelSymbol.symbolY()}
	animating={props.reelSymbol.symbolState === 'land' || props.reelSymbol.symbolState === 'win'}
>
	<Symbol
		state={props.reelSymbol.symbolState}
		rawSymbol={props.reelSymbol.rawSymbol}
		oncomplete={() => {
			if (props.reelSymbol.symbolState === 'win') props.reelSymbol.oncomplete();
			if (props.reelSymbol.symbolState === 'land') props.reelSymbol.symbolState = 'static';
		}}
	/>
</SymbolWrap>
