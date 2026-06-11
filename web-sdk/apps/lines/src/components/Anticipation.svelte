<script lang="ts">
	// Scatter anticipation — spectral glow column behind the spinning reel
	// (procedural, replaces the anticipation Spine).
	import { onMount } from 'svelte';

	import type { Reel } from '../game/stateGame.svelte';
	import { fxManager } from '../game/fxManager';

	type Props = {
		reel: Reel;
		oncomplete: () => void;
	};

	const props: Props = $props();

	onMount(() => {
		try {
			fxManager.reelSpinFx().startAnticipation(props.reel.reelIndex);
		} catch (error) {
			console.warn('[fx anticipation]', error);
		}

		return () => {
			try {
				fxManager.reelSpinFx().stopAnticipation(props.reel.reelIndex);
			} catch {
				// layer already gone
			}
		};
	});

	$effect(() => {
		if (props.reel.reelState.motion === 'stopped') {
			try {
				fxManager.reelSpinFx().stopAnticipation(props.reel.reelIndex);
			} catch {
				// layer already gone
			}
			props.oncomplete();
		}
	});
</script>
