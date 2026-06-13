<script lang="ts">
	// Symbol sprite with real motion on its states:
	//   win  — sharp pop (anticipation-free strike, backOut overshoot),
	//          short hold, clean settle. Gates the win presentation.
	//   land — impact squash with elastic follow-through.
	//   else — static, completes immediately.
	import { Tween } from 'svelte/motion';
	import { backOut, cubicOut, elasticOut } from 'svelte/easing';
	import { Sprite } from 'pixi-svelte';

	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import type { SymbolState } from '../game/types';

	type Props = {
		x?: number;
		y?: number;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		state?: SymbolState;
		oncomplete?: () => void;
	};

	const props: Props = $props();

	const scaleX = new Tween(1);
	const scaleY = new Tween(1);
	const yOffset = new Tween(0);

	const reset = () => {
		void scaleX.set(1, { duration: 0 });
		void scaleY.set(1, { duration: 0 });
		void yOffset.set(0, { duration: 0 });
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
		await wait(420); // pop (220) + readability hold (200)
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
		if (state === 'win') {
			reset();
			void runWin();
		} else if (state === 'land') {
			reset();
			void runLand();
		} else {
			reset();
			props.oncomplete?.();
		}
	});
</script>

<Sprite
	x={props.x}
	y={(props.y ?? 0) + yOffset.current}
	anchor={0.5}
	key={props.symbolInfo.assetKey}
	width={SYMBOL_SIZE * props.symbolInfo.sizeRatios.width * scaleX.current}
	height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height * scaleY.current}
/>
