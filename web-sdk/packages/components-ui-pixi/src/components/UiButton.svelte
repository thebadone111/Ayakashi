<script lang="ts">
	import { Text, Rectangle } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';

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
		labelScale?: number;
	};

	const {
		icon,
		active,
		variant = 'dark',
		labelScale = 1.05,
		children: childrenFromParent,
		...buttonProps
	}: Props = $props();
</script>

<Button {...buttonProps}>
	{#snippet children({ center, hovered, pressed })}
		{@const w = buttonProps.sizes.width}
		{@const h = buttonProps.sizes.height}
		{@const radius = Math.min(w, h) * 0.28}
		{@const isDark = variant === 'dark'}
		{@const baseBg = isDark ? 0x140709 : 0xffffff}
		{@const hoverBg = isDark ? 0x2a1118 : 0xfff0cf}
		{@const activeBg = isDark ? 0x4a1a26 : 0xffd98a}
		{@const disabledBg = isDark ? 0x3a322c : 0xaaaaaa}
		{@const goldBorder = buttonProps.disabled
			? 0x8c7c5c
			: active
				? 0xffe9a8
				: hovered || pressed
					? 0xe0b56a
					: 0xb88a3f}
		{@const bg = buttonProps.disabled
			? disabledBg
			: active
				? activeBg
				: hovered || pressed
					? hoverBg
					: baseBg}

		<Rectangle
			{...center}
			anchor={0.5}
			width={w}
			height={h}
			borderRadius={radius}
			borderColor={isDark ? goldBorder : 0x000000}
			borderWidth={active ? 6 : 4}
			backgroundColor={bg}
		/>

		<Text
			{...center}
			anchor={0.5}
			text={i18nDerived[icon]()}
			style={{
				align: 'center',
				wordWrap: true,
				wordWrapWidth: w * 0.88,
				lineHeight: UI_BASE_FONT_SIZE * labelScale * 0.95,
				fontFamily: 'Yuji Syuku',
				fontWeight: '700',
				fontSize: UI_BASE_FONT_SIZE * labelScale,
				fill: isDark
					? buttonProps.disabled
						? 0xcabfa6
						: 0xfff4d6
					: 0x000000,
				stroke: isDark ? { color: 0x000000, width: 3 } : undefined,
			}}
		/>

		{@render childrenFromParent?.()}
	{/snippet}
</Button>
