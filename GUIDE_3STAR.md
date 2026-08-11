# Ayakashi — 3-Star Submission Guide

**Written:** 2026-07-02 | **Branch:** final-dev | **Score to beat:** 4.5 / 9

This is the authoritative pre-submission reference. It supersedes the task lists in `plan.md`, `IMPROVEMENT_PLAN.md`, and `HANDOFF_2026-06-30.md` for any question of priority or definition of done.

---

## STATUS — updated 2026-07-03

**All code and math work in this guide is DONE.** The §7 checklist below is
ticked item-by-item; what remains is generation/audition work plus final
human QA. Remaining work lives in `ASSETS_TO_GENERATE.md` (assets + prompts).

| Phase | Status |
|-------|--------|
| P1 Math | **DONE** — prob_nil 0.551, RTP 0.965, tumble ladder + base Wild mults live, config.ts synced, `_verify_books.py` passes. Pity bucket: not implementable in stateless RGS (see note in checklist). |
| P2 Animation | **Renders partial, wiring pending** — H1–H4 Wan renders exist (H1/H3 good; **H2/H4 drift off-design, re-run**). H5/L1–L5/W/S/M/X not run (all prompts ready, incl. new W/S/M/X). Avatar idle candidates already rendered (`art/generated/avatar-wan-svi-idle-avatar-2026-06-27`, `avatar-idle-seedance-2026-06-27`) — pick & bake; cheer not rendered. Flipbook playback needs wiring in `symbolIdle.ts`. |
| P3 Assets | **DONE except audio + logo licence** — mm_*/SD2_*/MM_* all removed or renamed; fonts pivoted to Yuji Syuku (bitmap fonts deleted, no consumers); NinjaKage removed from runtime (logo webp still derives from the demo face — rebake or license); bg/chrome/particles confirmed deployed originals. Audio still 100% Mining — see ASSETS_TO_GENERATE §5. |
| P4 Bugs | **DONE** — BUG-01..12, MISSING-04/07, QUALITY-01, P1-FE-07, P1-ART-02 all fixed. Verified: svelte-check 187→181 errors (net −6), Storybook smoke run zero console errors, no reference filenames among 250 loaded resources. |
| P5 Feel | **DONE** — anticipation + FS dwell verified already wired; buy-bonus value line added ("~96×", from real stats — the 74× below is stale); Wild badge verified. |
| P6 QA | **Code items done** (version const, autoDismiss 12 s, console sweep, H5 removed, paytable/rules content corrected + Ofuda table added). Human play sessions (desktop 30 min / portrait 15 min) still to run. |

---

## 1. What "3-Star" Means — The Reviewer's Lens

The 3.7/9 score came with four explicit reviewer callouts: **low quality assets, inconsistent art style, poor animations, poor bet UI bar.** The threshold to pass is 4.5/9.

Based on those callouts and the full review audit, Stake.com reviewers are evaluating these dimensions:

### The Evaluation Matrix

| Dimension | Weight | What Reviewers Actually Check |
|-----------|--------|-------------------------------|
| **Art Cohesion** | Very High | Do all assets — symbols, chrome, fonts, particles, modals — share a single visual language? Does anything look like it was copied from another game? |
| **Animation Quality** | Very High | Do winning symbols react? Does the avatar move? Do special events (big win, free spins entry) feel earned, or does the board just sit there? |
| **Math Feel** | High | Does every 10th spin feel like something happened? (They spin it.) Dead-spin streaks of 20+ are a red flag. Does a win feel meaningful in size? |
| **Audio Authenticity** | High | Does the game sound like itself? Any reference-game audio is immediately detected by experienced reviewers who have played those games. |
| **UI Completeness** | Medium | Are there obvious bugs visible in a 10-minute play session? Does the paytable render correctly? Do modals open? Are font sizes readable? |
| **Code Hygiene** | Medium | Do elements disappear, misfire, or produce console errors? Visible silent failures (no avatar reaction, no FX on wins) read as an unfinished game. |

### Concrete 3-Star Thresholds

These are the specific bars, derived from the review documents, that define a passing submission:

1. **All assets share a single visual style.** No Mining Madness fonts, no SD2_Coin, no MM_pressanywhere textures, no reference-game audio.
2. **Animated symbols on at least the 5 high-value symbols** (H1–H5). Static symbols are the #1 visual failure in the current game.
3. **Animated avatar.** The avatar must play an idle loop and a win reaction. A static PNG is an incomplete implementation, not a ship state.
4. **Base game dead-spin rate ≤ 55%.** Current: 70.9%. The game must not deal 7 dead spins out of every 10.
5. **No factually incorrect bonus copy.** "Global Multiplier" claim is a regulatory risk and a trust failure.
6. **Font licence confirmed.** Ninja Kage requires a commercial licence before any submission.
7. **Zero visible UI bugs.** PayTable phantom row (BUG-09), camera zoom freeze on skip (BUG-12), and "FREE SPIN" singular (MISSING-07) are all visible in a standard play session.
8. **At least one Ayakashi-specific audio track.** The base game loop is the minimum. Silent or Mining-audio games are rejected.
9. **Win FX fires on wins.** Symbol win burst (BUG-03) currently never plays — a reviewer landing a 5-of-a-kind sees nothing happen at the symbol level.
10. **Portrait layout shows free spin counter.** Portrait mobile players have no spin count visibility during the feature — this reads as a broken game.

---

## 2. Current State Scorecard

Score = where the game is today without further work.

