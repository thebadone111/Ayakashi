# Ayakashi — Pre-Submission Plan
**Date:** 2026-07-02 | **Branch:** final-dev | **Target:** Resubmission to Stake.com

Synthesized from: `REVIEW_FRONTEND.md` · `REVIEW_ART_STYLE.md` · `REVIEW_MATH_GAMEPLAY.md`

---

## The Three Root Problems

Before the task list: the three reviews converge on three root causes for the 3.7/9 score.

1. **The game feels dead.** Base game nil rate 70.9% — 7 of every 10 spins return nothing. Industry comparable for high-volatility: 45–60%. No symbol animations mean even winning spins have no visual payoff.
2. **The art is visually incomplete.** Zero symbol animations deployed. Static avatar. All numeric displays use another game's (Mining) bitmap fonts. Audio is placeholder from another game.
3. **The code has silent failures.** Avatar poses always undefined. Symbol win FX never fires. Foxfire swirl never plays. These are meant to be the "wow" moments — all of them are no-ops.

The order of this plan reflects that: math → art animations → art assets → code bugs → polish.

---

## P0 — Submission Blockers

These are hard stops. The game cannot be resubmitted without all of these done.

### P0-MATH-01: Re-run reel optimization to reduce dead spin rate
- **Problem:** `prob_nil = 0.709` (target ≤ 0.55). Root cause: basegame HR target is 3.5 — too loose.
- **Fix:** Re-run `math-sdk/games/0_0_lines/game_optimization.py` with `hr=5.0` for basegame fence instead of 3.5. Simultaneously raise basegame average win from 2.05× toward 4–5× by shifting `scale_factor` bias range to `(3, 8)` with `scale_factor=1.4`. Both changes require the same optimization run — do them together.
- **Source:** REVIEW_MATH §3.1, §3.2

### P0-MATH-02: Add tumble multiplier ladder
- **Problem:** `global_multiplier` field exists and is wired to the FE `globalMult` event — but is never incremented. Tumble chains have no mathematical escalation.
- **Fix:** In `gamestate.py` `run_spin` / `run_freespin`, add `self.global_multiplier += 1` on each tumble iteration instead of keeping it at 1. Reset at round end. The FE `tumbleWinStep` display already exists and will pick this up.
- **Expected impact:** FS average win rises from 74× to 120–200×. Base game tumble chains become moments.
- **Source:** REVIEW_MATH §4.1, §5.1

### P0-ART-01: Run all remaining Wan I2V animations
- **Status:** H1–H4 renders exist but not picked/baked. H5, L1–L5, W/S/M/X not run at all.
- **Action sequence:**
  1. H5 Bake-neko — run through v5 workflow (prompt ready in WAN_ANIMATION_PROMPTS.md)
  2. L1–L5 — run (prompts ready)
  3. W, S, M, X — prepare input images from `_atlas/` stills, write prose prompts (use WAN_ANIMATION_PROMPTS.md template), run
  4. Pick best render from each symbol (rife-upscaled preferred)
  5. Bake all 14 picked mp4s → WebP sprite sheets via `art/bake_sprites.py`
  6. Wire to `symbolIdle.ts` in engine
- **Note:** Update H1, H2, H5 prompts with "The mask faces the viewer flat-on, neither tilting nor rotating." — only H3/H4 have this fix currently.
- **Source:** REVIEW_ART §2a, §6a

### P0-ART-02: Run avatar I2V and deploy idle + win sheets
- **Status:** Old Wan runs exist (`avatar-wan-svi-*`) but were stripped. Need re-run through locked v5 SVI Pro workflow.
- **Action:** Re-run avatar through v5 single-pass workflow. Produce: idle loop (min 97 frames) + win state. Bake to 4×4 WebP sheets. Register `avatarIdleSheet`, `avatarCheer`, `avatarWink` in `game/assets.ts`.
- **Why critical:** The character-led win celebration is the game's biggest differentiator. Every big win currently fires `fxBus.emit('bigwin')` into a void. The avatar must be alive.
- **Source:** REVIEW_ART §2b, §6b; REVIEW_FRONTEND BUG-01

