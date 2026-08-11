<script lang="ts">
	// Ayakashi Game Rules — rendered inside the SDK ModalGameRules (HTML overlay).
	// Headline numbers are pulled from game/config.ts so they can't drift.
	import config from '../../game/config';

	const paylines = Object.keys((config as any).paylines ?? {}).length;
	const rtpPct = Math.round(((config as any).rtp ?? 0.97) * 1000) / 10;
	const maxWin = (config as any).betModes?.base?.max_win ?? 2000;
	const buyCost = (config as any).betModes?.bonus?.cost ?? 100;
</script>

<div class="gr">
	<h2 class="gr-title">GAME RULES</h2>
	<p class="gr-sub">妖かし — Ayakashi · Dark Yokai Slots</p>

	<section>
		<h3 class="gr-h">Overview</h3>
		<p>Ayakashi is a 5×4, {paylines}-line video slot set in a moonlit realm of Japanese
		yokai. Wins are paid left-to-right along a payline, starting from the leftmost
		reel. Only the highest win per line is paid. <b>RTP {rtpPct}%</b>, maximum win
		<b>{maxWin}×</b> the total bet.</p>
	</section>

	<section>
		<h3 class="gr-h">How to play</h3>
		<ul>
			<li>Adjust your bet with the − / + controls, then press <b>Spin</b>.</li>
			<li>3 or more matching symbols on a payline, from reel 1 rightwards, pay
				according to the Pay Table.</li>
			<li>Use the menu for Auto Spin, Turbo, the Pay Table and Settings.</li>
		</ul>
	</section>

	<section>
		<h3 class="gr-h">Tumbling reels</h3>
		<p>After every win, the winning symbols are cleared and the symbols above fall
		to fill the gaps, with new symbols dropping in from the top. Tumbles repeat as
		long as new wins are formed — all part of the same spin.</p>
		<p>Each consecutive tumble raises a <b>spin multiplier</b> by +1 (×1, ×2, ×3, …)
		that applies to every win in that tumble. The multiplier resets at the start of
		each new spin.</p>
	</section>

	<section>
		<h3 class="gr-h">Kitsune Spirit Orb — Wild</h3>
		<p>The Wild substitutes for all paying symbols (not the Temple Bell scatter). A
		Wild can land carrying a <b>win multiplier</b> that boosts any line it completes.</p>
	</section>

	<section>
		<h3 class="gr-h">Oni Kanabo</h3>
		<p>When the Oni Kanabo (war-club) lands, it smashes the surrounding 3×3 area,
		clearing those symbols and feeding the tumble for bigger follow-up wins.</p>
	</section>

	<section>
		<h3 class="gr-h">Temple Bell — Free Spins</h3>
		<p>Land <b>3 or more Temple Bell scatters</b> to trigger the Free Spins:
		<b>3 scatters → 8</b>, <b>4 → 12</b>, <b>5 → 15</b> Free Spins. Temple Bells
		landing during the feature retrigger and add more spins (2 → +3, 3 → +5,
		4 → +8, 5 → +12).</p>
		<p>On the trigger, <b>Ofuda Talismans</b> on the board multiply the number of
		Free Spins awarded: 1 Talisman ×2, 2 ×3, 3 ×5, 4 ×10, 5 ×20.</p>
	</section>

	<section>
		<h3 class="gr-h">Buy Bonus</h3>
		<p>Prefer not to wait? Buy direct entry to the Free Spins for <b>{buyCost}×</b>
		your bet. (May be unavailable in some jurisdictions.)</p>
	</section>

	<section>
		<h3 class="gr-h">Good to know</h3>
		<ul>
			<li>Once the {maxWin}× maximum win is reached, the round ends and pays out in full.</li>
			<li>Malfunction voids all pays and plays.</li>
			<li>Each spin is an independent, provably-fair outcome.</li>
		</ul>
	</section>
</div>

<style lang="scss">
	.gr {
		color: #e9dcbe;
		font-family: 'Yuji Syuku', Georgia, serif;
		max-width: 640px;
		margin: 0 auto;
		padding: 0.5rem 0.75rem 1rem;
		text-align: left;
		line-height: 1.5;
	}
	.gr-title {
		font-size: 2rem;
		letter-spacing: 0.18em;
		color: #ffd24a;
		margin: 0 0 0.1rem;
		text-align: center;
		text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
	}
	.gr-sub { text-align: center; color: #e7c98a; font-size: 0.95rem; margin: 0 0 1rem; }
	.gr-h {
		font-size: 1.05rem;
		color: #ffd24a;
		letter-spacing: 0.06em;
		margin: 1.1rem 0 0.35rem;
	}
	.gr p { margin: 0 0 0.3rem; font-size: 0.9rem; }
	.gr ul { margin: 0.2rem 0 0.3rem; padding-left: 1.1rem; }
	.gr li { font-size: 0.9rem; margin: 0.15rem 0; }
	.gr b { color: #ffe7b8; }
</style>