| Dimension | Score Now | Score After All P0 | Score After All P0+P1 | Target |
|-----------|-----------|-------------------|----------------------|--------|
| **Art Cohesion** | 3/10 | 7/10 | 8/10 | 7+ |
| **Animation** | 1/10 | 5/10 | 7/10 | 6+ |
| **Math Feel** | 3/10 | 6/10 | 8/10 | 6+ |
| **Audio** | 1/10 | 1/10 | 5/10 | 5+ |
| **UI / Code** | 4/10 | 7/10 | 8/10 | 7+ |
| **Overall** | **~3.7/9** | **~5/9** | **~6.5/9** | **4.5+** |

### Why each dimension scores what it scores now

**Art Cohesion: 3/10.** Symbol stills are high quality. Everything else is either a Mining reference asset (4 bitmap fonts, coin sprite, press-to-continue text, audio) or an undeployed improvement (chrome gen exists but not deployed, bg_bg pick not made). The positive and negative cancel each other at roughly 3.

**Animation: 1/10.** Zero symbol animations in-engine. Avatar is static. Win burst FX (BUG-03) never fires. Foxfire swirl (BUG-07) never fires. Avatar pose textures (BUG-01) always undefined. The only functioning animations are petals (ambient, correct) and kanabo smash (correct, but misses the art asset via BUG-02).

**Math Feel: 3/10.** RTP is correctly calibrated. Mechanics are sound. But 70.9% nil rate and 2.05× average base win mean most sessions feel like a money drain with no moments. Tumble multiplier exists in the data model but is not incremented — the escalation is dead.

**Audio: 1/10.** 100% reference-game audio. Nothing to score here except that it doesn't crash.

**UI / Code: 4/10.** Core game loop functions. Betting bar redesign is complete. But 12 bugs documented in REVIEW_FRONTEND (BUG-01 through BUG-12), several immediately visible (PayTable phantom row, camera freeze, singular "FREE SPIN"). The font is a licence violation.

---

## 3. Gap Analysis — What Reviewers Notice First

Ordered by when a reviewer encounters the problem during a 15-minute session:

### First 30 seconds (loading → first spin)
- **Loading screen:** static logo, no animation — low impact but sets tone
- **Base game audio:** Mining-game BGM plays immediately — instantly detectable as wrong

### First 2 minutes (observing symbols and wins)
- **Symbol font:** win amounts display in Mining gold/silver bitmap fonts — the most prominent per-spin indicator of a reskin
- **Dead spins:** at 70.9%, the reviewer will see many consecutive nothing returns
- **Win FX:** on wins that do land, SymbolWinFx never fires (BUG-03) — symbols don't react at all
- **Symbol animation:** none — even small wins on H1–H5 produce no visual feedback on the symbols themselves

### Minutes 2–5 (opening modals, checking paytable)
- **Paytable:** phantom 5th row appears (BUG-09), visible bug
- **"FREE SPIN" singular** in counter (MISSING-07), reads as unfinished
- **Buy Bonus modal:** "Global Multiplier already active" — factually wrong
- **Paytable and game rules modals:** completely unthemed, stock SDK panels

### Minutes 5–10 (waiting for features)
- **Near-miss anticipation:** 2 scatters land silently with no slowdown or glow — zero anticipation
- **Tumble chains:** when cascades happen, no multiplier ladder — visually underwhelming

### Minutes 10–15 (if they get free spins)
- **Avatar on big win:** static — fxBus.emit('bigwin') fires into a void
- **Free spins entry:** no dwell / countdown before mode switch
- **FS counter text:** "FREE SPIN" (singular) visible throughout

### After session
- **No win recall:** can't re-examine a complex tumble win
- **Camera zoom freeze:** if they skip a celebration, the board may stay zoomed during next spin (BUG-12)

---

## 4. Phase-by-Phase Execution Plan

### Phase 1 — Math Foundation

**Goal:** After this phase, a reviewer spinning 100 times sees a win roughly every 2 spins (not every 3.4), wins feel meaningfully large, and tumble chains escalate with visible multiplier badges.

**Tasks:**

1. **Re-run reel optimization** (`math-sdk/games/0_0_lines/game_optimization.py`)
   - Change `ConstructConditions(hr=3.5, ...)` → `hr=5.0` for the basegame fence
   - Shift scale_factor bias range from `(1,2)` → `(3,8)` with `scale_factor=1.4` to lift average base win toward 4–5×
   - Target: `prob_nil ≤ 0.55`, `av_win ≥ 4.0×`
   - Regenerate `library/stats_summary.json` and `library/statistics_summary.json`
   - Run `apps/lines/sync-config.py` to regenerate `game/config.ts`

2. **Wire tumble multiplier** (`math-sdk/games/0_0_lines/gamestate.py`)
   - In `run_spin()` and `run_freespin()`, replace `self.global_multiplier = 1` (or equivalent constant) with `self.global_multiplier += 1` on each tumble iteration
   - Reset to 1 at the start of each new round
   - The FE `tumbleWinStep` display and `globalMult` event are already wired — no FE changes needed for basic operation

3. **Add Wild multipliers in base game** (`math-sdk/games/0_0_lines/game_override.py`)
   - In `assign_mult_property()`, add base game distribution `{1:80, 2:15, 3:4, 5:1}` alongside the freegame distribution
   - Remove or add an `elif` branch to the `gametype == freegame_type` gate

4. **Add pity mechanic** (`math-sdk/games/0_0_lines/game_override.py`)
   - Add a `"pity"` distribution bucket that forces a non-zero basegame win after 20 consecutive zero-win books
   - No FE change required