### P0-ART-03: Replace all four bitmap fonts
- **Status:** `goldFont`, `silverFont`, `purpleFont`, `goldBlur` are all the Mining reference game's `mm_*.xml` files. Purple is a style-guide-banned color.
- **Fix options (pick one):**
  - A) Generate Ayakashi-specific bitmap fonts: gold lacquer for wins (`#E8B94F`), moonlit silver for balance (`#D8E3F0`), seal red (`#A22429`) for loss — using the brush/sumi-e aesthetic
  - B) Pivot win/count displays to PixiJS `TextStyle` with NinjaKage or Scarfire brush font for titles, and styled WebGL text for numbers — drop the bitmap font dependency entirely
- **Remove:** `purpleFont` slot from `assets.ts` entirely — no use case in Ayakashi's palette.
- **Source:** REVIEW_ART §2c, §3a; REVIEW_FRONTEND MISSING-02

### P0-ART-04: Finalize bg_bg pick and confirm in-engine file
- **Status:** Three finalists at `art/generated/bg-2026-06-26/_picked/bg_bg_{flux03,seedream02,recraft01}.png`. Current in-engine `bg_bg.webp` may be a prior-generation file.
- **Fix:** Open all three finalists. Pick one. Convert to webp. Compare against in-engine file (pixel-diff or visual). Deploy chosen file as `static/assets/sprites/background/bg_bg.webp`. Document choice in HANDOFF.
- **Source:** REVIEW_ART §2g, §1b

### P0-ART-05: Wire generated chrome assets into engine
- **Status:** `art/generated/chrome-2026-06-27/reel_frame/_picked/B_sumi_brush_flux_02.png` and FS panel pick (`B_iron_plate_flux_03-nobg.png`) exist but are NOT deployed. In-engine chrome is older, lower quality.
- **Fix:** Convert chrome picks to webp → deploy as `reel_frame.webp` and `Frame_FSCounter2.webp` in `static/assets/sprites/reelsFrame/`. Verify layout still correct in-engine (no dimension change required).
- **Source:** REVIEW_ART §2e, §1e

### P0-FE-01: Fix avatar pose textures (BUG-01)
- **File:** `game/assets.ts`, `game/fxManager.ts`
- **Fix:** After P0-ART-02 delivers the pose sheets, register `avatarCheer` and `avatarWink` entries in `assets.ts`. Until then, remove the dead `setPoses` call from `fxManager.registerAvatar()` so the no-op is explicit, not silent.
- **Source:** REVIEW_FRONTEND BUG-01

### P0-FE-02: Fix symbol win FX never firing (BUG-03)
- **File:** `game/fxManager.ts` `winBurstAt()`, approx line 400
- **Problem:** `SymbolWinFx.play()` called with `symbol: undefined` — the elastic pop/shimmer/settle animations are entirely skipped on every win.
- **Fix:** Pass the actual symbol container from `stateGame.board[reel].reelState.symbols[row].container` into `winBurstAt`.
- **Source:** REVIEW_FRONTEND BUG-03

### P0-FE-03: Fix kanabo always using procedural fallback (BUG-02)
- **File:** `game/fxManager.ts` kanabo getter
- **Problem:** `texture('x2.png')` returns undefined — the key is wrong. The Oni kanabo art never appears on the club smash.
- **Fix:** Use the correct atlas frame key for the X symbol (match the key in `SYMBOL_INFO_MAP` `makeSymbolInfo('x2.png')`), or use `Texture.from('x2.png')` after atlas load.
- **Source:** REVIEW_FRONTEND BUG-02

### P0-FE-04: Fix PayTable phantom 5th row (BUG-09)
- **File:** `components/paytable/PayTableContent.svelte` line 51
- **Fix:** Change `const rows = 5` → `const rows = 4` (or derive from `BOARD_DIMENSIONS.y`).
- **Source:** REVIEW_FRONTEND BUG-09

### P0-FE-05: Fix misleading Buy Bonus copy (BUG-10)
- **File:** `components/ModalBuyBonusAyakashi.svelte` line 99
- **Problem:** "Enter Free Spins instantly with the Global Multiplier already active." — there is no Global Multiplier. This is a regulatory risk.
- **Fix:** Replace with: "Skip the wait. Enter Free Spins directly with bonus reels active. Ofuda Talismans may multiply your spin count at trigger."
- **Source:** REVIEW_FRONTEND BUG-10

