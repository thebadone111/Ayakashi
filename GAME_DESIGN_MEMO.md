# Ayakashi — Game Design Memo

**Game:** Ayakashi (妖かし) — Japanese yokai-themed slot
**Platform:** Stake web-sdk (PixiJS + Svelte 5), math-sdk backend
**Board:** 5 reels × 4 rows, paylines model, tumble/cascade base mechanic
**Headline math:** RTP 0.965, max win 2000×, base cost 1×, buy-bonus cost 100×
**Branch:** `final-dev`
**Date:** 2026-06-29

---

## 0. Engine snapshot (what already exists)

So that none of the ideas below reinvent existing wiring, here is the current feature surface:

- **Tumble/cascade base game** — `tumbleBoard` / `updateTumbleWin` book events; winning symbols explode and the board cascades, with an escalating koto pluck per consecutive tumble (`tumbleWinStep`).
- **Free Spins bonus** — full intro/outro/counter flow (`freeSpinTrigger`, `updateFreeSpin`, `freeSpinRetrigger`, `fsMultiplier`, `freeSpinEnd`). Retriggers add spins; **Ofuda Talismans** (`fsMultiplier`) multiply awarded spins.
- **Special symbols** — `X` / `X2` "Oni Kanabo" exploders that smash a 3×3 area (`fxManager.kanabo`), plus `W` wild and `S` scatter.
- **Win presentation** — 11-tier win-level map (`zero → standard → small → nice → substantial → big → superwin → mega → epic → max`), spotlight + payline trace + per-cell burst (`fxManager.winBurstAt`).
- **FX library** — textured particles (petals ×8 flipbooks, embers, smoke, ink, paper, foxfire), brush-wide sumi-e banner, torii gate, background mood swap (`base` / `freespin`), bonus-trigger sequence.
- **Buy Bonus** — `bonus` bet mode (`buyBonus: true`), bespoke `ModalBuyBonusAyakashi` two-card picker, confirm modal.
- **Win-cap handling** — `winCapped` flag stops spin visuals once 2000× is hit so the round ends on the max-win celebration.

This memo proposes additions on top of that surface.

---

## 1. Easy wins (low effort, high impact — each < 2h)

| # | Change | What it does | Path / hook | Effort |
|---|--------|--------------|-------------|--------|
| 1 | **Bet-value highlight** | Pulse/glow the BET readout for ~400ms whenever the bet changes so the active stake is unmistakable. | `LayoutDesktop.svelte` BET container + a tween on `stateBet` change | 30m |
| 2 | **Buy-Bonus button on desktop** | *(FIXED in this pass — see §3)* | done | — |
| 3 | **Coin burst on every win** | Reuse the `coins` spritesheet (`SD2_Coin.json`) to spray 6–12 coins from each winning cell on `winInfo`, scaled by win level. | `bookEventHandlerMap.winInfo`, new `fxManager.coinBurstAt` | 1.5h |
| 4 | **Win-level sound reactivity / ducking** | Duck `bgm_main` by ~6dB during big-win count-up, restore on `winLevelSoundsStop`. Removes the "soundboard pile-up" the code comments already flag. | `bookEventHandlerMap` win-level helpers + `Sound.svelte` | 1h |
| 5 | **Anticipation pulse on near-scatter** | When 2 scatters are already on the board, slow + glow the remaining reels (the `anticipation` array is already on the reveal event but lightly used). | `Board.svelte` spin using `revealEvent.anticipation` | 1.5h |
| 6 | **Last-win "ghost" recall** | Tapping the WIN readout re-plays the last `winInfo` presentation (spotlight + lines). Cheap delight, helps players read complex tumbles. | store last `winInfo`, re-broadcast on tap | 1h |
| 7 | **Idle avatar reactions** | The yokai avatar (`AvatarActor`) reacts: wink on small win, cheer on big win, recoil on dead spin. Cheer/wink art already generated (`avatar-cheer`, `avatar-wink`). | `actor.ts` + win-level hook | 1.5h |
| 8 | **Tumble streak counter UI** | Surface the existing `tumbleWinStep` (already 1–5) as a small on-board "×N chain" badge so the escalating koto has a visual partner. | small Text overlay driven by `updateTumbleWin` | 1h |
| 9 | **Petal drift intensifies with bet** | Scale ambient petal emission rate slightly with stake — subliminal "higher stakes = more alive". | `BackgroundAmbient` emit rate from `stateBet` | 45m |
| 10 | **Foxfire trail on SPIN press** | Brief blue-white foxfire wisp off the SPIN button on press (asset `particleFoxfire` already preloaded). | `ButtonBet` press → `fxManager` one-shot | 45m |

