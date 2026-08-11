<script lang="ts">
	// Ayakashi Pay Table — rendered inside the SDK ModalPayTable (HTML overlay).
	// Data-driven from the auto-generated game/config.ts so payouts/paylines can
	// never drift from the math. Symbol art is sliced from the symbolsStatic atlas
	// by build-paytable-symbols.py and imported through Vite (fingerprinted, CDN-safe).
	import config from '../../game/config';

	// key (lowercase config symbol) -> fingerprinted asset URL
	const imgModules = import.meta.glob('./img/*.webp', {
		eager: true,
		query: '?url',
		import: 'default',
	}) as Record<string, string>;
	const img = (key: string) => imgModules[`./img/${key.toLowerCase()}.webp`];

	type Pay = Record<string, number>;
	const payouts = (sym: string): Pay => {
		const out: Pay = {};
		for (const entry of (config as any).symbols?.[sym]?.paytable ?? []) {
			for (const k in entry) out[k] = entry[k];
		}
		return out;
	};

	// line-paying symbols, high → low (W pays the most and is also the wild)
	const PAY_ORDER = ['W', 'H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'L5'];
	const NAMES: Record<string, string> = {
		W: 'Kitsune Spirit Orb',
		H1: 'Oni Mask',
		H2: 'Kitsune',
		H3: 'Tengu Mask',
		H4: 'Dragon',
		L1: 'Crossed Katana',
		L2: 'Jade Magatama',
		L3: 'Sake Flask',
		L4: 'Paper Lantern',
		L5: 'Folding Fan',
	};

	const SPECIALS = [
		{ key: 'W', name: 'Kitsune Spirit Orb', role: 'WILD', desc: 'Substitutes for all paying symbols. Can land carrying a win multiplier that boosts the line it completes.' },
		{ key: 'S', name: 'Temple Bell', role: 'SCATTER', desc: 'Land 3 or more anywhere to toll the bell and trigger the Free Spins.' },
		{ key: 'M', name: 'Ofuda Talisman', role: 'FREE SPINS', desc: 'On the trigger, Ofuda multiply the Free Spins awarded: 1 Talisman ×2, 2 ×3, 3 ×5, 4 ×10, 5 ×20. Scatters during the feature retrigger more.' },
		{ key: 'X', name: 'Oni Kanabo', role: 'FEATURE', desc: 'The war-club smashes its surrounding 3×3 area, clearing those symbols so the reels cascade.' },
	];

	const paylines: number[][] = Object.values((config as any).paylines ?? {});
	const rtpPct = Math.round(((config as any).rtp ?? 0.97) * 1000) / 10;
	const maxWin = (config as any).betModes?.base?.max_win ?? 2000;
	const cols = 5;
	const rows = 4;

	const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : `${n}`);
</script>