### P0-FE-06: Ninja Kage commercial licence
- **File:** `game/fxManager.ts` line 62, `DISPLAY_FONT = 'Ninja Kage'`
- **Problem:** Demo/personal-use licence only. Using in a commercial gambling product is an IP violation.
- **Fix:** Purchase commercial licence OR swap `DISPLAY_FONT` to `'Yuji Syuku'` (already licensed, covers full character set).
- **Source:** REVIEW_FRONTEND MISSING-05

### P0-FE-07: Fix FreeSpinCounter text "FREE SPIN" → "FREE SPINS"
- **File:** `components/FreeSpinCounter.svelte` line 81
- **Fix:** One character change: `'FREE SPIN'` → `'FREE SPINS'`.
- **Source:** REVIEW_FRONTEND MISSING-07

---

## P1 — Pre-Submission Required (High Impact, Must Ship)

### P1-MATH-01: Add Wild multipliers in base game
- **Fix:** In `game_override.py` `assign_mult_property()`, add a base game distribution `{1:80, 2:15, 3:4, 5:1}` alongside the existing freegame distribution. Remove the `gametype == freegame_type` gate or add an elif branch.
- **Expected impact:** 12,450/100k Wild 5-OAK events now have a 20% chance of being 2–5× — creates shareable "big Wild" moments in base game.
- **Source:** REVIEW_MATH §3.3, §5.2

### P1-MATH-02: Activate near-miss anticipation (2-scatter slow-reel)
- **Status:** `anticipation_triggers` config and `revealEvent.anticipation` FE hook are fully wired. This is FE-only work.
- **Fix:** In `Board.svelte`, when `revealEvent.anticipation === true`, slow the remaining spinning reels to ~30% speed, activate edge glow on the two visible scatters, shift audio to taiko build. Math hook is already there.
- **Expected impact:** Highest single-session engagement spike available at zero math cost.
- **Source:** REVIEW_MATH §4.8, §5.3

### P1-MATH-03: Implement pity mechanic (20-spin dead-streak cap)
- **Fix:** Add a `"pity"` distribution bucket in `game_override.py` that forces a non-zero basegame win after N consecutive zero books. Can be invisible to player. No FE change required.
- **Why:** Directly addresses the 70.9% nil rate's worst-case player experience (50+ consecutive dead spins).
- **Source:** REVIEW_MATH §4.5, §5.4

### P1-ART-01: Audit and replace paper/ember/smoke particle textures
- **Status:** `paper.webp`, `ember.webp`, `smoke.webp` exist in static assets but have no art-generation session record — may be Mining reference assets.
- **Fix:** Open each file visually. If Mining-style: regenerate using PROMPT_GUIDE §4d particle template against Ayakashi palette. These appear in every win event — high-visibility if wrong style.
- **Source:** REVIEW_ART §3c, §2a

### P1-ART-02: Remove banned post-FX from postFx.ts
- **File:** `game/animations/postFx.ts`
- **Problem:** RGBSplitFilter, ZoomBlurFilter, GodrayFilter, ShockwaveFilter are all active — all banned in STYLE_GUIDE §9.
- **Fix:** Remove event-triggered kicks for `smash`, `bigwin`, `fsintro`. Keep AdvancedBloomFilter (always-on grading). Replace `impactKick` with `ticker.speed → 0.05` hit-stop (camera grammar, already exists). Replace the Graphics-circle shockwave in `winCelebration.ts` with an authored sprite-sheet ring.
- **Source:** REVIEW_ART §4a, §5c

### P1-ART-03: Replace pressToContinueText and coin sprite
- **pressToContinueText:** `MM_pressanywhere.json` is Mining Madness branding. Generate a brush-text "PRESS ANYWHERE" in NinjaKage/Scarfire, bake to WebP.
- **coin:** `SD2_Coin.json` is another reference game. Either generate a foxfire orb particle sheet OR replace the coin celebration burst with petal rain (already authored and wired).
- **Source:** REVIEW_ART §4d, §4g, §2b/2c

### P1-ART-04: Commission at least one audio track
- **Status:** All audio is Mining reference set. Japanese instrument candidates exist in `art/generated/audio/` (~50 per instrument category) but none selected.
- **Fix:** Auditionist the koto, shakuhachi, and taiko candidates. Commission or license a 90-second ambient basegame loop. Even one track distinguishes the game from a silent placeholder. Scatter sting and FS jingle are next priority.
- **Source:** REVIEW_ART §2d, §1i