5. **Verify the optimized stats meet targets** — check new `stats_summary.json`:
   - `prob_nil ≤ 0.55`
   - `mode_fence_info.base.basegame.av_win ≥ 3.5`
   - RTP still reads `0.965 ± 0.002`

**Definition of Done:** `stats_summary.json` shows `prob_nil ≤ 0.55`. `config.ts` regenerated. Game loads and completes 100 spins in Storybook without error.

**Estimated effort:** 4–8 hours (the optimization run itself takes compute time; math changes are minimal code)

**Risk:** The optimization run may converge on parameters that push RTP outside tolerance. Run with `min_rtp=0.963, max_rtp=0.967` guards. If it fails to converge with both nil rate and win targets simultaneously, prioritize nil rate (the larger player-experience problem) and accept av_win at 3×.

---

### Phase 2 — Animation Pipeline

**Goal:** After this phase, all 14 symbols have idle/win animations deployed, the avatar plays an idle loop and a win reaction, and the browser console shows no "texture undefined" errors for animation assets.

**Tasks:**

**2A. Run remaining Wan I2V renders (RunPod)**

Working workflow: `C:\Users\tiger\Downloads\Wan 2.2 I2V 3 pass v5.json`

Per symbol: swap input image in LoadImage node 97, swap prompt in CR Prompt Text node 366, run, collect `Render-rife-upscaled` as primary pick.

Run queue (in this order):
- H2 Kitsune-men — prompt loaded, run immediately
- H3 Daitengu — input at `art/wan-animations/h3-daitengu/input.png`
- H4 Ko-omote — input at `art/wan-animations/h4-ko-omote/input.png`
- H5 Bake-neko — input at `art/wan-animations/h5-bake-neko/input.png`; update prompt with "The mask faces the viewer flat-on, neither tilting nor rotating."
- L1–L5 — inputs at `art/wan-animations/l[1-5]-*/input.png`; all prompts ready in `WAN_ANIMATION_PROMPTS.md`
- W, S, M, X — no input images exist yet. Pull stills from `art/generated/symbols-2026-06-26/_atlas/w.png`, `s.png`, `m.png`, `x.png`. Write prose prompts using the `WAN_ANIMATION_PROMPTS.md` template. Run.

Note on H1 and H2 prompts: add "The mask faces the viewer flat-on, neither tilting nor rotating." — this fix is already in H3/H4 prompts but missing from H1/H2.

**2B. Pick best renders and bake sprite sheets**

For each symbol: review the 4 output variants (Render, Render-rife, Render-upscaled, Render-rife-upscaled). Pick the cleanest motion with least drift. `Render-rife-upscaled` is usually best.

Bake all picked mp4s to WebP sprite sheets:
```
python art/bake_sprites.py --input art/wan-animations/h1-ao-oni/output/Render-rife-upscaled_00001.mp4 --out web-sdk/apps/lines/static/assets/sprites/symbols/h1_idle.webp
```
(Repeat for all 14 symbols.)

**2C. Wire animation sheets to engine** (`web-sdk/apps/lines/src/game/symbolIdle.ts`)

Register each baked sheet. The `symbolIdle.ts` file already has the wiring architecture — add the 14 entries. Confirm the idle loop plays on the board at runtime.

**2D. Avatar I2V — re-run through v5 workflow**

Re-run avatar still (`art/generated/avatar-2026-06-26/_picked/avatar.png`) through the locked v5 workflow. Produce minimum two states:
- Idle loop (97 frames, subtle breathing + hair movement)
- Win reaction (97 frames, celebratory gesture)

Bake each to a 4×4 WebP sprite sheet at 256px per frame.

Register in `game/assets.ts`:
```ts
avatarIdleSheet: { src: 'sprites/avatar/avatar_idle.webp', preload: true },
avatarCheer: { src: 'sprites/avatar/avatar_cheer.webp', preload: true },
```

**Definition of Done:** Play the game in Storybook. On any winning spin, symbols in the winning positions cycle their idle animation. Trigger a big win — avatar plays the cheer animation. Check browser console: zero "texture undefined" warnings for avatar or symbol assets.

**Estimated effort:** 2–3 days (dominated by RunPod render time, not coding)

**Risk:** Wan renders may produce drifting/morphing masks (the mask faces moving off-center). Mitigate with the flat-on viewer fix in prompts. If a symbol still drifts badly across all 4 output variants, fall back to a 6-frame procedural idle breath (scale 1.0→1.03→1.0 tween loop) rather than leaving it static. Procedural idle is acceptable for lows; unacceptable for highs.

---

### Phase 3 — Asset Replacement

**Goal:** After this phase, a reviewer sees no Mining reference assets. Every visual element has an Ayakashi origin.

**Tasks:**

**3A. Replace all four bitmap fonts** (`game/assets.ts` lines 78–93)

Current files to replace:
- `mm_gold.xml` / `mm_gold.png` → Ayakashi gold lacquer font
- `miningfont_gold_blur.xml` → Ayakashi gold blur
- `mm_silver.xml` → Ayakashi moonlit silver font
- `mm_purple.xml` → REMOVE this slot entirely or repurpose to foxfire-blue

Options (pick one, do not mix):
- **Option A (generate):** Commission/generate bitmap font sheets with gold lacquer (`#E8B94F`) for wins, moonlit silver (`#D8E3F0`) for balance. Use the brush/sumi-e aesthetic. Run through `art/build-fonts.py` if the pipeline exists.
- **Option B (pivot to TextStyle):** Replace BitmapText instances with PixiJS `TextStyle` using Yuji Syuku (already licensed, covers full character set). Set `fill: '#E8B94F'` for win amounts, `fill: '#D8E3F0'` for balance. This eliminates the bitmap font dependency.

