<script lang="ts" module>
	import type { RawSymbol, Position } from '../game/types';

	export type EmitterEventBoard =
		| { type: 'boardSettle'; board: RawSymbol[][] }
		| { type: 'boardShow' }
		| { type: 'boardHide' }
		| {
				type: 'boardWithAnimateSymbols';
				symbolPositions: Position[];
		  };
</script>

<script lang="ts">
	import { waitForResolve } from 'utils-shared/wait';
	import { BoardContext } from 'components-shared';

	import { getContext } from '../game/context';
	import BoardContainer from './BoardContainer.svelte';
	import BoardMask from './BoardMask.svelte';
	import BoardBase from './BoardBase.svelte';

	const context = getContext();

	let show = $state(true);

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => context.stateGameDerived.enhancedBoard.stop(),
		boardSettle: ({ board }) => context.stateGameDerived.enhancedBoard.settle(board),
		boardShow: () => (show = true),
		boardHide: () => (show = false),
		boardWithAnimateSymbols: async ({ symbolPositions }) => {
			const getPromises = () =>
				symbolPositions.map(async (position) => {
					const reelSymbol = context.stateGame.board[position.reel]?.reelState.symbols[position.row];
					if (!reelSymbol) return; // guard: never await a missing cell
					reelSymbol.symbolState = 'win';
					// Gate on the symbol's oncomplete, but NEVER let book playback hang
					// on it — race a hard timeout so a stuck win animation can't freeze
					// the game (this was the jackpot/freespin freeze). 3600ms clears the
					// ~3.3s Wan win flipbook with margin; it's a hang guard, not a pace.
					await Promise.race([
						waitForResolve((resolve) => (reelSymbol.oncomplete = resolve)),
						new Promise((resolve) => setTimeout(resolve, 3600)),
					]);
					reelSymbol.symbolState = 'postWinStatic';
				});

			await Promise.all(getPromises());
		},
	});

	context.stateGameDerived.enhancedBoard.readyToSpinEffect();
</script>

{#if show}
	<BoardContext animate={false}>
		<BoardContainer>
			<BoardMask />
			<BoardBase />
		</BoardContainer>
	</BoardContext>

	<BoardContext animate={true}>
		<BoardContainer>
			<!-- Round 4c (Max): the animating layer was UNMASKED, so spinning /
			     landing symbols spilled above & below the reel frame. Mask it to the
			     window like the static layer so all motion stays inside the frame. -->
			<BoardMask />
			<BoardBase />
		</BoardContainer>
	</BoardContext>
{/if}
