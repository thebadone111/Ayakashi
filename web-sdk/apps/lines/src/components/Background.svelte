<script lang="ts">
	// Ayakashi living background — four PNG layers driven procedurally by
	// BackgroundAmbient (mist drift, glow flicker, embers, mood tinting).
	// Mood switching (base <-> freespin) happens in bookEventHandlerMap via
	// fxManager.backgroundMood().
	import { Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { fxManager } from '../game/fxManager';
	import FxHost from './FxHost.svelte';

	const context = getContext();

	// keep the ambient scene sized to the canvas
	$effect(() => {
		const sizes = context.stateLayoutDerived.canvasSizes();
		fxManager.backgroundResize(sizes.width, sizes.height);
	});
</script>

<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x000000} zIndex={-3} />

<FxHost zIndex={-2} onhost={(container) => fxManager.registerBackground(container)} />
