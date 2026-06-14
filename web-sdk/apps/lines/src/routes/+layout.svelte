<script lang="ts">
	import { type Snippet } from 'svelte';
	import { GlobalStyle } from 'components-ui-html';
	import { Authenticate, LoaderStakeEngine, LoadI18n } from 'components-shared';
	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';

	import messagesMap from '../i18n/messagesMap';

	type Props = { children: Snippet };

	const props: Props = $props();

	const loaderUrlStakeEngine = new URL('../../stake-engine-loader.gif', import.meta.url).href;

	setContext();
</script>

<GlobalStyle>
	<Authenticate>
		<LoadI18n {messagesMap}>
			<Game />
		</LoadI18n>
	</Authenticate>
</GlobalStyle>

<!-- Engine intro splash (required Stake-Engine branding). When it completes,
     our in-game Ayakashi cinematic LoadingScreen (Game.svelte) takes over —
     the SDK's LoaderExample "Add Your Loader" placeholder has been removed. -->
<LoaderStakeEngine src={loaderUrlStakeEngine} oncomplete={() => {}} />

{@render props.children()}