<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal } from 'state-shared';

	import BaseContent from './BaseContent.svelte';
	import BaseScrollable from './BaseScrollable.svelte';

	type Props = {
		children: Snippet;
		/** Game-specific rules content. Falls back to a placeholder when a game
		 *  doesn't provide one (keeps this shared component generic). */
		content?: Snippet;
	};

	const props: Props = $props();
</script>

{#if stateModal.modal?.name === 'gameRules'}
	<Popup zIndex={zIndex.modal} onclose={() => (stateModal.modal = null)}>
		<BaseContent maxWidth="100%">
			<BaseScrollable type="column">
				{#if props.content}
					{@render props.content()}
				{:else}
					<span>ADD YOUR GAME RULES</span>
				{/if}
				{@render props.children()}
			</BaseScrollable>
		</BaseContent>
	</Popup>
{/if}
