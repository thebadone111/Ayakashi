<script lang="ts">
	// Sumi-ink wave wipe (procedural) — replaces the reference transition Spine.
	import { onMount } from 'svelte';

	import { fxManager } from '../game/fxManager';

	type Props = {
		oncomplete: () => void;
	};

	const props: Props = $props();

	onMount(() => {
		fxManager
			.transitionWipe()
			.play()
			.then(props.oncomplete)
			.catch((error) => {
				console.warn('[fx transition]', error);
				props.oncomplete();
			});
	});
</script>
