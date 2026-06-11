<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	// "TOTAL WIN" outro (procedural) — replaces the fsOutro Spine screen.
	// Win-level sounds are handled by the freeSpinEnd book event handler.
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import { fxManager } from '../game/fxManager';
	import PressToContinue from './PressToContinue.svelte';

	const context = getContext();

	let active = $state(false);

	context.eventEmitter.subscribeOnMount({
		freeSpinOutroShow: () => {
			// module draws its own stage when playOutro runs
		},
		freeSpinOutroHide: () => {
			// module dismisses itself when playOutro resolves
		},
		freeSpinOutroCountUp: async (emitterEvent) => {
			try {
				active = true;
				await fxManager.freeSpins().playOutro({
					amount: emitterEvent.amount,
					formatAmount: bookEventAmountToCurrencyString,
				});
			} catch (error) {
				console.warn('[fx fsOutro]', error);
			} finally {
				active = false;
			}
		},
	});
</script>

{#if active}
	<PressToContinue onpress={() => fxManager.freeSpins().press()} />
{/if}
