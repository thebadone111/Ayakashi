<script lang="ts">
	import { onMount } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { App, Sprite } from 'pixi-svelte';
	import { stateModal } from 'state-shared';

	import { UI, UiGameName } from 'components-ui-pixi';
	import { GameVersion } from 'components-ui-html';
	import Modals from './AyakashiModals.svelte';

	import { getContext } from '../game/context';
	import { fxManager } from '../game/fxManager';
	import EnableSound from './EnableSound.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import LoadingScreen from './LoadingScreen.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import Board from './Board.svelte';
	import TumbleBoard from './TumbleBoard.svelte';
	import Anticipations from './Anticipations.svelte';
	import Win from './Win.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';
	import FxHost from './FxHost.svelte';
	import PayTableContent from './paytable/PayTableContent.svelte';
	import GameRulesContent from './paytable/GameRulesContent.svelte';

	const context = getContext();

	// PIXI rasterizes canvas text ONCE on creation and never observes async
	// @font-face loads. The brush face is only ever used in PIXI canvas text,
	// so nothing in the DOM triggers its load — text would render INVISIBLE
	// (font-display) → "win screen has no amount", "FS text weird/cut off".
	// Force-load it during the loading screen, before any game/FX text exists.
	// (font-display is also set to swap as a failsafe so text is never blank.)
	function loadBrushFonts() {
		// The @font-face rule lives in <head> (app.html / preview-head), so the
		// face is already registered by the time onMount runs — a direct load()
		// finds it. Fire-and-forget (no fonts.ready gate, which can hang).
		if (typeof document === 'undefined' || !document.fonts) return;
		document.fonts.load(`1em "Yuji Syuku"`).catch(() => {
			/* ignore — font-display:swap fallback keeps text visible */
		});
	}

	onMount(() => {
		context.stateLayout.showLoadingScreen = true;
		loadBrushFonts();
	});

	context.eventEmitter.subscribeOnMount({
		buyBonusConfirm: () => {
			stateModal.modal = { name: 'buyBonusConfirm' };
		},
	});
</script>

<App>
	<EnableSound />
	<EnableHotkey />
	<EnableGameActor />
	<EnablePixiExtension />

	<Background />

	{#if context.stateLayout.showLoadingScreen}
		<LoadingScreen onloaded={() => (context.stateLayout.showLoadingScreen = false)} />
	{:else}
		<ResumeBet />
		<!--
			The reason why <Sound /> is rendered after clicking the loading screen:
			"Autoplay with sound is allowed if: The user has interacted with the domain (click, tap, etc.)."
			Ref: https://developer.chrome.com/blog/autoplay
		-->
		<Sound />

		<MainContainer>
			<BoardFrame />
		</MainContainer>

		<MainContainer>
			<!-- board + tumble board shake together on impacts -->
			<FxHost onhost={(container) => fxManager.registerShakeTarget(container)}>
				<Board />
				<TumbleBoard />
				<Anticipations />
			</FxHost>
			<!-- board-space FX layer: paylines, win bursts, kanabo, ofuda, dust -->
			<FxHost onhost={(container) => fxManager.registerBoardFx(container)} />
		</MainContainer>

		<!-- gacha avatar (desktop/landscape only) -->
		{#if ['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType())}
			<MainContainer>
				<FxHost onhost={(container) => fxManager.registerAvatar(container)} />
			</MainContainer>
		{/if}

		<UI>
			{#snippet gameName()}
				<UiGameName name="AYAKASHI" />
			{/snippet}
			{#snippet logo()}
				<Sprite
					key="logo"
					anchor={{ x: 1, y: 0 }}
					width={220}
					height={220 * (270 / 690)}
				/>
			{/snippet}
		</UI>
		<Win />
		<FreeSpinIntro />
		<!-- all layouts — portrait moves it above the reels (MISSING-04) -->
		<FreeSpinCounter />
		<FreeSpinOutro />
		<Transition />
	{/if}

	<!-- full-screen FX overlay: big wins, bonus trigger, FS screens, mist wipe.
	     Mounted outside the loading branch so the loading→game wipe works too.
	     High zIndex: game content mounts later and would otherwise stack above. -->
	<FxHost zIndex={500} onhost={(container) => fxManager.registerOverlay(container)} />
</App>

<Modals>
	{#snippet version()}
		<GameVersion version={__APP_VERSION__} />
	{/snippet}
	{#snippet payTable()}
		<PayTableContent />
	{/snippet}
	{#snippet gameRules()}
		<GameRulesContent />
	{/snippet}
</Modals>
