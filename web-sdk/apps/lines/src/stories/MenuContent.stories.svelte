<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'MENU/content',
	});
</script>

<script lang="ts">
	import PayTableContent from '../components/paytable/PayTableContent.svelte';
	import GameRulesContent from '../components/paytable/GameRulesContent.svelte';
</script>

<!-- Dark lacquer backdrop so the gold-on-dark modal content reads, mirroring the
     in-game Popup. These render the exact components wired into ModalPayTable /
     ModalGameRules. -->
<Story name="payTable">
	<div style="background:#140a08;min-height:100vh;padding:1.5rem;overflow:auto;">
		<PayTableContent />
	</div>
</Story>

<Story name="gameRules">
	<div style="background:#140a08;min-height:100vh;padding:1.5rem;overflow:auto;">
		<GameRulesContent />
	</div>
</Story>
