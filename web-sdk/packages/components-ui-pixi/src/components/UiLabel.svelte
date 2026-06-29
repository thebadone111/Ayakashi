<script lang="ts">
	import { Text } from 'pixi-svelte';
	import { WHITE } from 'constants-shared/colors';

	import { UI_BASE_FONT_SIZE } from '../constants';

	type Props = {
		label: string;
		value: string;
		tiled?: boolean;
		stacked?: boolean;
	};

	const props: Props = $props();

	const labelStyle = {
		fontFamily: 'proxima-nova',
		fontSize: UI_BASE_FONT_SIZE * 0.62,
		fill: 0x8888aa,
		letterSpacing: 1,
	} as const;

	const valueStyle = {
		fontFamily: 'proxima-nova',
		fontWeight: '700',
		fontSize: UI_BASE_FONT_SIZE * 1.05,
		fill: WHITE,
	} as const;
</script>

{#if props.stacked}
	<Text anchor={{ x: 0.5, y: 1 }} text={props.label} style={labelStyle} y={-4} />
	<Text anchor={{ x: 0.5, y: 0 }} text={props.value} style={valueStyle} y={4} />
{:else}
	<Text anchor={{ x: 0, y: 0.5 }} text={props.label} style={labelStyle} />
	<Text
		anchor={{ x: 1, y: 0.5 }}
		text={props.value}
		style={valueStyle}
		x={UI_BASE_FONT_SIZE * 10}
	/>
{/if}