### P1-FE-01: Fix camera zoom never releases on skip (BUG-12)
- **File:** `game/animations/winCelebration.ts`, `cameraGrammar.ts`
- **Fix:** Call `fxManager.camera().release()` in the teardown path of `WinCelebration.play()` — both on natural end and on `pointerdown` skip. Make `release()` idempotent.
- **Source:** REVIEW_FRONTEND BUG-12

### P1-FE-02: Fix foxfire swirl never called (BUG-07)
- **File:** `game/animations/winCelebration.ts`
- **Fix:** Call `startFoxfireSwirl()` in the appropriate phase of `play()` (after title appears, concurrent with count-up). Or delete it if intentionally cut — do not leave a dead method.
- **Source:** REVIEW_FRONTEND BUG-07

### P1-FE-03: Fix createBonusSnapshot race condition (BUG-05)
- **File:** `game/bookEventHandlerMap.ts` lines 357–358
- **Fix:** Add `await` to both `updateFreeSpin` and `setTotalWin` `playBookEvent` calls in the snapshot replay, or collect in `Promise.all` after trigger resolves.
- **Source:** REVIEW_FRONTEND BUG-05

### P1-FE-04: Remove bgEffect/bgMist preload or wire them back (BUG-06)
- **File:** `game/assets.ts` lines 29–38
- **Fix:** If background layers are returning: pass them into `BackgroundAmbient`. If not: change `preload: true` → `false` or remove the declarations. They are delaying first paint for nothing.
- **Source:** REVIEW_FRONTEND BUG-06

### P1-FE-05: Portrait layout — add FS counter and avatar for mobile (MISSING-04)
- **File:** `components/Game.svelte`
- **Problem:** Portrait players have no free spin counter and no avatar. FS counter is critical information.
- **Fix:** Design portrait position for FS counter (above/below reels). Consider simplified avatar banner for portrait.
- **Source:** REVIEW_FRONTEND MISSING-04

### P1-FE-06: Add Buy Bonus value messaging
- **File:** `components/ModalBuyBonusAyakashi.svelte`
- **Fix:** Add "Average win: ~74× your bet" under the bonus card. One line of UI text, converts browser to buyer.
- **Source:** REVIEW_MATH §5.7

### P1-FE-07: Wire brushWide.webp into WinCelebration
- **File:** `components/Game.svelte` → `WinCelebration` constructor
- **Fix:** Confirm `brushTexture: assets.brushWide` is passed to `WinCelebration` options. If not, the banner falls back to the procedural orange rounded-rect blob for every win tier.
- **Source:** REVIEW_ART §3b

---

## P2 — High Value (Ship If Time Permits)

### P2-MATH-01: Ante bet mode (1.25× cost, higher scatter frequency)
- **Fix:** Add third `BetMode` in `game_config.py` — `ante` at 1.25× cost with scatter_triggers weight shifted toward higher probability (3-scatter weight 50→70). The `BetMode` SDK infrastructure exists. The dead `SUPERSPIN` key in `bookEventHandlerMap.ts` (BUG-04) is the FE hook waiting for a real mode.
- **Source:** REVIEW_MATH §4.2

### P2-MATH-02: Fix Buy Bonus kurtosis (pathological fat tail)
- **Status:** Bonus mode `excess_kurtosis = 2,141,421,828` — most sessions return small, tiny fraction huge.
- **Fix:** Re-run bonus optimizer with tighter `min_m2m`/`max_m2m` parameters and constrained win range distribution.
- **Source:** REVIEW_MATH §3.5

### P2-ART-01: Re-generate low symbol washi texture
- **Problem:** L1–L5 kanji paper backing reads as flat procedural texture. STYLE_GUIDE calls for "aged ivory mulberry-bark washi, torn rough edges, subtle sakura petal embossing."
- **Fix:** Run washi texture prompt fresh. Pick candidate with visible torn-edge character at 1024 px. Regenerate all 5 lows with new paper backing.
- **Source:** REVIEW_ART §3d

### P2-ART-02: Theme freeSpins sprite sheet and payFrame
- **Status:** Both are SDK reference assets with no Ayakashi origin.
- **Fix:** Use chrome generation session style to regenerate. FS counter panel gen exists (`Frame_FSCounter2`) — that one just needs deployment. payFrame needs a fresh gen with lacquer/washi aesthetic.
- **Source:** REVIEW_ART §4e, §4f

