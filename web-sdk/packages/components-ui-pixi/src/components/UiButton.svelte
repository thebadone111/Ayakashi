<script lang="ts">
	import { Text, Sprite } from 'pixi-svelte';
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
		textSize?: number;
		iconKey?: string;
		iconRotation?: number;
		iconScale?: number;
	};

	const {
		icon,
		active,
		variant = 'dark',
		textSize,
		iconKey,
		iconRotation = 0,
		iconScale = 0.62,
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
			borderRadius={Math.min(buttonProps.sizes.width, buttonProps.sizes.height) / 2}
			backgroundColor={buttonProps.disabled ? 0x444455 : variant === 'dark' ? 0x2e2e48 : 0xffffff}
			borderWidth={active ? 8 : 2}
			borderColor={active ? 0xffd700 : 0x44446a}
		/>

		{#if iconKey}
			<Sprite
				{...center}
				key={iconKey}
				anchor={0.5}
				width={buttonProps.sizes.width * iconScale}
				height={buttonProps.sizes.height * iconScale}
				rotation={iconRotation}
				tint={buttonProps.disabled ? 0x666677 : 0xffffff}
			/>
		{:else}
			<Text
				{...center}
				anchor={0.5}
				text={i18nDerived[icon]()}
				style={{
					align: 'center',
					wordWrap: true,
					wordWrapWidth: 200,
					fontFamily: 'proxima-nova, "Segoe UI Symbol", "Segoe UI Emoji", sans-serif',
					fontWeight: '600',
					fontSize: textSize ?? UI_BASE_FONT_SIZE * 0.9,
					fill: buttonProps.disabled ? 0x888888 : variant === 'dark' ? 0xffffff : 0x000000,
				}}
			/>
		{/if}

		{@render childrenFromParent?.()}
	{/snippet}
</Button>