**Recommended first three:** #3 coin burst, #4 sound ducking, #7 avatar reactions — together they give the biggest "this feels alive" jump for ~4h total.

---

## 2. Powerup ideas (coin-bought or mid-session triggers)

These would sit alongside the existing Buy-Bonus economy. Each can be surfaced as an extra card in `ModalBuyBonusAyakashi` (the two-card lacquer picker already exists) or as a between-spin "charm" purchase. **Note:** anything that alters payout distribution must be reflected in the math-sdk and the FE config regenerated via `apps/lines/sync-config.py` — these are not pure-FE features.

### 2.1 Oni Rage (鬼の怒り) — multiplier surge
- **Trigger:** Bought charm, or charges automatically over N consecutive dead spins (pity meter).
- **Effect:** Next spin applies a global ×2/×3/×5 to all line wins; the `X` Oni Kanabo exploders glow red and their 3×3 smash is guaranteed to land at least one high symbol.
- **Theme fit:** Leans directly on the existing Oni Kanabo (`fxManager.kanabo`) exploder.
- **Impl path:** New bet-mode variant or a pre-spin flag the math honours; FE reuses `globalMult` already present in `winInfo.meta`. Add a red background mood + kanabo red tint. **Complexity: math-side medium, FE light.**

### 2.2 Kitsune Trick (狐の悪戯) — wild reel
- **Trigger:** Bought charm.
- **Effect:** A random full reel turns Wild for one spin (foxfire flames climb the reel). Strong synergy with tumbles — a wild reel can chain multiple cascades.
- **Theme fit:** Kitsune = trickster fox; foxfire particle set already exists.
- **Impl path:** Math seeds a forced-wild-reel reveal; FE animates the reel conversion with `particleFoxfire`. **Complexity: math medium, FE medium.**

### 2.3 Shrine Blessing (神社の祝福) — guaranteed bonus
- **Trigger:** Bought charm (premium price, below full Buy-Bonus).
- **Effect:** Guarantees a scatter trigger within the next K spins (a "blessed" torii overlay shows the countdown). Cheaper than buying the bonus outright but adds anticipation rather than instant entry.
- **Theme fit:** Torii gate asset already used in the FS intro.
- **Impl path:** Math guarantees the `freeSpinTrigger` within the window; FE shows a small torii progress meter. **Complexity: math medium, FE light.**

### 2.4 Ofuda Surge (御札の高まり) — talisman boost
- **Trigger:** Bought charm, FS-only.
- **Effect:** Doubles the FS-multiplier yield from Ofuda Talismans for the whole bonus (the `fsMultiplier` mechanic already exists; this just raises its weight).
- **Impl path:** Math weight change on the existing event; FE shows gold ofuda glow on the counter panel. **Complexity: math light, FE trivial.**

### 2.5 Yurei Echo (幽霊の残響) — sticky respin
- **Trigger:** Charges from collecting N high symbols across a session, then fires automatically.
- **Effect:** After a winning tumble, the winning symbols stay "haunted" (sticky) for one extra respin with smoke wisps (`particleSmoke`) rising off them.
- **Theme fit:** Yurei = restless ghost; smoke particle set exists.
- **Impl path:** Hold-and-respin micro-mechanic in math; FE adds sticky-symbol smoke. **Complexity: math medium-high, FE medium.**

---

## 3. Alternative game modes (separate rule-sets)

The board is 5×4 with tumbling already in place, which makes several variants cheap to prototype as additional `betModes`.

| Mode | How it changes the base game | Complexity (1–5) |
|------|------------------------------|------------------|
| **Standard Lines (current)** | 5×4 lines + tumble + FS. Baseline. | — |
| **Cluster of Spirits** | Switch from paylines to cluster-pays (5+ adjacent matching symbols). The grid is already a tumble grid, but 5×4 is tight for clusters — consider 5×5 or 6×5 for this mode only. Requires a `cluster` evaluator (one already exists as a sibling app: `apps/cluster`). | 4 |
| **Hyaku Respin (Hold & Win)** | Land 6+ scatters/coin symbols to enter a Lock-and-Respin round: coins lock, 3 respins reset on each new coin, fill the grid for the grand prize. Theme: collecting jp_coin (`jp_coin` art already generated). | 3 |
| **Avalanche of Yokai (Cascade-only)** | Drop the FS bonus, make tumbles the whole show with an ever-climbing per-cascade multiplier ladder (reuse `tumbleWinStep`, extend past 5). Faster, higher-variance, simpler to certify. | 2 |
| **Hyakki Yagyo (Challenge mode)** | A "Night Parade of 100 Demons" ladder: each tier is a mini-objective (trigger X tumbles, land Y oni). Light skill/choice layer (pick one of three charms between tiers). Highest complexity — needs a meta-progression layer the SDK doesn't ship. | 5 |
| **Super Free Spins (SUPERSPIN)** | Already partially referenced in code (`stateBet.activeBetModeKey === 'SUPERSPIN'`, `bgm_freespin`). A premium FS variant: fewer but higher-multiplier spins, all Ofuda boosted. Mostly a math/weights mode — FE plumbing mostly exists. | 2 |

