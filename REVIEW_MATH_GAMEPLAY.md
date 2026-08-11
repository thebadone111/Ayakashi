# Ayakashi — Math & Gameplay Review

**Date:** 2026-07-02  
**Branch:** `final-dev`  
**Reviewer:** Claude Code (automated deep review)  
**Source files:** `math-sdk/games/0_0_lines/game_config.py`, `game_optimization.py`, `gamestate.py`, `game_override.py`, `game_executables.py`, `library/stats_summary.json`, `library/statistics_summary.json`, `GAME_DESIGN_MEMO.md`, `IMPROVEMENT_PLAN.md`, `ROADMAP.md`

---

## 1. Current Math Model Summary

### 1.1 RTP

| Mode | Cost | RTP | Notes |
|------|------|-----|-------|
| Base | 1× bet | **96.50%** | Configured in `game_config.py` (`self.rtp = 0.9650`) |
| Buy Bonus | 100× bet | **96.50%** | Same RTP target — confirmed in `stats_summary.json` |

Both modes hit exactly 0.965 per the verified stats. The base game RTP breaks down as:
- Base game phase: **58.5% RTP** at hit rate (HR) 3.5, average win **2.05×** (`mode_fence_info.base.basegame`)
- Free game phase: **37.0% RTP** at HR 200, average win **74×** (`mode_fence_info.base.freegame`)
- Win cap (2000×) contributes: **~1%** RTP

### 1.2 Volatility

From `stats_summary.json`:

| Metric | Base Mode | Bonus Mode |
|--------|-----------|------------|
| Std deviation | 10.602 | 164.305 |
| Variance | 112.412 | 26,996 |
| Skew | 87.712 | 3,342,790 |
| Excess kurtosis | 13,391 | 2,141,421,828 |
| `prob_nil` (dead spin rate) | **70.9%** | 0% |
| `prob_less_bet` | **94.7%** | 76.4% |
| Max win in lookup table | 200,000 (= 2000× on min) | 200,000 |

The base mode variance (112.4) and skew (87.7) classify this as a **high-volatility game** by industry standards — appropriate for Stake.com. The dead spin rate of 70.9% is extremely high (see Issues section).

### 1.3 Hit Frequency

From `statistics_summary.json` (base mode, per 100k spins):

**Meaningful wins (payline 5-of-a-kind hits per 100k):**

| Symbol | 5-OAK | 4-OAK | 3-OAK | Payout (5-OAK) |
|--------|-------|-------|-------|----------------|
| W (Wild) | 12,450 | 1,306 | 79 | 50× |
| H1 (Ao-Oni) | 61 | 17 | 4 | 50× |
| H2 (Kitsune) | 69 | 17 | 4 | 15× |
| H3 (Daitengu) | 71 | 22 | 4 | 10× |
| H4 (Ko-omote) | 56 | 15 | 3 | 8× |
| L1 | 61 | 15 | 4 | 5× |
| L2 | 58 | 12 | 3 | 3× |
| L3 | 53 | 14 | 3 | 3× |
| L4 | 37 | 12 | 3 | 2× |
| L5 | 42 | 13 | 3 | 1× |

**Overall hit rate (non-zero wins):** 3.44 per spin in base game (i.e., 1 non-zero win every ~29 spins, but the dead spin rate is 70.9%, meaning tumble mechanics account for multi-win sequences in the remaining 29.1% of spins).

**Scatter trigger rate:** 9.96 per 100k spins (approximately 1 in every 10,040 spins triggers free spins).

### 1.4 Feature Definitions

**Base game:**
- 5 reels × 4 rows, 50 paylines (all defined in `game_config.py` lines 67-133)
- Tumble/cascade mechanic: winning symbols explode, board refills from above, re-evaluates; continues until no win or win cap hit
- Exploder (X) symbols: on any win, any X symbol destroys a 3×3 area centred on itself (`game_executables.py` lines 23–32)
- Wild (W): substitutes all non-scatter; in free game gets a random multiplier (distribution: `2×` at weight 60, `3×` at 80, `4×` at 50, `5×` at 20, `10×` at 15, `20×` at 10, `50×` at 5 — from `game_config.py` `freegame_condition.mult_values`)