Remove `purpleFont` from `assets.ts`. The style guide bans purple; there is no Ayakashi use case for it.

**3B. Finalize and deploy bg_bg** (`static/assets/sprites/background/bg_bg.webp`)

Open the three finalists: `art/generated/bg-2026-06-26/_picked/bg_bg_flux03.png`, `bg_bg_seedream02.png`, `bg_bg_recraft01.png`. Pick one. Convert to webp. Compare pixel-diff against the current `bg_bg.webp` in-engine. Deploy the chosen file. Document the pick in this section.

**3C. Deploy generated chrome assets**

- Convert `art/generated/chrome-2026-06-27/reel_frame/_picked/B_sumi_brush_flux_02.png` → webp
- Deploy as `static/assets/sprites/reelsFrame/reel_frame.webp` (replace current)
- Convert `art/generated/chrome-2026-06-27/fs_panel/_picked/B_iron_plate_flux_03-nobg.png` → webp
- Deploy as `static/assets/sprites/reelsFrame/Frame_FSCounter2.webp` (replace current)
- Verify layout is correct in-engine after deploy

**3D. Audit and replace particle textures**

Open `static/assets/sprites/particles/paper.webp`, `ember.webp`, `smoke.webp`. If these are Mining reference assets (check pixel content — they will look like the coin-mine aesthetic, not ink/washi): regenerate using `PROMPT_GUIDE §4d` particle template. Deploy replacements.

**3E. Replace press-to-continue and coin assets**

- `MM_pressanywhere.json`: Generate a brush-text "PRESS ANYWHERE" in Yuji Syuku or NinjaKage, bake to webp. Replace in `static/assets/sprites/pressToContinueText/`.
- `SD2_Coin.json`: Replace with foxfire orb particle sheet OR wire petal rain as the win burst (petal sheets are already authored and deployed — redirect the coin burst emitter to use petals instead).

**3F. Resolve Ninja Kage font licence** (`game/fxManager.ts` line 62: `DISPLAY_FONT = 'Ninja Kage'`)

Decision required before this task closes:
- **If purchasing commercial licence:** confirm and document the purchase. Add licence file to repo.
- **If swapping:** change `DISPLAY_FONT` to `'Yuji Syuku'` (already has a commercial OFL licence). Verify all title renders (BIG WIN, SUPER WIN, etc.) still look acceptable.

Do not submit with an unresolved licence question.

**3G. Commission at least one audio track** (`static/assets/audio/`)

The 50 curated candidates in `art/generated/audio/` (koto, shakuhachi, taiko, gong, kabuki, shamisen, wood-hit) have not been reviewed. Minimum required for submission:
- 1 × basegame ambient BGM loop (90 seconds, koto + shakuhachi + taiko pulse)
- Scatter sting (2–3 seconds, temple bell + drum hit)
- Big win flourish (3–5 seconds)

Auditionist the existing candidates. If none are usable, commission from Fiverr/Artstation or license from Pond5 (Japanese instruments category). Even a single licensed ambient loop removes the "entirely wrong audio" disqualifier.

Wire into `game/sound.ts` and `game/assets.ts`. Replace the Mining audio keys with Ayakashi-appropriate key names.

**Definition of Done:** Open the game. Every visible text element uses a non-Mining font. Background matches one of the three finalist picks. Chrome matches the generated chrome session. Open the browser devtools network tab — no files with `mm_`, `SD2_`, or `MM_` in the name load from the Ayakashi app. Game audio plays and is not Mining-game audio.

**Estimated effort:** 3–4 days (audio is the long pole — font replacement is a day, chrome/bg is a few hours)

**Risk:** Bitmap font generation may not produce legible glyphs at small sizes (bet/balance displays). Test at minimum display sizes before committing. Option B (TextStyle pivot) is the safer fallback and takes less time.

---

### Phase 4 — Code Bug Fixes

**Goal:** After this phase, a 30-minute play session produces zero visible bugs and zero console errors that indicate broken FX paths.

**Tasks, in priority order:**

**CRITICAL — Fix before any QA session:**

- **BUG-03** (`game/fxManager.ts` `winBurstAt()`, approx. line 400): Pass actual symbol container from `stateGame.board[reel].reelState.symbols[row].container` into `SymbolWinFx.play()`. Currently called with `symbol: undefined` — the elastic pop/shimmer/settle is entirely skipped on every win.

- **BUG-01** (`game/fxManager.ts` `registerAvatar()`, ~line 320): After Phase 2 delivers pose sheets, register `avatarCheer` and `avatarWink` in `assets.ts`. Until Phase 2 is done, remove the dead `setPoses` call so the no-op is explicit.

- **BUG-02** (`game/fxManager.ts` kanabo getter, ~line 350): Replace `texture('x2.png')` with the correct atlas key. Check `SYMBOL_INFO_MAP` for the X symbol's registered key, or use `Texture.from('x2.png')` after atlas load. The Oni Kanabo art must display on smash.

- **BUG-09** (`components/paytable/PayTableContent.svelte` line 51): Change `const rows = 5` → `const rows = 4`. The phantom 5th row in the payline diagram is a visible bug in the most-inspected modal.