<div class="pt">
	<h2 class="pt-title">PAY TABLE</h2>
	<p class="pt-sub">妖かし — Ayakashi · 5×4, {paylines.length} lines · RTP {rtpPct}% · Max win {maxWin}×</p>
	<p class="pt-note">Payouts are shown for 5 / 4 / 3 of a kind, as a multiple of the line bet. Wins pay left-to-right on a line.</p>

	<h3 class="pt-h">Symbols</h3>
	<div class="pt-grid">
		{#each PAY_ORDER as sym}
			{@const p = payouts(sym)}
			<div class="pt-card">
				<img class="pt-img" src={img(sym)} alt={NAMES[sym] ?? sym} />
				<div class="pt-name">{NAMES[sym] ?? sym}</div>
				<div class="pt-pays">
					{#each ['5', '4', '3'] as k}
						{#if p[k] !== undefined}
							<span class="pt-pay"><b>{k}×</b> {fmt(p[k])}</span>
						{/if}
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<h3 class="pt-h">Special symbols & features</h3>
	<div class="pt-specials">
		{#each SPECIALS as s}
			<div class="pt-special">
				<img class="pt-img" src={img(s.key)} alt={s.name} />
				<div class="pt-special-body">
					<div class="pt-special-head"><span class="pt-name">{s.name}</span><span class="pt-role">{s.role}</span></div>
					<p class="pt-desc">{s.desc}</p>
				</div>
			</div>
		{/each}
	</div>

	<h3 class="pt-h">{paylines.length} paylines</h3>
	<div class="pt-lines">
		{#each paylines as line, i}
			<div class="pt-line">
				<svg viewBox="0 0 {cols * 10} {rows * 10}" class="pt-line-svg" aria-label={`payline ${i + 1}`}>
					{#each Array(rows) as _, r}
						{#each Array(cols) as _, c}
							<rect x={c * 10 + 1} y={r * 10 + 1} width="8" height="8" rx="1.5" class={line[c] === r ? 'on' : 'off'} />
						{/each}
					{/each}
					<polyline
						points={line.map((r, c) => `${c * 10 + 5},${r * 10 + 5}`).join(' ')}
						class="pt-line-path"
					/>
				</svg>
				<span class="pt-line-no">{i + 1}</span>
			</div>
		{/each}
	</div>
</div>

<style lang="scss">
	.pt {
		color: #f3e7c9;
		font-family: 'Yuji Syuku', Georgia, serif;
		max-width: 760px;
		margin: 0 auto;
		padding: 0.5rem 0.25rem 1rem;
		text-align: center;
	}
	.pt-title {
		font-size: 2rem;
		letter-spacing: 0.18em;
		color: #ffd24a;
		margin: 0 0 0.15rem;
		text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
	}
	.pt-sub { font-size: 0.95rem; color: #e7c98a; margin: 0 0 0.4rem; }
	.pt-note { font-size: 0.8rem; color: #b9ad8e; margin: 0 0 1.1rem; line-height: 1.4; }
	.pt-h {
		font-size: 1.1rem;
		color: #ffd24a;
		letter-spacing: 0.12em;
		margin: 1.4rem 0 0.7rem;
		border-bottom: 1px solid rgba(255, 210, 74, 0.25);
		padding-bottom: 0.3rem;
	}
	.pt-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 0.6rem;
	}
	.pt-card {
		background: rgba(20, 10, 8, 0.55);
		border: 1px solid rgba(255, 210, 74, 0.18);
		border-radius: 10px;
		padding: 0.5rem;
	}
	.pt-img { width: 64px; height: 64px; object-fit: contain; }
	.pt-name { font-size: 0.92rem; color: #ffe7b8; margin-top: 0.15rem; }
	.pt-pays { display: flex; flex-direction: column; gap: 0.05rem; margin-top: 0.25rem; font-size: 0.82rem; }
	.pt-pay b { color: #ffd24a; }
	.pt-specials { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 0.7rem; }
	.pt-special {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		text-align: left;
		background: rgba(20, 10, 8, 0.55);
		border: 1px solid rgba(255, 210, 74, 0.18);
		border-radius: 10px;
		padding: 0.6rem;
	}
	.pt-special .pt-img { width: 72px; height: 72px; flex: 0 0 auto; }
	.pt-special-head { display: flex; align-items: baseline; gap: 0.5rem; }
	.pt-role {
		font-size: 0.66rem;
		letter-spacing: 0.12em;
		color: #1a0d06;
		background: #ffd24a;
		border-radius: 4px;
		padding: 0.05rem 0.35rem;
	}
	.pt-desc { font-size: 0.82rem; color: #d9cca8; margin: 0.25rem 0 0; line-height: 1.4; }
	.pt-lines {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
		gap: 0.5rem;
	}
	.pt-line { position: relative; }
	.pt-line-svg { width: 100%; height: auto; display: block; }
	.pt-line-svg rect.off { fill: rgba(255, 255, 255, 0.06); }
	.pt-line-svg rect.on { fill: rgba(255, 210, 74, 0.85); }
	.pt-line-path { fill: none; stroke: #ff5a3c; stroke-width: 1.4; stroke-linejoin: round; stroke-linecap: round; opacity: 0.9; }
	.pt-line-no { position: absolute; top: 0; right: 2px; font-size: 0.6rem; color: #8c8068; }
</style>
