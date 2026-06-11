<script lang="ts">
	// Ayakashi loading screen — cinematic torii vignette with logo, foxfire
	// orbs and a lacquer/foxfire progress bar (see animations/loadingScene.ts).
	import * as PIXI from 'pixi.js';
	import type { Texture } from 'pixi.js';
	import { Container } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { LoadingScene } from '../game/animations';
	import TransitionAnimation from './TransitionAnimation.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import FxHost from './FxHost.svelte';

	type Props = {
		onloaded: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	let loadingType = $state<'start' | 'transition'>('start');
	let scene: LoadingScene | null = null;

	const hostScene = (container: PIXI.Container) => {
		const app = context.stateApp.pixiApplication;
		if (!app) return;
		scene = new LoadingScene({
			app,
			parent: container,
			x: 0,
			y: 0,
			width: context.stateLayoutDerived.mainLayout().width * 0.5,
		});
		return () => {
			scene?.destroy();
			scene = null;
		};
	};

	$effect(() => {
		const progress = context.stateApp.loadingProgress;
		scene?.setProgress(progress > 1 ? progress / 100 : progress);
	});

	$effect(() => {
		const logoTexture = context.stateApp.loadedAssets?.logo as Texture | undefined;
		if (logoTexture) scene?.setLogo(logoTexture);
	});
</script>

<!-- torii vignette, logo, orbs, progress -->
<FadeContainer show={loadingType === 'start'}>
	<MainContainer>
		<Container
			x={context.stateLayoutDerived.mainLayout().width * 0.5}
			y={context.stateLayoutDerived.mainLayout().height * 0.45}
		>
			<FxHost onhost={hostScene} />
		</Container>
	</MainContainer>
</FadeContainer>

<!-- press to continue -->
<FadeContainer show={loadingType === 'start' && context.stateApp.loaded}>
	<PressToContinue onpress={() => (loadingType = 'transition')} />
</FadeContainer>

<!-- transition between the loading screen and the game -->
<FadeContainer show={loadingType === 'transition'}>
	<TransitionAnimation oncomplete={props.onloaded} />
</FadeContainer>