### P2-FE-01: Cache vignette texture in WinCelebration (BUG-08)
- **File:** `game/animations/winCelebration.ts` `buildVignette()`
- **Fix:** Compute vignette texture once in constructor (or on first `play()`), cache it, reuse across all big-win plays. Destroy only in `destroy()`.
- **Source:** REVIEW_FRONTEND BUG-08

### P2-FE-02: Fix SUPERSPIN dead code (BUG-04)
- **File:** `game/bookEventHandlerMap.ts` line 32
- **Fix:** Remove the `activeBetModeKey === 'SUPERSPIN'` branch. Or replace it with the real ante bet mode key if P2-MATH-01 is implemented.
- **Source:** REVIEW_FRONTEND BUG-04

### P2-FE-03: Add bet guards to Buy Bonus modal (BUG-11)
- **File:** `components/ModalBuyBonusAyakashi.svelte` lines 120–130
- **Fix:** Apply `atMin`/`atMax` clamps to the −/+ buttons. Apply `disabled` + visual dimming at boundaries.
- **Source:** REVIEW_FRONTEND BUG-11

### P2-FE-04: Fix WinCelebration listener leak (QUALITY-06)
- **File:** `game/animations/winCelebration.ts`
- **Fix:** Wrap play body in `try { ... } finally { window.removeEventListener(...) }`.
- **Source:** REVIEW_FRONTEND QUALITY-06

### P2-FE-05: Fix backgroundAmbient cover scale computed every frame (QUALITY-05)
- **File:** `game/animations/backgroundAmbient.ts` `update()`
- **Fix:** Compute cover scale once on load + on resize event. Remove from tick loop.
- **Source:** REVIEW_FRONTEND QUALITY-05, PERF-01

### P2-FE-06: Remove dead Spine animation fields from winLevelMap (QUALITY-10)
- **File:** `game/winLevelMap.ts`
- **Fix:** Remove `animation: { intro, idle, outro }` from the type and all entries. The game is fully procedural — these Spine name strings are dead data.
- **Source:** REVIEW_FRONTEND QUALITY-10

### P2-FE-07: Last-win recall (tap WIN display re-runs payline presentation)
- **Source:** REVIEW_MATH §5.5, GAME_DESIGN_MEMO item #6
- **Fix:** FE-only. Tapping the WIN display re-fires the last `winInfo` payline presentation. Helps players understand complex tumble wins.

---

## P3 — Polish (Post-Threshold Submission)

### P3-ART-01: Logo regeneration via Ideogram v3
- Current SVG logo predates the fal.ai pipeline. Run Ideogram v3 on the `ayakashi_logo` prompt for a typographically cleaner version.

### P3-ART-02: Loading screen animation
- Animated kitsune or foxfire motif crossing the progress bar. Avatar idle sheet (P0-ART-02) can be repurposed here.

### P3-ART-03: Theme pay table and game rules modals
- Replace stock SDK panels with washi-paper backdrop + lacquer frame (use chrome gen session as reference).

### P3-ART-04: Avatar panel lacquered frame
- Right-side avatar panel has flat background. Add lacquered frame + foxfire lantern motif from chrome gen session.

### P3-ART-05: Generate remaining missing particle textures
- Spark, orb_ring, seal_glow — currently all procedural glow-dot fallbacks. Generate authored textures from PROMPT_GUIDE particle template.

### P3-ART-06: Betting bar final polish
- Icon tint pass (white icons on dark buttons), ground strip, spin button glow ring. Carried from HANDOFF §6.

### P3-ART-07: Author landing and big-win animation types
- Current Wan prompts cover win-loop only. Landing (snap-in + impact flash) and big-win surge are separate animation types needing separate prose prompts + runs.

### P3-MATH-01: Sticky Wilds in Free Spins
- After tumble resolution, mark any W on a non-exploding position as `sticky=True`, prevent reset by `draw_board`. The foxfire Wild particle is already themed for this. Medium complexity.

### P3-MATH-02: Super FS buy mode (200× cost, 5 spins, min 5× Wild mult)
- Third BetMode in `game_config.py`. Adds extreme-volatility option for Stake high-rollers.

### P3-FE-01: Escalating FS trigger dwell
- 3 scatters land → lock board 1s → show "3 SCATTERS — 8 FREE SPINS" before screen transition. Pure FE in `FreeSpinIntro.svelte`.