- **BUG-10** (`components/ModalBuyBonusAyakashi.svelte` line 99): Replace "Enter Free Spins instantly with the Global Multiplier already active." with "Skip the wait. Enter Free Spins directly with bonus reels active. Ofuda Talismans may multiply your spin count at trigger." This is a regulatory risk as written.

- **MISSING-07** (`components/FreeSpinCounter.svelte` line 81): Change `'FREE SPIN'` → `'FREE SPINS'`.

**HIGH — Fix before submission:**

- **BUG-12** (`game/animations/winCelebration.ts`): Call `fxManager.camera().release()` in the teardown path of `WinCelebration.play()` — both on natural end and on `pointerdown` skip. The 9-second auto-timeout currently runs after the board returns to normal, causing mid-spin zoom snaps.

- **BUG-07** (`game/animations/winCelebration.ts`): Either call `startFoxfireSwirl()` in the appropriate phase of `play()` (after title appears, concurrent with count-up), or delete the method. Dead defined-but-never-called FX is a code review failure.

- **BUG-05** (`game/bookEventHandlerMap.ts` lines 357–358): Add `await` to the `updateFreeSpin` and `setTotalWin` `playBookEvent` calls, or collect in `Promise.all`. Race condition on bonus snapshot resume.

- **BUG-06** (`game/assets.ts` lines 29–38): Either wire `bgEffect` and `bgMist` into `BackgroundAmbient` or change `preload: true` → `false`. Dead preloads waste load time.

- **MISSING-04** (`components/Game.svelte`): Design a portrait position for `FreeSpinCounter`. Portrait players currently have no spin count visibility. At minimum move it above the reels with reduced size.

**MEDIUM — Fix if time allows:**

- **BUG-04** (`game/bookEventHandlerMap.ts` line 32): Remove the permanently-false `activeBetModeKey === 'SUPERSPIN'` branch.
- **BUG-08** (`game/animations/winCelebration.ts`): Cache vignette texture in constructor instead of allocating per big-win play.
- **BUG-11** (`components/ModalBuyBonusAyakashi.svelte` lines 120–130): Apply `atMin`/`atMax` clamps to bet adjust buttons.
- **QUALITY-01** (`game/bookEventHandlerMap.ts` line 164): Remove the `console.info('[fx] kanabo smash x', ...)` before submission — it fires on every cascade.

**Additional code tasks:**

- **P1-FE-07** (`components/Game.svelte` → `WinCelebration` constructor): Confirm `brushTexture: assets.brushWide` is passed to `WinCelebration`. If not, the banner renders as a procedural orange blob for every win tier.
- **P1-ART-02** (`game/animations/postFx.ts`): Remove event-triggered RGBSplitFilter, ZoomBlurFilter, GodrayFilter, ShockwaveFilter kicks. Keep `AdvancedBloomFilter` (always-on grading). Replace the Graphics-circle shockwave in `winCelebration.ts` with an authored sprite-sheet ring. Replace `impactKick` with `ticker.speed → 0.05` hit-stop.

**Definition of Done:** Play 30 minutes without skipping any celebrations. Open browser console — zero errors, zero "undefined" texture warnings during gameplay. Open paytable — 4 rows only, no phantom row. Trigger free spins — counter shows "FREE SPINS". Buy bonus modal shows correct copy. Skip a big win celebration — board is not zoomed on the next spin.

**Estimated effort:** 1–2 days

**Risk:** BUG-03 (symbol win FX) requires understanding the board state structure. Verify `stateGame.board[reel].reelState.symbols[row]` is the correct access path by reading the actual board render code before patching.

---

### Phase 5 — Gameplay Feel

**Goal:** After this phase, session engagement feels materially different. Near-misses create genuine tension. Base game Wilds occasionally surprise with multipliers. Losing streaks are bounded.

**Tasks:**

**5A. Near-miss anticipation** (`components/Board.svelte`)

The hook is wired: `revealEvent.anticipation` is set by the math. Implement FE response:
- When `revealEvent.anticipation === true`: slow remaining spinning reels to ~30% speed
- Activate edge glow on the two visible scatter symbols
- Shift audio to a taiko build cue

No math changes required. This is the highest engagement-per-hour task in the entire plan — implement it first in this phase.

**5B. FS trigger dwell** (`components/FreeSpinIntro.svelte` or `bookEventHandlerMap.ts`)

When scatter trigger resolves: lock the board for 1 second, display "3 SCATTERS — 8 FREE SPINS" (or appropriate count) before transitioning. Pure FE, zero math cost.

**5C. Buy Bonus value messaging** (`components/ModalBuyBonusAyakashi.svelte`)

Add one line under the bonus card: "Average win: ~74× your bet." (value from `stats_summary.json` bonus mode). This converts undecided players and is a single line of UI text.

**5D. Wild multiplier display** (FE only, confirm math is wired in Phase 1)

Ensure the multiplier badge renders on Wild symbols when a base game mult is assigned. The `Symbol.svelte` multiplier badge exists — verify it is reading the `mult` property from the symbol state correctly for base game Wilds.

**Definition of Done:** Trigger 10 near-misses in Storybook. Remaining reels visibly slow. Trigger free spins — dwell screen shows before mode switch. Open buy bonus modal — average win line visible. Land a 2× Wild in base game — badge renders on the symbol.

**Estimated effort:** 4–8 hours

**Risk:** The near-miss reels slow-down may interact with existing reel deceleration physics. Test edge cases: what if all 5 reels are anticipating simultaneously? Ensure the slow-down resolves cleanly when the last reel lands.

---

### Phase 6 — Polish and Submission QA

**Goal:** The game passes a complete QA pass with no new issues found. Submission package is ready.

