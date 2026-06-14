<script lang="ts">
	// Ayakashi modal stack — mirrors the SDK's <Modals> aggregator but swaps the
	// generic ModalBuyBonus for our bespoke ModalBuyBonusAyakashi (2-card lacquer
	// design). Every other modal (error/bet menu/auto spin/pay table/game rules/
	// settings/confirm) is the unmodified SDK version.
	import type { Snippet } from 'svelte';

	import ModalError from 'components-ui-html/src/components/ModalError.svelte';
	import ModalBetMenu from 'components-ui-html/src/components/ModalBetMenu.svelte';
	import ModalBuyBonusConfirm from 'components-ui-html/src/components/ModalBuyBonusConfirm.svelte';
	import ModalAutoSpin from 'components-ui-html/src/components/ModalAutoSpin.svelte';
	import ModalAutoSpinMessage from 'components-ui-html/src/components/ModalAutoSpinMessage.svelte';
	import ModalPayTable from 'components-ui-html/src/components/ModalPayTable.svelte';
	import ModalGameRules from 'components-ui-html/src/components/ModalGameRules.svelte';
	import ModalSettings from 'components-ui-html/src/components/ModalSettings.svelte';

	import ModalBuyBonusAyakashi from './ModalBuyBonusAyakashi.svelte';

	type Props = {
		version: Snippet;
		payTable?: Snippet;
		gameRules?: Snippet;
	};

	const props: Props = $props();
</script>

<ModalError />
<ModalBetMenu />
<ModalBuyBonusAyakashi />
<ModalBuyBonusConfirm />
<ModalAutoSpin />
<ModalAutoSpinMessage />
<ModalPayTable content={props.payTable}>
	{@render props.version()}
</ModalPayTable>
<ModalGameRules content={props.gameRules}>
	{@render props.version()}
</ModalGameRules>
<ModalSettings />
