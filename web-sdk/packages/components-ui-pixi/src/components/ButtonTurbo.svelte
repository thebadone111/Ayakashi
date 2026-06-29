<script lang="ts">
	import type { ButtonProps } from 'components-pixi';
	import { stateBet, stateBetDerived } from 'state-shared';

	import UiButton from './UiButton.svelte';
	import { UI_BASE_SIZE } from '../constants';
	import { getContext } from '../context';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const context = getContext();
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const disabled = $derived(stateBet.isSpaceHold);

	// 3 speed modes: 0 = normal, 1 = medium, 2 = fast.
	// speedMode lives in shared state (the single source of truth that drives
	// timeScale + reel spin options); the icon is derived from it so it stays
	// correct even when turbo is toggled from elsewhere (e.g. stop button).
	const BOLT_KEYS = ['iconBoltSlow', 'iconBoltMed', 'iconBoltFast'] as const;
	const speedMode = $derived(stateBet.speedMode);
	const active = $derived(speedMode > 0);

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateBetDerived.setSpeedMode(speedMode + 1, { persistent: true });
	};

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => stateBetDerived.updateIsTurbo(true, { persistent: false }),
		stopButtonEnable: () => stateBetDerived.updateIsTurbo(false, { persistent: false }),
	});
</script>

<UiButton {...props} {sizes} {active} {onpress} {disabled} icon="turbo" iconKey={BOLT_KEYS[speedMode]} iconScale={0.58} />