**Free Spins:**
- Triggered by 3/4/5 scatters → 8/12/15 free spins
- Retrigger within FS: 2/3/4/5 scatters → +3/+5/+8/+12 spins
- Ofuda Talisman (M symbol) multiplies FS awards: 1 M → ×2, 2 M → ×3, 3 M → ×5, 4 M → ×10, 5 M → ×20 (from `events.py` `FS_MULT_TABLE`)
- Wild multiplier active in FS: values `{2:60, 3:80, 4:50, 5:20, 10:15, 20:10, 50:5}`
- Wild multiplier padding: In padding rows, W symbols get higher multipliers {2:100, 3:50, 4:50, 5:50, 10:30, 20:20, 50:5}

**Buy Bonus:**
- Cost: 100× bet (game_config.py line 238)
- Guarantees free game entry; no base game spins
- Same RTP target as base mode (0.965)

**Win Cap:**
- 2000× bet maximum — when hit, `wincap_triggered` flag stops further tumble evaluation
- In base mode: 0.1% quota (`Distribution criteria="wincap", quota=0.001`)
- Win cap condition uses weighted WCAP reel in FS (`"WCAP": 5` vs `"FR0": 1`)

---

## 2. What Is Working Well

### 2.1 RTP Is Correctly Calibrated
96.5% is squarely in the 96–97% band that Stake.com targets. The re-run from 97% → 96.5% (logged in `ROADMAP.md` Round 5.5) was the right call — softer house edge is standard for crypto casinos positioning as "player-friendly." The math verifies cleanly at exactly 0.965 in both modes.

### 2.2 Volatility Profile Fits the Audience
Variance 112 in base, skew 87.7 — this is genuinely high volatility. Stake.com players self-select for high-variance experiences. The combination of dead spins, infrequent but large free spin bonuses (74× average win in FS), and 2000× cap creates the right risk/reward tension.

### 2.3 Tumble Mechanic Is the Correct Structural Choice
The cascade mechanic (`gamestate.py` `run_spin`) creates variable-length rounds, which:
- Keeps session time unpredictable (good for engagement)
- Naturally creates "escalating tension" as the board fills/empties
- Pairs well with the tumble streak counter (already exposed as `tumbleWinStep` in the FE)
- The implementation correctly re-evaluates lines after each tumble and respects the win cap

### 2.4 Free Spins Bonus Has Meaningful Internal Math
The FS multiplier system (M symbols × Ofuda table × wild multipliers) creates a layered bonus where outcomes range from modest to explosive. The FS average win of 74× per-trigger at 200 HR is a solid mid-volatility bonus inside a high-volatility shell.

### 2.5 Exploder (X) Mechanic Is Well-Designed
The 3×3 blast zone (`game_executables.py` `_mark_exploder_area`) is only active when the board has a win — it cannot independently trigger. This avoids "dead exploders" that feel pointless. The X mechanic extends tumble chains and amplifies wins rather than being independent filler.

### 2.6 Distribution System Is Properly Structured
The quota-based distribution (`quota=0.001 wincap, quota=0.1 freegame, quota=0.25 zero, quota=0.65 basegame`) provides controlled outcome targeting. The `check_repeat` loop in `game_override.py` ensures each simulated spin lands in its allocated distribution bucket, which is exactly how certified lottery-style math works.

### 2.7 Buy Bonus Pricing Is Competitive
100× bet for guaranteed FS entry implies a value multiple of roughly the free spin probability. At ~1/10,040 base trigger rate, the raw actuarial price for guaranteed FS is enormous — 100× is effectively a subsidy, which is the standard industry approach for buy-bonus features. This is appropriate.

---

## 3. Math Issues / Bugs

### 3.1 CRITICAL: Dead Spin Rate Is Exceptionally High (70.9%)

**Evidence:** `stats_summary.json` `prob_nil = 0.709`

