<script lang="ts">
	import { Container, Text, Sprite, Rectangle } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { OnHotkey } from 'components-shared';
	import { stateBetDerived } from 'state-shared';

	import UiSprite from './UiSprite.svelte';
	import ButtonBetProvider from './ButtonBetProvider.svelte';
	import { UI_BASE_FONT_SIZE, UI_BASE_SIZE } from '../constants';
	import { i18nDerived } from '../i18n/i18nDerived';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const disabled = $derived(!stateBetDerived.isBetCostAvailable());
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };

	let glowAlpha = $state(0.15);
	$effect(() => {
		let t = 0;
		const id = setInterval(() => {
			t += 0.035;
			glowAlpha = 0.08 + Math.abs(Math.sin(t)) * 0.28;
		}, 16);
		return () => clearInterval(id);
	});
</script>

<ButtonBetProvider>
	{#snippet children({ key, onpress })}
		<OnHotkey hotkey="Space" {disabled} {onpress} />
		<Button {...props} {sizes} {onpress} {disabled}>
			{#snippet children({ center, hovered })}
				<!-- Gold pulse ring — only in spin-ready state -->
				{#if key === 'spin_default'}
					<Rectangle
						{...center}
						anchor={0.5}
						width={sizes.width + 24}
						height={sizes.height + 24}
						borderRadius={(sizes.height + 24) / 2}
						backgroundColor={0xd4a017}
						alpha={glowAlpha}
					/>
				{/if}
				<Container {...center}>
					<UiSprite
						width={sizes.width}
						height={sizes.height}
						anchor={0.5}
						borderRadius={sizes.height / 2}
						backgroundColor={disabled || ['spin_disabled', 'stop_disabled'].includes(key)
							? 0xcccccc
							: 0xffffff}
					/>

					{#if ['spin_default', 'spin_disabled'].includes(key)}
						<!-- Spin state: show the circular arrow icon -->
						<Sprite
							key="iconSpin"
							anchor={0.5}
							width={sizes.width * 0.62}
							height={sizes.height * 0.62}
							tint={disabled ? 0x888888 : 0x111111}
						/>
					{:else}
						<!-- Stop state: text is clearer than an icon -->
						<Text
							anchor={0.5}
							text={i18nDerived.stop()}
							style={{
								align: 'center',
								fontFamily: 'proxima-nova',
								fontWeight: '800',
								fontSize: UI_BASE_FONT_SIZE * 0.9,
								fill: 0x111111,
							}}
						/>
					{/if}
				</Container>
			{/snippet}
		</Button>
	{/snippet}
</ButtonBetProvider>
