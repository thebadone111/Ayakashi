<script lang="ts">
	import { Text, Rectangle } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { stateModal, stateBet, stateBetDerived } from 'state-shared';

	import { UI_BASE_FONT_SIZE, UI_BASE_SIZE } from '../constants';
	import { getContext } from '../context';
	import { i18nDerived } from '../i18n/i18nDerived';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const { stateXstateDerived, eventEmitter } = getContext();
	const sizes = { width: UI_BASE_SIZE * 1.45, height: UI_BASE_SIZE };
	const disabled = $derived(!stateXstateDerived.isIdle());
	const active = $derived(stateBetDerived.activeBetMode()?.type === 'activate');

	const openModal = () => (stateModal.modal = { name: 'buyBonus' });
	const disableActiveBetMode = () => (stateBet.activeBetModeKey = 'BASE');
	const onpress = () => {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });

		if (active) {
			disableActiveBetMode();
		} else {
			openModal();
		}
	};

	const getState = (value: {
		active: boolean;
		disabled: boolean;
		hovered: boolean;
		pressed: boolean;
	}) => {
		if (value.disabled) return 'disabled' as const;
		if (value.pressed) return 'pressed' as const;
		if (value.hovered) return 'hovered' as const;
		if (value.active) return 'active' as const;
		return 'default' as const;
	};
</script>

<Button {...props} {sizes} {disabled} {onpress}>
	{#snippet children({ center, hovered, pressed })}
		{@const state = getState({
			active,
			disabled,
			hovered,
			pressed,
		})}
		{@const w = sizes.width}
		{@const h = sizes.height}
		{@const radius = Math.min(w, h) * 0.28}
		{@const bg = disabled
			? 0x3a322c
			: state === 'active'
				? 0x5a2210
				: hovered || pressed
					? 0x3a1810
					: 0x1a0a08}
		{@const goldBorder = disabled
			? 0x8c7c5c
			: state === 'active'
				? 0xffe9a8
				: hovered || pressed
					? 0xf4c87a
					: 0xd9a55a}

		<Rectangle
			{...center}
			anchor={0.5}
			width={w}
			height={h}
			borderRadius={radius}
			borderColor={goldBorder}
			borderWidth={state === 'active' ? 6 : 4}
			backgroundColor={bg}
		/>

		<Text
			{...center}
			anchor={0.5}
			text={state === 'active' ? i18nDerived.disable() : i18nDerived.buyBonus()}
			style={{
				align: 'center',
				wordWrap: true,
				wordWrapWidth: w * 0.88,
				lineHeight: UI_BASE_FONT_SIZE * 1.1 * 0.95,
				fontFamily: 'Yuji Syuku',
				fontWeight: '700',
				fontSize: UI_BASE_FONT_SIZE * 1.1,
				fill: disabled ? 0xcabfa6 : 0xffe7a8,
				stroke: { color: 0x000000, width: 3 },
			}}
		/>
	{/snippet}
</Button>
