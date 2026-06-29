<script lang="ts" module>
	export type EmitterEventBoardFrame =
		| { type: 'boardFrameGlowShow' }
		| { type: 'boardFrameGlowHide' };
</script>

<script lang="ts">
	// Ayakashi reels frame — torii/oni lacquered border art.
	// The art is 1080x900 with an 876x752 transparent inner window; FRAME_RATIOS
	// scales the frame so the window sits exactly over the 5x5 board.
	// Free-spins glow = procedural pulsing foxfire border (no Spine).
	import * as PIXI from 'pixi.js';
	import { Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { FRAME_RATIOS, FRAME_OUTER_HALF } from '../game/constants';
	import { TweenRunner, PALETTE, easings } from '../game/animations';
	import FxHost from './FxHost.svelte';

	const context = getContext();

	const frameLayout = $derived.by(() => {
		const layout = context.stateGameDerived.boardLayout();
		return {
			x: layout.x,
			y: layout.y,
			width: layout.width * FRAME_RATIOS.width,
			height: layout.height * FRAME_RATIOS.height,
		};
	});

	let glowGraphics: PIXI.Graphics | null = null;
	let tweens: TweenRunner | null = null;

	const hostGlow = (container: PIXI.Container) => {
		const app = context.stateApp.pixiApplication;
		if (!app) return;
		tweens = new TweenRunner(app.ticker);

		const { x, y } = frameLayout;
		const bLayout = context.stateGameDerived.boardLayout();
		// Outer visible frame border dimensions (measured from sumi brush frame opaque extent).
		const outerW = bLayout.width * FRAME_OUTER_HALF.width * 2;
		const outerH = bLayout.height * FRAME_OUTER_HALF.height * 2;

		glowGraphics = new PIXI.Graphics();
		for (const [pad, stroke, alpha] of [
			[12, 16, 0.05],
			[6, 9, 0.1],
			[1, 4, 0.22],
		] as const) {
			glowGraphics
				.roundRect(-outerW / 2 - pad, -outerH / 2 - pad, outerW + pad * 2, outerH + pad * 2, 28)
				.stroke({ color: PALETTE.GOLD, width: stroke, alpha });
		}
		glowGraphics.blendMode = 'add';
		glowGraphics.position.set(x, y);
		glowGraphics.alpha = 0;
		container.addChild(glowGraphics);

		return () => {
			tweens?.destroy();
			tweens = null;
			glowGraphics = null; // destroyed with the host container
		};
	};

	context.eventEmitter.subscribeOnMount({
		boardFrameGlowShow: () => {
			if (!glowGraphics || !tweens) return;
			tweens.killAll();
			void tweens.to(glowGraphics, { alpha: 0.7 }, { duration: 400 }).then(() => {
				if (!glowGraphics || glowGraphics.destroyed) return;
				void tweens?.to(glowGraphics, { alpha: 0.35 }, {
					duration: 900,
					ease: easings.sineInOut,
					repeat: -1,
					yoyo: true,
				});
			});
		},
		boardFrameGlowHide: () => {
			if (!glowGraphics || !tweens) return;
			tweens.killAll();
			void tweens.to(glowGraphics, { alpha: 0 }, { duration: 350 });
		},
	});
</script>

<FxHost zIndex={-1} onhost={hostGlow} />

<!-- reel frame on top — bg_bg shows through the transparent window -->
<Sprite
	key="reelFrame"
	anchor={0.5}
	x={frameLayout.x}
	y={frameLayout.y}
	width={frameLayout.width}
	height={frameLayout.height}
/>