**Tasks:**

**6A. Paytable and game rules content audit** (`components/paytable/PayTableContent.svelte`, `GameRulesContent.svelte`)

Per GAME_DESIGN_MEMO §7.1: both files contain placeholder or v1 content. Verify all of these are accurate:
- Correct symbol names and pay values for H1–H5 and L1–L5 (match the actual `payoutTable` in `config.ts`)
- Oni Kanabo (X) exploder mechanic described correctly
- Ofuda Talisman (M) multiplier table shown correctly (1M→×2, 2M→×3, 3M→×5, 4M→×10, 5M→×20)
- 2000× win cap stated
- Buy bonus cost: 100× bet
- Tumble/cascade mechanic clearly explained

Run `python apps/lines/build-paytable-symbols.py` and confirm `components/paytable/img/*.webp` files exist and are current symbol art.

**6B. H5 on reels investigation** (`game/constants.ts` line 72)

H5 is in `HIGH_SYMBOLS` and `SYMBOL_INFO_MAP` but not in reel strips (QUALITY-02). Determine: is H5 intentionally cut from reels, or is this a data error? If cut: remove from `HIGH_SYMBOLS` and `SYMBOL_INFO_MAP` to prevent confusion. If it should be on reels: add it. Do not ship with this ambiguity.

**6C. Game version** (`components/Game.svelte`, `vite.config.ts`)

Add `define: { __APP_VERSION__: JSON.stringify(pkg.version) }` to `vite.config.ts`. Replace `<GameVersion version="1.0.0" />` with `<GameVersion version={__APP_VERSION__} />`. Bump `package.json` version appropriately.

**6D. FreeSpins autoDismiss** (`game/animations/freeSpinsScreen.ts`)

`autoDismiss = 30000ms`. Most operators require 10–15s. Check Stake.com operator requirements and adjust accordingly.

**6E. Debug console cleanup**

- Remove `console.info('[fx] kanabo smash x', ...)` from `bookEventHandlerMap.ts` line 164
- Search entire `src/` for remaining `console.log` / `console.info` / `console.warn` calls that should not appear in production

**6F. Full play session on mobile portrait**

Load the game on a portrait device (or devtools mobile emulation). Verify:
- Free spin counter is visible and correct
- All modals open and are readable at portrait viewport
- No layout overflow or clipped text

**6G. Final asset provenance check**

Do a final scan for any remaining reference-game filenames:
- `grep -r "mm_\|miningfont\|SD2_\|MM_\|mining" static/assets/` — should return zero results
- `grep -r "mm_\|Mining" src/game/assets.ts` — should return zero results

**6H. Submit `_verify_books.py`**

Run `python submit/_verify_books.py`. All books must pass. Record the verification output.

**Definition of Done:** Zero console errors on a 30-minute play session. Paytable content is accurate. `_verify_books.py` passes. No Mining reference files remain. Version number is set. QA checklist in Section 7 passes completely.

**Estimated effort:** 1 day

**Risk:** Paytable content audit may reveal inaccuracies that require math SDK consultation. Give half a day buffer.

---

## 5. The Non-Negotiables

These 10 items are hard stops. If any one of them is not done, do not submit.

1. **If the Ninja Kage font is still on a demo licence, do not submit.** Either purchase the commercial licence or swap `DISPLAY_FONT` in `game/fxManager.ts` line 62 to `'Yuji Syuku'`.

2. **If the buy bonus modal still says "Global Multiplier already active," do not submit.** This is incorrect and potentially a regulatory violation. File: `components/ModalBuyBonusAyakashi.svelte` line 99.

3. **If any Mining reference audio is still deployed, do not submit.** Replace all audio keys in `game/sound.ts`. At minimum one Ayakashi track must play.

4. **If `prob_nil` is still above 0.60 in `stats_summary.json`, do not submit.** The math re-run (Phase 1) must complete and the new stats must be verified.

5. **If symbol win FX (BUG-03) is still a no-op, do not submit.** Winning symbols must visually react. Fix `winBurstAt()` in `fxManager.ts` to pass the symbol container.

6. **If the PayTable still shows 5 rows, do not submit.** `const rows = 5` in `PayTableContent.svelte` line 51 — change to 4.

7. **If the avatar is still a static PNG with no idle animation, do not submit.** The avatar must have at minimum a looping idle sheet. Phase 2 must complete before submission.

8. **If at least H1–H5 symbol animations are not deployed, do not submit.** Static high-value symbols are the most visible quality gap. Wan renders must be baked and wired.

9. **If any file named `mm_*.xml`, `SD2_Coin.json`, or `MM_pressanywhere.json` is still served by the app, do not submit.** These are competitor game assets and immediately identifiable to any reviewer.

10. **If portrait layout hides the free spin counter, do not submit.** `MISSING-04` in `Game.svelte` — portrait players must be able to see their spin count during the feature.

---

## 6. Quick Wins (Under 2 Hours Each)

Items with high reviewer visibility and trivially small implementation cost. Do these while waiting for Wan renders or optimization runs.