### P3-FE-02: Game version from package.json
- **File:** `components/Game.svelte`, `vite.config.ts`
- Add `define: { __APP_VERSION__: JSON.stringify(pkg.version) }` and use `__APP_VERSION__` instead of `"1.0.0"`.

### P3-FE-03: FreeSpins autoDismiss 30s → 10–15s
- **File:** `game/animations/freeSpinsScreen.ts`
- Most operators require 10–15s. Check operator requirements before submission.

---

## Not This Release

These are valid improvements identified in the reviews but scope them out for Ayakashi 2 or a post-ship update:

- **Collect symbols / Coin accumulator** (GAME_DESIGN_MEMO Hyaku Respin mode) — full secondary mode, not a quick add
- **Symbol transformation mechanic** (L→H upgrades) — medium math + FE complexity
- **Logo on loading screen animation** — depends on P3-ART-01 and P3-ART-02 both done first
- **Payline ticker batching** (PERF-03) — negligible at 5–15 active lines
- **ParticlePool O(n) scan** (PERF-04) — not a bottleneck at current pool sizes
- **H5 in HIGH_SYMBOLS but not on reels** (QUALITY-02) — investigate before shipping: is H5 intentionally cut from reels or a data error?

---

## Execution Order

**Phase 1 — Math re-run (do this first, everything else can happen in parallel)**
1. P0-MATH-01 (nil rate optimization + higher base win)
2. P0-MATH-02 (tumble multiplier)
3. P1-MATH-01 (Wild base game multipliers)
→ Single optimization run covers all three. Then re-verify stats.

**Phase 2 — Art (can start immediately, parallel with Phase 1)**
- RunPod: Run H5, L1–L5, W/S/M/X Wan animations (P0-ART-01)
- RunPod: Re-run avatar I2V (P0-ART-02)
- Local: bg_bg pick + deploy (P0-ART-04)
- Local: Chrome assets deploy (P0-ART-05)
- Local: Replace bitmap fonts (P0-ART-03)
- Local: Audit paper/ember/smoke particles (P1-ART-01)

**Phase 3 — Code bugs (unblock with art assets in hand)**
- P0-FE-01 through P0-FE-07 (all blockers, ~1 day)
- P1-FE-01 through P1-FE-07 (required polish, ~1 day)

**Phase 4 — FE features**
- P1-MATH-02 near-miss anticipation (FE-only, hook wired)
- P1-MATH-03 pity mechanic
- P2-FE-* items

**Phase 5 — Pre-submission QA**
- Verify H5 in reel strips (QUALITY-02 investigation)
- Confirm Ninja Kage licence or swap font (P0-FE-06)
- Regulatory copy review (P0-FE-05 Buy Bonus copy)
- Audio: at least one track deployed (P1-ART-04)

---

## Quick Reference: Impact vs Effort Matrix

| Item | Impact | Effort | Phase |
|------|--------|--------|-------|
| Nil rate optimization (P0-MATH-01+02) | CRITICAL | High | 1 |
| Symbol animations baked + wired (P0-ART-01) | CRITICAL | High | 2 |
| Avatar I2V (P0-ART-02) | CRITICAL | Medium | 2 |
| Bitmap fonts replaced (P0-ART-03) | CRITICAL | Medium | 2 |
| Symbol win FX fix (P0-FE-02) | CRITICAL | Low | 3 |
| Avatar pose textures fix (P0-FE-01) | CRITICAL | Low | 3 |
| Near-miss anticipation (P1-MATH-02) | HIGH | Low | 4 |
| Wild base game multipliers (P1-MATH-01) | HIGH | Low | 1 |
| Post-FX style guide compliance (P1-ART-02) | HIGH | Medium | 2 |
| Audio (at least 1 track) (P1-ART-04) | HIGH | High | 2/5 |
| Buy Bonus copy fix (P0-FE-05) | HIGH | Trivial | 3 |
| PayTable row fix (P0-FE-04) | MEDIUM | Trivial | 3 |
| Buy Bonus value messaging (P1-FE-06) | MEDIUM | Trivial | 3 |
| Pity mechanic (P1-MATH-03) | MEDIUM | Low | 4 |
| Portrait FS counter (P1-FE-05) | MEDIUM | Medium | 4 |