**Quickest two to ship:** Super Free Spins (plumbing already half-present) and Avalanche of Yokai (pure tumble extension).

---

## 4. Animation priority (ranked 1 = ship first)

| Rank | Animation | Why |
|------|-----------|-----|
| **1** | **Symbol flash on win** | Already present via spotlight/burst but should be punchier — the single highest-frequency feedback moment. A crisp flash on every winning symbol is what makes wins *read*. Lowest cost, touches every spin. |
| **2** | **Coin burst on win** | Direct reward feedback; the `coins` spritesheet is already loaded. Pairs with #1 to make wins feel paid, not just highlighted. (Maps to Easy Win #3.) |
| **3** | **Reel shake on hit-stop** | A short camera/reel shake when an Oni Kanabo (`X`) lands or a big symbol slams in adds weight. The kanabo smash already fires — a shake amplifies it cheaply. |
| **4** | **FS brush wipe** | The brush-wide sumi-e banner exists; a brush-stroke wipe into Free Spins makes the mode transition feel bespoke and premium. High impact but only fires on bonus entry (lower frequency). |
| **5** | **Avatar reaction** | Personality and stickiness, but secondary to core win feedback. Art (cheer/wink) is ready. (Maps to Easy Win #7.) |
| **6** | **Background particle drift** | Ambient polish — already partly live (petals). Lovely but lowest marginal impact; players rarely look at the background mid-spin. |

**Rationale for the ordering:** ranks 1–3 fire on the high-frequency core loop (every win / every big hit) and are the cheapest leverage on "feel". Ranks 4–5 fire on lower-frequency events (bonus entry, occasional reactions) and are more about identity than moment-to-moment feedback. Rank 6 is continuous but peripheral.

---

## Appendix — files referenced

- `apps/lines/src/game/bookEventHandlerMap.ts` — all spin/win/FS event handling
- `apps/lines/src/game/fxManager.ts` — particle + FX library (kanabo, ofuda, foxfire, winBurst, backgroundMood)
- `apps/lines/src/game/assets.ts` — asset manifest (FS, coins, particles, torii, brushWide all present)
- `apps/lines/src/game/config.ts` — auto-generated bet modes / paylines (regen via `sync-config.py`)
- `apps/lines/src/game/winLevelMap.ts` — 11-tier win-level table
- `apps/lines/src/components/FreeSpinIntro|Outro|Counter.svelte`, `Transition.svelte`, `BoardFrame.svelte`
- `apps/lines/src/components/ModalBuyBonusAyakashi.svelte` — bespoke buy-bonus picker
- `packages/components-ui-pixi/src/components/LayoutDesktop.svelte` — desktop betting bar (buy-bonus button added this pass)
- `apps/lines/src/stories/ModeBonusBook*.stories.svelte` — Storybook bonus playback (data in `stories/data/bonus_books.ts`)

---

## 7. Outstanding content updates

### 7.1. Paytable — OUTDATED ⚠️
`apps/lines/src/components/paytable/PayTableContent.svelte` and `GameRulesContent.svelte` contain placeholder or v1 content that no longer reflects the current game. Must be updated before submission to reflect:
- Correct symbol names and pay values for all H1-H5 and L1-L5 symbols
- Accurate Oni Kanabo exploder mechanic description
- Ofuda Talisman multiplier explanation in the FS section
- Updated 2000× win cap and buy-bonus cost (100×)
- Tumble/cascade mechanic clearly explained

### 7.2. Buy Bonus button — desktop bar
The desktop bar (AoA single-row redesign) previously had no Buy Bonus entry point. Fixed this pass by adding the button. Verify the placement works ergonomically — recommended to move it into the burger menu if the bar feels cluttered.

### 7.3. H5 symbol — Wan animation prompts missing
`WAN_ANIMATION_PROMPTS.md` covers H1-H4 + element symbols. H5 exists in `art/generated/symbols-hq/h5/` but has no I2V prompts yet. Add 3 prompts (landing, win loop, big win) when H5 art is confirmed.