| Task | File | Change | Effort | Impact |
|------|------|--------|--------|--------|
| Fix "FREE SPIN" → "FREE SPINS" | `components/FreeSpinCounter.svelte` line 81 | Change one string | 5 min | Visible every FS spin |
| Fix PayTable phantom 5th row | `components/paytable/PayTableContent.svelte` line 51 | `const rows = 5` → `const rows = 4` | 5 min | Visible in most-inspected modal |
| Fix Buy Bonus copy | `components/ModalBuyBonusAyakashi.svelte` line 99 | Replace copy string | 10 min | Regulatory risk + first modal read |
| Add Buy Bonus value messaging | `components/ModalBuyBonusAyakashi.svelte` | Add "Average win: ~74× your bet" | 15 min | Converts browsers to buyers |
| Remove SUPERSPIN dead code | `game/bookEventHandlerMap.ts` line 32 | Delete dead if branch | 5 min | Code hygiene, prevents confusion |
| Remove console.info in tumble handler | `game/bookEventHandlerMap.ts` line 164 | Delete console.info call | 5 min | Removes production console spam |
| Fix Free Spins autoDismiss | `game/animations/freeSpinsScreen.ts` | `30000` → `10000` (verify Stake requirement) | 10 min | Operator compliance |
| Wire brushWide.webp to WinCelebration | `components/Game.svelte` WinCelebration constructor | Pass `brushTexture: assets.brushWide` | 20 min | Win banner shows ink texture not orange blob |
| Remove bgEffect/bgMist preload | `game/assets.ts` lines 29–38 | `preload: true` → `false` | 10 min | Reduces first-paint load time |
| Fix Symbol.svelte multiplier badge sizing | `components/Symbol.svelte` | Replace hardcoded `x={52} y={56} fontSize:44` with `x={SYMBOL_SIZE*0.45} y={SYMBOL_SIZE*0.49} fontSize: SYMBOL_SIZE*0.38` | 15 min | Future-proofs badge position |
| Add await to bonus snapshot replay | `game/bookEventHandlerMap.ts` lines 357–358 | Add `await` to two `playBookEvent` calls | 10 min | Fixes race condition on resume |
| Deploy bg_bg pick | `static/assets/sprites/background/bg_bg.webp` | Pick finalist, convert, copy | 30 min | World backdrop is correct |
| Deploy chrome picks | `static/assets/sprites/reelsFrame/` | Convert + copy two files | 30 min | Better art already exists, just not deployed |

---

## 7. The 3-Star Checklist

Run through this before submission. Every item must be a hard pass.

### Math

- [x] `stats_summary.json` shows `prob_nil ≤ 0.55`
- [ ] `stats_summary.json` shows `mode_fence_info.base.basegame.av_win ≥ 3.5` — *NOT met by design: at nil ≤ 0.55 the basegame fence av_win is pinned at rtp×hr ≈ 1.4×; nil rate was prioritized per this guide's own Phase 1 risk note*
- [x] RTP reads `0.963–0.967` (within ±0.002 of 0.965 target)
- [x] `game/config.ts` has been regenerated from math SDK after optimization
- [x] Tumble multiplier increments on each cascade — confirmed by checking `globalMult` value in FE events
- [ ] Pity mechanic active — no streak of more than 20 consecutive zero-win books possible — *not implementable: Stake's RGS samples books statelessly (no cross-spin state). At prob_nil 0.551 a 20-dead streak is ~0.55²⁰ ≈ 7 in a million*
- [x] `python submit/_verify_books.py` passes with zero failures

### Art — Symbols

- [ ] All 5 high symbols (H1–H5) have animated idle sheets deployed and visible in-engine
- [ ] All 5 low symbols (L1–L5) have animated idle sheets deployed
- [ ] All 4 special symbols (W, S, M, X) have animated idle sheets deployed
- [x] No Mining, SD2, or MM reference filenames served by the app (`grep -r "mm_\|SD2_\|MM_" static/assets/` returns zero)
- [x] Symbol win burst FX fires on winning symbols (BUG-03 fixed)
- [x] Kanabo smash shows the actual Oni Kanabo art (BUG-02 fixed)

### Art — Avatar

- [ ] Avatar plays an idle loop in the right-side panel
- [ ] Avatar plays a cheer/win animation on big win
- [ ] `assets.ts` registers `avatarIdleSheet`, `avatarCheer` pointing to deployed webp files
- [x] No "avatarCheer undefined" or "avatarWink undefined" console errors

### Art — Background and Chrome

- [x] `bg_bg.webp` in-engine matches one of the three finalist picks (documented in this guide or HANDOFF)
- [x] Reel frame in-engine matches `art/generated/chrome-2026-06-27/reel_frame/_picked/B_sumi_brush_flux_02.png`
- [x] FS counter panel in-engine matches `art/generated/chrome-2026-06-27/fs_panel/_picked/B_iron_plate_flux_03-nobg.png`

### Art — Fonts and Text Assets

- [x] All four bitmap font slots in `assets.ts` point to Ayakashi assets (zero `mm_`, `miningfont_` references)
- [x] `purpleFont` slot removed from `assets.ts`
- [x] Win amounts display in gold Ayakashi font — visible and correct at all win tiers
- [x] `MM_pressanywhere.json` replaced with Ayakashi press-to-continue asset
- [x] `SD2_Coin.json` replaced with Ayakashi particle or redirected to petal burst

### Art — FX and Particles

- [x] `paper.webp`, `ember.webp`, `smoke.webp` are Ayakashi style (not Mining reference) — open files visually
- [x] Post-FX: RGBSplitFilter, ZoomBlurFilter, GodrayFilter, ShockwaveFilter NOT firing on events
- [x] Always-on AdvancedBloomFilter is active at correct threshold
- [x] `brushWide.webp` is passed to WinCelebration — win banner shows ink texture not procedural orange rect
- [x] Foxfire swirl either fires during big win or `startFoxfireSwirl()` is deleted (not dead defined-but-never-called)

