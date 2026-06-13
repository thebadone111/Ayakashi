<script lang="ts" module>
	import { Rectangle, type RectangleProps } from 'pixi-svelte';

	export type Props = RectangleProps & {
		/**
		 * Optional themed texture key. When the matching asset is loaded we render
		 * the bespoke Ayakashi lacquer sprite; otherwise we fall back to the
		 * procedural rounded plate (so games without the asset still work).
		 */
		key?: string;
		/** Sprite tint (sprite path only) — drives per-state colouring. */
		tint?: number;
	};
</script>

<script lang="ts">
	import { Sprite, getContextApp } from 'pixi-svelte';

	const { key, tint, backgroundColor, borderColor, borderWidth, borderRadius, ...rest }: Props =
		$props();

	const context = getContextApp();
	const texture = $derived(key ? context.stateApp.loadedAssets?.[key] : undefined);
</script>

{#if key && texture}
	<Sprite {key} tint={tint ?? 0xffffff} {...rest} />
{:else}
	<Rectangle
		borderRadius={borderRadius ?? 50}
		{backgroundColor}
		{borderColor}
		{borderWidth}
		{...rest}
	/>
{/if}
