<script lang="ts">
	// Symbol sprite with real motion on its states:
	//   win  — plays the symbol's Wan I2V flipbook in-place when its sheet has
	//          loaded (ping-pong through 16 keyed frames — ignites and returns
	//          to rest), else falls back to the procedural pop:
	//          sharp pop (anticipation-free strike, backOut overshoot),
	//          short hold, clean settle. Gates the win presentation.
	//   land — impact squash with elastic follow-through.
	//   else — static, completes immediately.
	import { Tween } from 'svelte/motion';
	import { backOut, cubicOut, elasticOut, sineInOut } from 'svelte/easing';
	import { Sprite, BaseSprite } from 'pixi-svelte';
	import type { Texture } from 'pixi.js';

	import { getSymbolInfo } from '../game/utils';
	import { getSymbolWinFrames } from '../game/symbolWinFrames';
	import { SYMBOL_SIZE } from '../game/constants';
	import type { SymbolState } from '../game/types';

	type Props = {
		x?: number;
		y?: number;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		/** Config symbol name (H1..X) — keys the win flipbook sheet. */
		symbolName?: string;
		state?: SymbolState;
		oncomplete?: () => void;
	};

	const props: Props = $props();

	const scaleX = new Tween(1);
	const scaleY = new Tween(1);
	const yOffset = new Tween(0);
	const rotation = new Tween(0);

	// win flipbook playback state
	let winFrames: Texture[] | null = $state(null);
	let winDrawScale = $state(1.15);
	let winFrameIdx = $state(0);
	let winTimer: ReturnType<typeof setInterval> | null = null;
	// 46 ping-pong steps -> ~3.3 s per win. 14 fps reads as deliberate motion
	// you can follow — 20 fps compressed the Wan clips into a flash.
	const WIN_FPS = 14;

	// Per-symbol drawScale comes from the bake manifest (winSheets.manifest.json):
	// the baked frames are cropped to each animation's full glow extent, so the
	// subject sits smaller inside its frame than in the tight static atlas crop —
	// by a per-symbol amount. drawScale re-matches frame-0 to the static art size.

	const stopWinFlipbook = () => {
		if (winTimer) {
			clearInterval(winTimer);
			winTimer = null;
		}
		winFrames = null;
		winFrameIdx = 0;
	};

	const runWinFlipbook = (frames: Texture[], drawScale: number) => {
		winFrames = frames;
		winDrawScale = drawScale;
		winFrameIdx = 0;
		winTimer = setInterval(() => {
			if (winFrameIdx >= frames.length - 1) {
				stopWinFlipbook();
				props.oncomplete?.();
				return;
			}
			winFrameIdx += 1;
		}, 1000 / WIN_FPS);
	};

	const reset = () => {
		void scaleX.set(1, { duration: 0 });
		void scaleY.set(1, { duration: 0 });
		void yOffset.set(0, { duration: 0 });
		void rotation.set(0, { duration: 0 });
	};

	// oncomplete GATES book playback, so it must NEVER depend on a Tween promise
	// resolving — Svelte's Tween.set() promise can hang (it did, freezing the
	// game on scatter/win). Fire the visual tweens and gate oncomplete on a
	// guaranteed wall-clock timer instead.
	const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

	const runWin = async () => {
		// strike: fast overshoot pop with a slight lift
		void yOffset.set(-SYMBOL_SIZE * 0.06, { duration: 220, easing: backOut });
		void scaleX.set(1.22, { duration: 220, easing: backOut });
		void scaleY.set(1.22, { duration: 220, easing: backOut });
		await wait(220);
		// yokai shimmer — two quick rotation wiggles during the readability hold
		void rotation.set(0.06, { duration: 70, easing: sineInOut });
		await wait(70);
		void rotation.set(-0.06, { duration: 110, easing: sineInOut });
		await wait(110);
		void rotation.set(0, { duration: 80, easing: sineInOut });
		await wait(20); // pop (220) + shimmer/hold (200)
		// follow-through settle
		void yOffset.set(0, { duration: 200, easing: cubicOut });
		void scaleX.set(1, { duration: 200, easing: cubicOut });
		void scaleY.set(1, { duration: 200, easing: cubicOut });
		await wait(200);
		props.oncomplete?.();
	};

	const runLand = async () => {
		void scaleX.set(1.12, { duration: 70, easing: cubicOut });
		void scaleY.set(0.84, { duration: 70, easing: cubicOut });
		await wait(70);
		void scaleX.set(1, { duration: 300, easing: elasticOut });
		void scaleY.set(1, { duration: 300, easing: elasticOut });
		await wait(300);
		props.oncomplete?.();
	};

	let lastHandled = $state<string>('');
	$effect(() => {
		const state = props.state ?? 'static';
		if (state === lastHandled) return;
		lastHandled = state;
		if (state !== 'win') stopWinFlipbook();
		if (state === 'win') {
			reset();
			const flipbook = props.symbolName ? getSymbolWinFrames(props.symbolName) : null;
			if (flipbook) {
				runWinFlipbook(flipbook.frames, flipbook.drawScale);
			} else {
				void runWin();
			}
		} else if (state === 'land') {
			reset();
			void runLand();
		} else {
			reset();
			props.oncomplete?.();
		}
	});

	$effect(() => () => stopWinFlipbook()); // never leak the interval on unmount
</script>

{#if winFrames}
	<BaseSprite
		x={props.x}
		y={props.y}
		anchor={0.5}
		texture={winFrames[winFrameIdx]}
		width={SYMBOL_SIZE * props.symbolInfo.sizeRatios.width * winDrawScale}
		height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height * winDrawScale}
	/>
{:else}
	<Sprite
		x={props.x}
		y={(props.y ?? 0) + yOffset.current}
		anchor={0.5}
		rotation={rotation.current}
		key={props.symbolInfo.assetKey}
		width={SYMBOL_SIZE * props.symbolInfo.sizeRatios.width * scaleX.current}
		height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height * scaleY.current}
	/>
{/if}