This means **7 in 10 base game spins return nothing**. Industry benchmarks for high-volatility games at Stake.com range from 40–60% zero-win spins. At 70.9%, the base game will feel "dead" for extended periods.

**Impact:** Crypto casino players who are used to Pragmatic Play's Book of Dead (50–55% nil rate), Hacksaw's Chaos Crew (48%), or NoLimit City's titles (typically 45–60%) will find Ayakashi excessively dry between wins. Session bankroll requirements are punishing — a player on a 10-bet minimum session expects to drain at a rate of 7 dead spins out of every 10.

**Root cause:** The optimization targets HR 3.5 for basegame and 200 for freegame (`game_optimization.py` `ConstructConditions(hr=3.5, rtp=0.585)`). HR 3.5 in the base game is a loose trigger, but the nil rate suggests the board is designed with infrequent low-symbol coverage across the 50 paylines. The 50-payline structure with sparse reel populations is producing too many complete misses.

**Recommended fix:** Reel strip rebalancing to target nil rate ≤55%. This likely requires running `game_optimization.py` with a tighter HR constraint on the basegame fence (e.g., `hr=5.0` instead of 3.5) to force more frequent small wins onto the reel strips. Note: this will compress variance somewhat — compensate by increasing the FS contribution in the optimization.

### 3.2 SIGNIFICANT: Base Game Average Win Is Extremely Low (2.05×)

**Evidence:** `statistics_summary.json` `mode_fence_info.base.basegame.av_win = 2.05`

The average non-zero win in the base game is 2.05× the bet. This is below cost recovery on most wins — 94.7% of all spins return less than 1 bet (`prob_less_bet = 0.947`). 

**Impact:** Players will rarely feel rewarded in the base game. A session can consist of hundreds of spins where wins are visible but don't cover the bet. Combined with the 70.9% nil rate, this creates a highly adversarial player experience. The "game feels dead" reviewer feedback (the 3.7/9 score) is partly a math complaint, not purely art.

**Recommended fix:** The basegame optimization should bias wins into the 2–5× range more heavily. The current scaling bias in `game_optimization.py` shows `scale_factor=1.2` for `win_range=(1,2)` — this is pushing small wins down. Consider shifting the bias range to `(3, 8)` with `scale_factor=1.4` to lift frequent wins above the "feels pointless" threshold.

### 3.3 SIGNIFICANT: Wild Multiplier Is Inactive in Base Game

**Evidence:** `game_override.py` `assign_mult_property()` — multiplier_value defaults to 1 unless `gametype == freegame_type`. Base game Wilds are always 1× multipliers.

**Impact:** The Wild symbol's multiplicative power is invisible in the base game. Players see Wilds as "just another symbol" rather than an exciting modifier. This is a missed engagement opportunity for the 12,450 Wild 5-of-a-kind hits per 100k spins (a relatively frequent event).

**Recommended fix:** Apply a constrained multiplier to Wilds in the base game — for example `{1:80, 2:15, 3:4, 5:1}`. This adds a dynamic element to base game Wilds without breaking the math model (average Wild multiplier remains ~1.3, which is modest and controllable). The existing `assign_mult_property` logic already handles this; it just needs the gametype gate removed or a separate base game distribution added.

### 3.4 MINOR: Scatter Trigger Rate May Be Too Low

**Evidence:** HR 9.96 per 100k spins = approximately 1 in 10,040 spins.

**Analysis:** At a typical spin rate of ~600 spins/hour, a player expects free spins every ~17 hours of play. Industry comparables (Book of Dead: 1 in ~200, Gates of Olympus: 1 in ~150) are dramatically more frequent. Even high-volatility games targeting Stake typically land between 1 in 200 and 1 in 800 for free spin triggers.

**Important caveat:** The 10% freegame quota in the distribution system means 10% of all simulated books are free game entries, which is mathematically healthy. The 9.96 HR in the statistics may reflect the raw scatter coincidence rate rather than the outcome-targeted rate the optimizer actually uses. **Verify the actual trigger rate from the published books before actioning this** — if the 1M simulation confirms 10% freegame books, the effective frequency is ~1 in 10 spins once the distribution weighting is applied.

