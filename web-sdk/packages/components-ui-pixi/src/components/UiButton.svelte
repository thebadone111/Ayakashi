<script lang="ts">
	import { Text } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';

	import UiSprite from './UiSprite.svelte';
	import type { ButtonIcon } from '../types';
	import type { Snippet } from 'svelte';
	import { i18nDerived } from '../i18n/i18nDerived';
	import { UI_BASE_FONT_SIZE } from '../constants';

	type Props = Omit<ButtonProps, 'children'> & {
		icon: ButtonIcon;
		sizes: { width: number; height: number };
		active?: boolean;
		children?: Snippet;
		variant?: 'dark' | 'light';
		/** Label/icon size as a multiple of UI_BASE_FONT_SIZE (default 0.8). Bump
		 *  it for single-glyph buttons like + / − that should read large. */
		labelScale?: number;
	};

	const {
		icon,
		active,
		variant = 'dark',
		labelScale = 0.8,
		children: childrenFromParent,
		...buttonProps
	}: Props = $props();
</script>

<Button {...buttonProps}>
	{#snippet children({ center, hovered, pressed })}
		<UiSprite
			{...center}
			anchor={0.5}
			width={buttonProps.sizes.width}
			height={buttonProps.sizes.height}
			key={variant === 'dark' ? 'base_button' : undefined}
			tint={buttonProps.disabled
				? 0x9a8f82
				: active
					? 0xffd98a
					: hovered || pressed
						? 0xfff0cf
						: 0xffffff}
			backgroundColor={variant === 'dark' ? 0x000000 : 0xffffff}
			{...buttonProps.disabled
				? {
						backgroundColor: 0xaaaaaa,
					}
				: {}}
			{...active
				? {
						borderWidth: 10,
						borderColor: variant === 'dark' ? 0xffffff : 0x000000,
					}
				: {}}
		/>

		<Text
			{...center}
			anchor={0.5}
			text={i18nDerived[icon]()}
			style={{
				align: 'center',
				wordWrap: true,
				// keep multi-word labels (AUTO SPIN, BUY BONUS) INSIDE the round
				// medallion: wrap to the button's own width instead of a fixed 200
				// (which was wider than the 150 disc, so they spilled the circle).
				wordWrapWidth: buttonProps.sizes.width * 0.8,
				lineHeight: UI_BASE_FONT_SIZE * labelScale * 0.95,
				fontFamily: 'Yuji Syuku',
				fontWeight: '600',
				fontSize: UI_BASE_FONT_SIZE * labelScale,
				fill: variant === 'dark'
					? buttonProps.disabled
						? 0xcabfa6
						: 0xfff4d6
					: 0x000000,
			}}
		/>

		{@render childrenFromParent?.()}
	{/snippet}
</Button>
