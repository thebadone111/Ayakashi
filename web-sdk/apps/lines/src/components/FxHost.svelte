<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { onMount, type Snippet } from 'svelte';
	import { getContextParent, createContextParent } from 'pixi-svelte';

	type Props = {
		/**
		 * Receives the raw PIXI container on mount. Return a cleanup function
		 * to run on unmount (the container itself is destroyed by pixi-svelte
		 * afterwards).
		 */
		onhost?: (container: PIXI.Container) => (() => void) | void;
		zIndex?: number;
		children?: Snippet;
	};

	const props: Props = $props();
	const parentContext = getContextParent();
	const container = new PIXI.Container();

	if (props.zIndex !== undefined) container.zIndex = props.zIndex;
	parentContext.addToParent(container);
	createContextParent(container);

	onMount(() => {
		const cleanup = props.onhost?.(container);
		return () => cleanup?.();
	});
</script>

{#if props.children}
	{@render props.children()}
{/if}