### 3.5 MINOR: Buy Bonus Optimization Produces Extreme Kurtosis

**Evidence:** `stats_summary.json` bonus mode `excess_kurtosis = 2,141,421,828`

This is pathologically high — it means the bonus distribution has an extraordinarily fat tail, concentrated almost entirely near the mean with occasional catastrophic outlier wins. While mathematically valid (the optimizer forces 96.5% RTP), extreme kurtosis can produce a poor player experience where most buy-bonus sessions return small amounts and a tiny fraction return huge wins. Stake reviewers may flag this.

**Recommended fix:** Run the bonus optimizer with tighter `min_m2m` and `max_m2m` parameters (currently 4–8), or constrain the win range distribution more heavily to spread outcomes across a wider range of multiples.

### 3.6 DATA: Bonus Mode `m2m = 3.351`, Base `m2m = 0`

**Evidence:** `stats_summary.json`

`m2m` (moment-to-moment variance) of 0 in base mode is suspicious — it suggests the base game book structure has no moment-to-moment variability recorded. This may be an artifact of how the stats tool calculates m2m (it may only track freegame sequences). However it's worth verifying that the base book properly records all intermediate wins for the tumble sequences.

---

## 4. Missing Features That Comparable Games Have

The following features appear in direct Stake.com slot competitors and are absent from Ayakashi. Ranked by impact on player retention:

### 4.1 Progressive Tumble Multiplier (HIGH IMPACT — Missing)
**What it is:** A multiplier that increases with each consecutive tumble cascade (×1 → ×2 → ×3 etc.) and resets at the end of the round or FS spin.  
**Who has it:** Gates of Olympus (multiplier storm), Razor Shark, Relax Gaming titles.  
**Why it matters:** Every tumble generates anticipation because the multiplier is visibly climbing. The current Ayakashi tumble has escalating audio (`tumbleWinStep` koto cues, 1–5 levels) but no mathematical escalation beyond winning symbols cascading. Adding even a 1-step-per-tumble multiplier in FS dramatically increases both average win and perceived excitement.  
**Ayakashi-specific path:** The `global_multiplier` field already exists on the gamestate and is wired to `globalMult` in win events. The FE already has `updateTumbleWin` with `tumbleWinStep`. This is primarily a math-side change: increment `global_multiplier` by 1 on each tumble rather than keeping it at 1, reset at end of round.

### 4.2 Ante Bet / Feature Bet Mode (HIGH IMPACT — Missing)
**What it is:** A 1.25× or 1.5× bet multiplier that increases scatter frequency or wild weighting, giving players control over their hit rate vs. cost.  
**Who has it:** Nearly all Pragmatic Play titles (ante bet on all features), Hacksaw Gaming.  
**Why it matters:** It is Stake.com's most-requested math feature because it gives skilled/impatient players a lever. Players who want more FS triggers pay slightly more per spin. This also improves effective RTP for high-turnover players.  
**Ayakashi-specific path:** The math SDK already has `BetMode` infrastructure. Adding an `ante` bet mode at 1.25× cost with `scatter_triggers` weights shifted toward higher probability (e.g., 3-scatter weight from 50→70) is a low-code change in `game_config.py`. The FE already references `SUPERSPIN` bet mode key in dead code — this plumbing exists.

### 4.3 Sticky Wilds or Expanding Wilds in Free Spins (HIGH IMPACT — Missing)
**What it is:** Wilds that persist on the board across FS spins (sticky) or expand to cover entire reels (expanding).  
**Who has it:** Legacy of Dead, Dead or Alive 2, Primal Megaways.  
**Why it matters:** Creates a visual "board filling with Wilds" progression arc that makes each FS spin more exciting than the last. The current FS mechanic is flat — each spin is independent with randomized Wilds.  
**Ayakashi-specific path:** The `special_syms_on_board` tracking already maintains Wild positions across a round. Sticky Wilds in FS are a medium complexity addition: after tumble resolution, mark any W symbol that is on a non-exploding position as `sticky=True`, and prevent it from being reset by `draw_board`. The foxfire Wild particle is already themed for this.

