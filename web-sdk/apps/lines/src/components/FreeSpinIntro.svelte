<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	// Torii-gate Free Spins intro (procedural) — replaces the fsIntro Spine
	// screen. The FreeSpinsScreen module shows/dismisses itself; this wrapper
	// just maps the emitter contract onto it. Resolves on player press (or
	// auto-dismiss timeout inside the module).
	import { getContext } from '../game/context';
	import { fxManager } from '../game/fxManager';
	import PressToContinue from './PressToContinue.svelte';

	const context = getContext();

	let active = $state(false);

	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => {
			// module draws its own stage when playIntro runs
		},
		freeSpinIntroHide: () => {
			// module dismisses itself when playIntro resolves
		},
		freeSpinIntroUpdate: async (emitterEvent) => {
			try {
				active = true;
				await fxManager.freeSpins().playIntro({ totalFreeSpins: emitterEvent.totalFreeSpins });
			} catch (error) {
				console.warn('[fx fsIntro]', error);
			} finally {
				active = false;
			}
		},
	});
</script>

{#if active}
	<PressToContinue onpress={() => fxManager.freeSpins().press()} />
{/if}