### Audio

- [ ] Base game BGM is an Ayakashi-specific track (not Mining audio)
- [ ] Scatter trigger sting plays on 3-scatter land
- [ ] Big win flourish plays at BIG WIN tier and above
- [ ] `game/sound.ts` contains zero Mining-game key names (`sfx_multiplier_landing`, `sfx_royals_landing`, etc.)
- [ ] At least small/nice/substantial win levels have SFX keys wired (not all `undefined`)

### Code — Bugs

- [x] BUG-01: Avatar pose textures wired or dead call removed
- [x] BUG-02: Kanabo uses correct x2 atlas key
- [x] BUG-03: `winBurstAt()` passes symbol container — elastic pop fires on wins
- [x] BUG-04: SUPERSPIN dead code removed
- [x] BUG-05: Bonus snapshot replay awaits both book events
- [x] BUG-06: `bgEffect`/`bgMist` preload disabled or wired
- [x] BUG-07: `startFoxfireSwirl()` is called or deleted
- [x] BUG-09: PayTable `const rows = 4`
- [x] BUG-10: Buy Bonus copy accurate
- [x] BUG-11: Bet adjust buttons have min/max guards
- [x] BUG-12: `cameraGrammar.release()` called in WinCelebration teardown

### UI and Content

- [x] FreeSpinCounter displays "FREE SPINS" (plural)
- [x] Portrait layout shows free spin counter during FS feature
- [x] Paytable symbol names, pay values, and mechanic descriptions match current `config.ts`
- [x] Ofuda Talisman multiplier table correct in game rules (1M→×2, 2M→×3, 3M→×5, 4M→×10, 5M→×20)
- [x] 2000× win cap stated in game rules
- [x] Buy bonus cost (100×) stated correctly
- [x] Tumble/cascade mechanic described in game rules
- [x] H5 status on reels resolved — either on reel strips or removed from `HIGH_SYMBOLS` and `SYMBOL_INFO_MAP`

### Licence and Compliance

- [x] Ninja Kage font: commercial licence purchased OR replaced with Yuji Syuku
- [x] No `console.info` or `console.log` calls in production code paths (`grep -r "console.info\|console.log" src/` reviewed)
- [x] FreeSpins `autoDismiss` ≤ 15000ms (confirmed against Stake operator requirements)
- [x] Game version not hardcoded "1.0.0" — pulled from `package.json` via build constant

### Final Verification

- [ ] 30-minute play session on desktop: zero visible bugs, zero console errors
- [ ] 15-minute play session on portrait mobile: FS counter visible, no layout overflow
- [ ] Big win triggered (use Storybook bonus books): avatar animates, foxfire swirl plays, celebration banner shows ink texture
- [ ] Paytable opened: 4 rows, correct symbols, correct pay values
- [ ] Buy Bonus modal opened: accurate description, average win shown, no "Global Multiplier" copy
- [ ] `_verify_books.py` passes

---

## Appendix — File Index

Key files referenced in this guide, by topic:

**Math SDK**
- `math-sdk/games/0_0_lines/game_optimization.py` — reel optimization (Phase 1)
- `math-sdk/games/0_0_lines/gamestate.py` — tumble multiplier wiring
- `math-sdk/games/0_0_lines/game_override.py` — Wild multiplier + pity mechanic
- `math-sdk/games/0_0_lines/game_config.py` — bet modes, scatter weights
- `math-sdk/games/0_0_lines/library/stats_summary.json` — optimization output to verify
- `apps/lines/sync-config.py` — regenerate config.ts after math changes

**Frontend — Core**
- `web-sdk/apps/lines/src/game/assets.ts` — all asset registrations (fonts, sheets, particles)
- `web-sdk/apps/lines/src/game/fxManager.ts` — FX wiring (BUG-01, BUG-02, BUG-03, DISPLAY_FONT)
- `web-sdk/apps/lines/src/game/bookEventHandlerMap.ts` — event handlers (BUG-04, BUG-05, console.info)
- `web-sdk/apps/lines/src/game/animations/postFx.ts` — post-FX stack (banned filters)
- `web-sdk/apps/lines/src/game/animations/winCelebration.ts` — big win (BUG-07, BUG-08, BUG-12)
- `web-sdk/apps/lines/src/game/symbolIdle.ts` — symbol animation wiring (Phase 2)
- `web-sdk/apps/lines/src/game/sound.ts` — audio keys

**Frontend — Components**
- `web-sdk/apps/lines/src/components/FreeSpinCounter.svelte` — "FREE SPIN" → "FREE SPINS" fix
- `web-sdk/apps/lines/src/components/ModalBuyBonusAyakashi.svelte` — copy fix, value messaging, bet guards
- `web-sdk/apps/lines/src/components/paytable/PayTableContent.svelte` — rows=4 fix, content audit
- `web-sdk/apps/lines/src/components/Game.svelte` — portrait FS counter, brushTexture pass, version
- `web-sdk/apps/lines/src/components/Symbol.svelte` — multiplier badge sizing

**Art Assets**
- `art/wan-animations/` — Wan I2V input images and output renders by symbol
- `art/generated/chrome-2026-06-27/_picked/` — generated chrome (not yet deployed)
- `art/generated/bg-2026-06-26/_picked/` — bg_bg finalists (not yet picked/deployed)
- `art/bake_sprites.py` — mp4 → WebP sprite sheet baking script
- `static/assets/sprites/` — deployed game assets (replace Mining references here)
- `static/assets/audio/` — audio files (replace all with Ayakashi audio)