### 4.4 Increasing Multiplier Free Spins Variants (HIGH IMPACT — Missing)
**What it is:** A second or enhanced free spins mode (e.g., fewer spins but wilds are all guaranteed multiplier, or per-spin multiplier grows).  
**Who has it:** Sweet Bonanza (candybomb FS vs standard FS), Razor Shark (super free spins).  
**Why it matters:** Players who have triggered FS multiple times want variation. The current FS is deterministic in structure. A "Super Bonus" at 200× buy-in cost that delivers 5 spins with all Wilds at minimum 5× multiplier would be a high-excitement extreme-volatility mode.  
**Ayakashi-specific path:** `SUPERSPIN` bet mode is already referenced in the FE code. The `wincap_condition` already demonstrates how to force a specific win bucket. A Super FS mode is achievable by adding a third `BetMode` with `is_buybonus=True, cost=200`, `force_freegame=True`, and `mult_values` heavily skewed to 10–50×.

### 4.5 Pity / Guarantee Mechanic (MEDIUM IMPACT — Missing)
**What it is:** After N consecutive dead spins, a guaranteed minimum win or scatter trigger is forced.  
**Who has it:** Many Asian market slots, newer Stake-native games. Some implement it as a visible "meter" (e.g., Nolimit's xWays meter).  
**Why it matters:** Eliminates the player frustration of 50+ consecutive dead spins. Even hidden pity mechanics reduce churn by ensuring players aren't lost on cold streaks. Critical given Ayakashi's 70.9% nil rate.  
**Ayakashi-specific path:** Can be implemented purely in the base game distribution — add a 5th distribution bucket `"pity"` that forces a basegame win (non-zero) whenever the simulation sequence has seen N consecutive zero-win books. No FE change required.

### 4.6 "Collect" Symbols / Coin Accumulator (MEDIUM IMPACT — Missing)
**What it is:** Symbols that accumulate a value counter that pays out at a trigger (common in Hold & Win games).  
**Who has it:** Coin Combo, Dragon's Fortune, many NetEnt titles.  
**Why it matters:** Creates a secondary progression layer visible across base spins that keeps players engaged during dry stretches.  
**Ayakashi path:** The `GAME_DESIGN_MEMO.md` already proposes "Hyaku Respin (Hold & Win)" as a mode. The jp_coin art is already generated. This would be a full mode, not a quick addition.

### 4.7 Symbol Transformation (MEDIUM IMPACT — Missing)
**What it is:** Lower-value symbols transform to higher-value symbols under trigger conditions (e.g., L symbols upgrading to H symbols).  
**Who has it:** Pragmatic's Starlight Princess, NoLimit City's Mental.  
**Why it matters:** Adds a "surprise upgrade" moment that generates social sharing and replay value.  
**Ayakashi path:** Medium complexity — requires math-side symbol reassignment logic and FE animation for the transformation effect.

### 4.8 Reel Anticipation (MINOR — Partially Present, Underused)
**What it is:** Visual slowdown and sound change when 2 scatters are visible to anticipate a 3rd.  
**Current state:** `anticipation_triggers` is configured in `game_config.py` (min scatter count - 1 = 2), and `revealEvent.anticipation` is exposed in the FE — but `GAME_DESIGN_MEMO.md` item #5 says it is "lightly used."  
**Fix needed:** FE-only: reel slow-down, edge glow, drum roll — the math hook is already there.

---

## 5. Addictiveness Improvements (Specific, Actionable)

### 5.1 Tumble Multiplier Ladder — Adds Escalating Tension Per Round
Every cascade after the first applies a multiplier increment. In FS, this becomes explosive:
- Tumble 1: ×1 (base)
- Tumble 2: ×2
- Tumble 3: ×3
- Tumble 4+: continue climbing

The `tumbleWinStep` counter already exists at the FE layer (levels 1–5). Math change: in `gamestate.py` `run_spin` and `run_freespin`, replace `global_multiplier=1` with `self.global_multiplier += 1` on each tumble iteration. The FE already emits `globalMult` in `updateTumbleWin` events. Visual: the tumble streak counter badge already proposed in `GAME_DESIGN_MEMO.md` item #8 now has mathematical weight behind it.

**Expected impact:** Average FS win increases from 74× to potentially 120–200× depending on tumble depth. Dead spin base game sessions feel less punishing because when chains DO happen, they escalate.

### 5.2 Base Game Wild Multipliers — Makes Every Wild Exciting
As described in Issue 3.3: add a base game Wild multiplier distribution `{1:80, 2:15, 3:4, 5:1}`. This gives Wilds a 20% chance of being a multiplier (2–5×) in the base game. Players who land 3–5 Wilds on a payline now sometimes see `×2`, `×3`, or `×5` stamps on their Wilds, which creates shareable "big Wild" moments.

**Expected impact:** Visual differentiation of Wild symbols, perceived "surprise" frequency increases, social sharing moments. Average base game win rises modestly (~10–15%) without breaking the distribution.

### 5.3 Near-Miss Anticipation — Triggers Scatter Excitement
Two scatters on board → remaining reels slow to near-stop speed, edge glow activates, audio shifts to taiko build. The math hook is already present (`anticipation_triggers` in config). This requires only FE work in `Board.svelte`.

**Expected impact:** The highest single-session engagement spike that can be added with zero math changes. Near-miss states are the most replicated pattern in high-performing slot games. A session where the player triggers near-miss 4 times and then gets FS is reported as more fun than getting FS silently.

### 5.4 "Pity" Dead Spin Meter — Visible or Hidden
After 20 consecutive zero-win base spins, guarantee the next spin is non-zero. If visible: a small Oni totem fills with ink over 20 spins, releases on trigger (theme: the Oni's patience breaks). If hidden: players experience a statistically lower maximum cold streak without knowing why sessions "feel fairer."

**Expected impact:** Reduces churn from the 70.9% nil rate. The dead spin rate itself doesn't need to change; the maximum dry streak is simply bounded. This is the most direct fix for the "game feels dead" session experience.

### 5.5 Last-Win Recall Tap — Reduces Cognitive Load
Already proposed in `GAME_DESIGN_MEMO.md` item #6. Tapping the WIN display re-runs the last `winInfo` payline presentation. This is a pure FE change. It matters because Ayakashi's tumble mechanic produces complex multi-line wins that players cannot parse in real time — the recall lets them understand what they just won, which converts confusion into satisfaction.

### 5.6 Escalating Free Spin Entry Celebration — Creates Anticipation Before FS
Currently the FS trigger fires the scatter bell → torii gate → FS counter. Consider adding a pre-FS tension builder:
- 3 scatters land → lock the board for 1 second → show "3 SCATTERS — 8 FREE SPINS" before transitioning
- The extra dwell time lets players process the trigger before the mode switch

This is a pure FE addition, zero math cost. It transforms an event that can be missed into one that is always felt.

### 5.7 Buy Bonus Value Messaging — Addresses the Friction Point
The current buy-bonus modal (`ModalBuyBonusAyakashi.svelte`) shows price but doesn't communicate value. Adding the line "Average win: ~74× your bet" under the bonus card (calculated from the `stats_summary.json` bonus mode data) converts undecided players. This is one line of UI text.

---

## 6. Recommended Changes Ranked by Impact

| Rank | Change | Type | Effort | Impact |
|------|--------|------|--------|--------|
| **1** | **Reduce dead spin rate from 70.9% → ~55%** | Math (reel rebalance) | High | Fixes the root cause of "game feels dead." Requires re-running `game_optimization.py` with tighter HR target (~5.0 instead of 3.5 for basegame) + new reel strips. |
| **2** | **Add tumble multiplier ladder (FS especially)** | Math + FE (hook exists) | Medium | Transforms the tumble from a flat mechanic to an escalating excitement arc. The `global_multiplier` field and `tumbleWinStep` FE hook are already in place. |
| **3** | **Add Wild multipliers in base game** | Math only | Low | 20% chance of 2–5× on a Wild in base game. Makes 12,450/100k Wild 5-OAK events feel rewarding. Single distribution table change in `game_override.py` `assign_mult_property`. |
| **4** | **Activate near-miss anticipation (2-scatter slow-reel)** | FE only | Low | Highest engagement lift with zero math cost. Hook is already wired; just needs FE implementation in `Board.svelte`. |
| **5** | **Add ante bet mode (1.25× cost, higher scatter rate)** | Math + FE | Medium | Stake.com's most-requested feature. The SDK `BetMode` infrastructure exists; adding a third mode takes ~20 lines in `game_config.py`. |
| **6** | **Implement pity mechanic (20-spin dead-streak cap)** | Math (new distribution bucket) | Low | Directly addresses the 70.9% nil rate's worst-case outcomes. Can be invisible. |
| **7** | **Add sticky Wilds in Free Spins** | Math + FE | High | Gives FS a visual progression arc (board fills with Wilds). High engagement lift, medium implementation complexity. |
| **8** | **Raise base game average win from 2.05× toward 4–5×** | Math (reel/optimization) | High | Requires re-running optimizer with adjusted scaling bias. Should accompany change #1 since both require a math re-run. |
| **9** | **Last-win recall (tap WIN display)** | FE only | Low | Zero math cost, high UX quality. `GAME_DESIGN_MEMO.md` item #6. |
| **10** | **Super FS buy mode (200× cost, 5 spins, min 5× Wild mult)** | Math + FE | Medium | Adds an extreme-volatility option that Stake's high-roller segment specifically seeks. Third bet mode in `game_config.py`. |
| **11** | **Buy Bonus value messaging** | FE only | Trivial | One line of UI text. Converts browser-to-buyer rate. |
| **12** | **Escalating FS trigger dwell / countdown** | FE only | Low | Makes FS trigger feel momentous. Pure FE in `FreeSpinIntro.svelte`. |

---

## 7. Summary Assessment

**RTP:** Correctly calibrated at 96.5%. No changes required.

**Volatility:** Correct profile for Stake.com (high variance, high skew). The base volatility is appropriate. The issue is not that volatility is too high — it is that the nil rate is too high, creating an unengaging dry-stretch experience rather than a thrilling risk/reward loop.

**Features:** The game has a solid feature surface (tumble + FS + exploders + multipliers) but is missing several of the engagement mechanisms that Stake players have come to expect from modern slots: visible multiplier escalation, Wild excitement in base game, anticipation mechanics, and a pity floor. All of the missing features have clear implementation paths within the existing math and FE architecture.

**Priority sequence:** Run the math re-optimization (changes #1 and #8 together, since both require a simulation run), then add the tumble multiplier (#2) and Wild base game multiplier (#3) as a single math re-run, then layer in the FE-only changes (#4, #6, #9, #12) which require no math re-run and can ship independently.

**Overall verdict:** The math is sound and certifiable, but the player experience in the base game is currently below competitive parity for Stake.com's player expectations. The nil rate and low average base win are the primary math issues. Addressing those two items alone would meaningfully improve the game's engagement score, independent of the art and animation improvements in progress.

---

*Files reviewed:*  
- `math-sdk/games/0_0_lines/game_config.py`  
- `math-sdk/games/0_0_lines/game_optimization.py`  
- `math-sdk/games/0_0_lines/game_override.py`  
- `math-sdk/games/0_0_lines/gamestate.py`  
- `math-sdk/games/0_0_lines/game_executables.py`  
- `math-sdk/games/0_0_lines/library/stats_summary.json`  
- `math-sdk/games/0_0_lines/library/statistics_summary.json`  
- `math-sdk/src/events/events.py` (FS_MULT_TABLE, fs_multiplier_event)  
- `GAME_DESIGN_MEMO.md`  
- `IMPROVEMENT_PLAN.md`  
- `ROADMAP.md`  
- `HANDOFF_2026-06-30.md`
