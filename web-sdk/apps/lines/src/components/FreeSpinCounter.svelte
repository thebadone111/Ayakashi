<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>

<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, FRAME_OUTER_HALF } from '../game/constants';
	import { anchorToPivot, Text, Container, Sprite, type Sizes } from 'pixi-svelte';

	const context = getContext();
	const PANEL_KEY_DESKTOP = 'fsCounterPanel';
	// B_iron_plate_flux_03: 2368x1792
	const PANEL_RATIO_DESKTOP = 2368 / 1792;
	const panelKey = PANEL_KEY_DESKTOP;
	const panelWidth = $derived(SYMBOL_SIZE * 2.9);
	const panelSizes = $derived({
		width: panelWidth,
		height: panelWidth / PANEL_RATIO_DESKTOP,
	});
	const scale = 1;
	// Positioned to the RIGHT of the reel frame, vertically near the frame top.
	// x: visible frame right border edge (board centre + board.width * FRAME_OUTER_HALF.width) + 8px gap
	// y: visible frame top border edge + small inset
	const position = $derived({
		x:
			context.stateGameDerived.boardLayout().x +
			context.stateGameDerived.boardLayout().width * FRAME_OUTER_HALF.width +
			8 -
			context.stateGameDerived.boardLayout().width * 0.08,
		y:
			context.stateGameDerived.boardLayout().y -
			context.stateGameDerived.boardLayout().height * FRAME_OUTER_HALF.height +
			16 +
			context.stateGameDerived.boardLayout().height * 0.15,
	});

	const fontSize = SYMBOL_SIZE * 0.22;

	let show = $state(false);
	let current = $state(0);
	let total = $state(0);
	let titleSizes: Sizes = $state({ width: 0, height: 0 });
	let counterSizes: Sizes = $state({ width: 0, height: 0 });

	const textContainerSizes = $derived({
		width: titleSizes.width,
		height: titleSizes.height + counterSizes.height,
	});
	const counterPosition = $derived({ x: titleSizes.width / 2, y: titleSizes.height });

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => (show = true),
		freeSpinCounterHide: () => (show = false),
		freeSpinCounterUpdate: (emitterEvent) => {
			if (emitterEvent.current !== undefined) current = emitterEvent.current;
			if (emitterEvent.total !== undefined) total = emitterEvent.total;
		},
	});
</script>

<MainContainer>
	<FadeContainer {show} {...position} {scale}>
		<Sprite key={panelKey} {...panelSizes} alpha={0.97} />
		<Container
			x={panelSizes.width * 0.5}
			y={panelSizes.height * 0.48}
			pivot={anchorToPivot({
				sizes: textContainerSizes,
				anchor: { x: 0.5, y: 0.5 },
			})}
		>
			<!-- brush Text (Yuji Syuku) — the placeholder 'gold' bitmap font was the
			     mining set and rendered no digits; Yuji Syuku has the full set. -->
			<Text
				text={'FREE SPIN'}
				style={{
					fontFamily: 'Yuji Syuku',
					fontSize,
					fontWeight: '900',
					fill: 0xffd24a,
					stroke: { color: 0x1a0d06, width: Math.max(3, fontSize / 10) },
					wordWrap: false,
				}}
				onresize={(sizes) => (titleSizes = sizes)}
			/>
			<Text
				text={`${current} OF ${total}`}
				{...counterPosition}
				anchor={{ x: 0.5, y: 0 }}
				style={{
					fontFamily: 'Yuji Syuku',
					fontSize,
					fontWeight: '900',
					fill: 0xfff2c4,
					stroke: { color: 0x1a0d06, width: Math.max(3, fontSize / 10) },
				}}
				onresize={(sizes) => (counterSizes = sizes)}
			/>
		</Container>
	</FadeContainer>
</MainContainer>
