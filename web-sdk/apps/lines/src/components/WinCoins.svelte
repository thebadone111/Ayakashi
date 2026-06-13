<script lang="ts">
	import { Container, ParticleEmitter } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';
	import { fountain as baseConfig } from 'constants-shared/particleConfig';
	import { LEVEL_PARTICLE_COIN_MAP } from 'constants-shared/particleCoin';

	import { getContext } from '../game/context';
	import type { WinLevelAlias } from '../game/winLevelMap';

	type Props = {
		emit?: boolean;
		levelAlias?: WinLevelAlias;
	};

	const props: Props = $props();
	const context = getContext();
	const extraConfig = $derived(
		props?.levelAlias ? LEVEL_PARTICLE_COIN_MAP[props.levelAlias] : null,
	);

	// Q4: the yen coins barely showed — too small, too sparse, too few. Boost the
	// merged config: ~2x denser (lower frequency), bigger coins, far higher cap,
	// and a touch longer life so the fountain reads as a real shower of gold.
	const boost = (cfg: typeof baseConfig & Record<string, unknown>) => ({
		...cfg,
		frequency: (cfg.frequency ?? 0.4) * 0.45,
		maxParticles: Math.round((cfg.maxParticles ?? 100) * 2.5),
		scale: {
			...cfg.scale,
			start: (cfg.scale?.start ?? 0.3) * 1.7,
			end: (cfg.scale?.end ?? 0.4) * 1.7,
		},
		lifetime: { min: 6, max: 7 },
	});
	const config = $derived(boost({ ...baseConfig, ...extraConfig }));
</script>

{#if config}
	<MainContainer>
		<Container
			x={context.stateGameDerived.boardLayout().x}
			y={context.stateGameDerived.boardLayout().y}
		>
			<ParticleEmitter {config} key="coins" emit={props.emit} />
		</Container>
	</MainContainer>
{/if}
