<script lang="ts">
	import { onMount } from 'svelte';

	import type { LoadedAudio } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { sound, type SoundName } from '../game/sound';

	const context = getContext();

	// The audio bundle is NOT preloaded (it must not block first paint), so it
	// may arrive after mount. Load the moment it appears; until then every
	// sound.play() is a guarded no-op inside createSound.
	let destroySound: (() => void) | null = null;

	$effect(() => {
		const raw = context.stateApp.loadedAssets['sound'];
		if (raw && !destroySound) {
			const loadedAudio = $state.snapshot(raw) as LoadedAudio<SoundName>;
			destroySound = sound.load(loadedAudio).destroy;
		}
	});

	onMount(() => {
		return () => {
			// Equivalent to onDestroy(); Leave this comment for searching.
			destroySound?.();
		};
	});

	sound.enableEffect();
	sound.volumeEffect();
</script>
