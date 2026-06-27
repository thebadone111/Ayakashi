# Ayakashi — Post-Review Improvement Plan

Triggered by the rating result (2026-06-15): 3.7 / 9 — below the 4.5 publication
threshold. Reviewer callouts: low quality assets, inconsistent art style, poor
animations, poor bet UI bar.

This plan is forward-looking. ROADMAP.md remains the log of completed work.

Locked direction: see `art/STYLE_GUIDE.md`, `art/PROMPT_GUIDE.md`, and
`art/PIPELINE.md` (the validated four-step asset workflow as of 2026-06-15).

---

## Reading this document

Each step lists:
- **Change** — what we actually do
- **Improves** — which reviewer callout(s) this addresses, in their words
- **Effort** — rough working time (h = hours, d = days)
- **Depends on** — what must land first
- **Status** — `[ ]` todo · `[~]` in progress · `[x]` done

Steps are grouped into 5 tracks. Tracks run in parallel where dependencies
allow. The recommended order across tracks is at the bottom (§6).

---

## Track A — Art reset (addresses "low quality assets" + "inconsistent art style")

### A0. Model look-test (gates A1-A6) — **DONE 2026-06-15**
- **Change**: ran the look-test against a wider 5-model set on fal.ai
  (Illustrious XL, NoobAI XL, Ideogram v3, FLUX 1.1 Pro Ultra, Seedream v4
  full) plus I2V baseline (Wan 2.2 a14b, Hailuo 02). Outcome: 3-model
  generation mix (NoobAI / FLUX 1.1 Pro Ultra / Seedream v4) feeding Wan 2.2
  I2V for animation. See `art/PIPELINE.md` for the canonical workflow and
  `memory/asset-pipeline.md` for the short form.
- **Improves**: Foundation for every other art step.
- **Effort**: actual 0.5d incl. write-up.
- **Depends on**: STYLE_GUIDE.md + PROMPT_GUIDE.md (done)
- **Status**: `[x]`

### A1. Symbol atlas regeneration + cast & lows redesign — **DONE 2026-06-27**
- **Change** (final, locked 2026-06-27):
  1. **High cast pivoted to yokai MASKS, not character portraits.** The
     2026-06-15 plan said "h1 Oni Warrior, h2 Kitsune…" with each as a
     three-quarter character art. That produced anime portraits that
     looked indistinguishable in a row at 160 px and competed with the
     avatar. Replaced with traditional Japanese theater MASKS:
     **h1 ao-oni** (indigo lacquered wood + horns), **h2 kitsune-men**
     (white porcelain + red brushwork), **h3 daitengu** (crimson + long
     nose), **h4 ko-omote** (pale Noh female), **h5 sinister bake-neko**
     (charcoal-green + ember slit eyes). Tanuki + Rokurokubi remain
     dropped from the original cast.
  2. **Cast palette swapped** so oni and tengu no longer fight over
     crimson. Ao-oni is canonical in Japanese folklore.
  3. **Lows pipeline reversed** — kanji rendered via Yuji Syuku font over
     a single shared washi background, NOT five separate AI gens. See
     PROMPT_GUIDE.md §4g for the rewritten brief.
  4. **Object specials (w / s / m / x)** — generated against a per-symbol
     `composition` override in [symbol_gen.py](art/symbol_gen.py): wild
     kitsune spirit orb, temple bell, ofuda talisman with foxfire glow,
     kanabo with cyan halo.
  5. **Composite step** — [art/compose_atlas.py](art/compose_atlas.py)
     drops each picked high mask onto a uniform washi roundel with a
     cyan foxfire halo behind, renders the five lows kanji via Pillow
     over the same washi, and passes the four specials through with the
     hand-cut backgrounds. 14 final 1024×1024 tiles saved to
     `art/generated/symbols-2026-06-26/_atlas/`.
- **Improves**: "Low quality assets", "inconsistent art style".
- **Effort**: 1.5d original estimate; actual ~1d in-session 2026-06-26 +
  2026-06-27.
- **Depends on**: A0
- **Status**: `[x]` — 14 atlas tiles ready to ship.
- **Note**: Symbol IDs (h1-h5, l1-l5, w/s/m/x) are unchanged so the math
  doesn't move. This is a pure art swap — no math re-run needed.
- **Picked source images**: `art/generated/symbols-2026-06-26/_picked/`
  (`.png` originals + `-nobg.png` hand cuts where needed)
- **Final atlas tiles**: `art/generated/symbols-2026-06-26/_atlas/*.png`
  plus `_grid.jpg` 3-row preview.
- **Cast review sheet**: `art/generated/symbols-2026-06-26/_picked/_cast.jpg`

### A2. Background layer regeneration
- **Change** (revised 2026-06-27): The original 4-layer plan
  (bg_bg / bg_fg / bg_effect / bg_mist) is replaced by a **single
  bg_bg with cherry-branch framing baked in + animated petal sprite
  sheets layered on top**. The "depth" the original plan was solving
  comes from the moving petals over the static painting — no separate
  bg_fg layer needed.
  1. **bg_bg** — round 1 (no branch in prompt) gave thin results; round
     2 (with cherry branch baked into prompt) was strong. Tested across
     4 models (FLUX 1.1 Pro Ultra, Seedream v4, Ideogram v3, Recraft v3).
     RunComfy was attempted but the deployment was deleted server-side
     and not revived. 3 finalists locked, final pick deferred:
     `art/generated/bg-2026-06-26/_picked/bg_bg_{flux03,seedream02,recraft01}.png`.
  2. **Petals (replaces bg_fg)** — 5 distinct petal designs (v1-v5)
     generated as stills, hand-cut by Max, then animated 2 ways
     (Wan 2.2 a14b + Hailuo 02 standard, $0.40 / $0.27 per 5-6 s
     respectively). 10 mp4s baked to 4×4 256 px WebP sprite sheets
     (15-110 KB each). 5 primary picks locked
     (`petal_v1_hailuo`, `petal_v1_wan`, `petal_v3_hailuo`,
     `petal_v5_hailuo`, `petal_v5_wan` — ~241 KB total) + 3 backups in
     `art/generated/petals-anim-v2-2026-06-27/_picked/`.
  3. **bg_fg, bg_effect, bg_mist (dropped)** — bg_fg solved by step 2;
     bg_effect deferred (the existing fxManager foxfire-bokeh
     procedural is acceptable for now); bg_mist parked (the round-1 mist
     gens were the weakest of the lot and the spec was ambiguous —
     revisit only if Max wants it).
- **Improves**: "Low quality assets", "inconsistent art style".
- **Effort**: 1d original estimate; actual ~0.5d.
- **Depends on**: A0
- **Status**: `[~]` (3 bg_bg finalists locked + petal pack done; final
  bg_bg pick + wiring deferred to Phase 2).
- **Drivers**: [art/bg_gen.py](art/bg_gen.py),
  [art/bg_more.py](art/bg_more.py),
  [art/petal_animate.py](art/petal_animate.py),
  [art/petal_bake.py](art/petal_bake.py).

### A3. Board frame + UI chrome regeneration
- **Change**: Regenerate `reel_frame` (lacquered black-and-gold, NOT red),
  `frame_bg1` (washi-paper board backdrop), `Frame_FSCounter2`. rembg pass
  on the frame interior. New decorative corner motifs.
- **Improves**: "Low quality assets", "poor bet UI bar" (the frame and the
  bar read as one chrome system)
- **Effort**: 1d
- **Depends on**: A0
- **Status**: `[ ]`

### A4. Avatar regeneration (+ pose variants)
- **Change** (revised 2026-06-26): The img2img-pose-variant approach
  is replaced by **prompt-driven I2V (Wan 2.2 / Hailuo 02)** on a single
  picked still — same pipeline the petals proved out 2026-06-27.
  1. **Avatar still regenerated** under the de-IP'd prefix in CUTTABLE
     mode (no painted scene). Tested 2 models, picked Seedream V3 on
     2026-06-26. Locked: `art/generated/avatar-2026-06-26/_picked/avatar.png`.
  2. **Animation pass not yet done.** Plan: Wan I2V + Hailuo on the
     locked still for 4-5 reaction states (idle, win, big-win, FS-entry,
     loading-splash), bake each to a 4×4 WebP sheet, wire to
     `AvatarActor`. ~$2 total. Template:
     [art/i2v_test.py](art/i2v_test.py) already has the working pattern.
- **Improves**: "Poor animations" (avatar is currently a static pose —
  reaction states bring it to life), "low quality assets"
- **Effort**: 1d original; ~0.3d done (still picked), ~0.4d remaining
  (animation + bake).
- **Depends on**: A0
- **Status**: `[~]` (still locked, animation pending).

### A5. Particle texture regeneration
- **Change**: Generate the 8 particle textures listed in
  `assets-to-generate.md` (spark, ember, smoke, petal, orb_ring, ink_splat,
  seal_glow, coin_particle) in the locked style. Replace the procedural
  "soft glow dots" currently used.
  Progress 2026-06-27: **petal** is done as part of A2 (5 animated petal
  sprite sheets). Remaining: spark, ember, smoke, orb_ring, ink_splat,
  seal_glow, coin_particle.
- **Improves**: "Poor animations" (the dot vocabulary is the #1 reason FX
  read cheap), "inconsistent art style"
- **Effort**: 0.5d original; ~0.1d done (petal subset).
- **Depends on**: A0
- **Status**: `[~]` (petal done, 7 textures remaining).

### A6. Logo + bitmap font regeneration
- **Change**: Regenerate `ayakashi_logo.svg` (or PNG fallback) and the
  four bitmap fonts (goldFont, silverFont, goldBlur, purpleFont) in the
  locked style. For logo, consider Ideogram 3.0 (best-in-class for clean
  game logos / text). Fonts stay on a brush-bitmap pipeline (build-fonts.py).
- **Improves**: Logo quality is the first impression on the loading screen.
  "Low quality assets" specifically includes the title plate.
- **Effort**: 0.5d
- **Depends on**: A0 (for non-logo); logo can run in parallel
- **Status**: `[ ]`

---

## Track B — UI overhaul (addresses "poor bet UI bar" + general polish)

### B1. Bet UI bar visual reskin
- **Change**: The bar currently uses stock Stake `web-sdk` layouts
  (LayoutDesktop, ButtonBet, LabelBalance) with zero theming. Reskin:
  - Background: lacquered dark wood + gold inlay panel matching the new
    reel frame (see A3) — single sprite or 9-slice
  - Buttons (Bet+/-, Spin, Auto, Turbo, Menu): custom Ayakashi sprites,
    foxfire glow on hover, ink-stamp press feedback
  - Labels (Balance, Win, Bet): brush-bitmap font (goldFont from A6),
    foxfire-blue underglow on Win value during count-up
  - Spin button: hero treatment — circular ofuda seal design, glows
    foxfire when ready, ink-stamp animation on press
- **Improves**: "Poor bet UI bar" directly. This callout was unanimous
  across reviewers.
- **Effort**: 1.5d
- **Depends on**: A6 (fonts), ideally A3 (frame for color match) — but can
  be sketched in parallel against the locked style guide.
- **Status**: `[ ]`

### B2. Loading screen polish
- **Change**: Loading screen currently shows the logo + progress bar. Upgrade:
  - Animated kitsune silhouette walking across the moon as load progresses
  - Foxfire spark particles around the progress bar
  - Logo (from A6) with subtle bloom + petal drift
- **Improves**: First impression. Reviewers see this within 2 seconds of
  starting the game.
- **Effort**: 0.5d
- **Depends on**: A6 (logo), C1 (post-fx for bloom)
- **Status**: `[ ]`

### B3. Modal redesigns (Pay Table, Game Rules, Settings)
- **Change**: Current modals use stock SDK Svelte panels with no theming.
  Reskin the panel backgrounds, headers, and button rows to match the
  Ayakashi chrome. Pay-table symbols pull from the new atlas (A1).
- **Improves**: General polish. Reviewers open these to evaluate the game.
- **Effort**: 1d
- **Depends on**: A1 (symbols), A3 (chrome design language)
- **Status**: `[ ]`

### B4. Menu drawer + side panel
- **Change**: The right-side avatar panel currently has a flat background.
  Add lacquered frame around the avatar, foxfire lantern hanging at the
  top, subtle petal drift overlay. Menu drawer (Settings, Sound, etc.)
  also reskinned.
- **Improves**: General polish, "low quality assets"
- **Effort**: 0.5d
- **Depends on**: A4 (new avatar), A3 (chrome)
- **Status**: `[ ]`

---

## Track C — Animation upgrade (addresses "poor animations")

This is the P1–P6 plan from `cinematic-animation-plan.md`, now scheduled.

### C1. Baseline color grade + REMOVE the active-FX stack ("no programmer art")
- **Change**: Reverses the originally-planned active post-FX stack. The
  video-game language is OUT — no event-triggered RGBSplit pulses, no
  ZoomBlur kicks, no GodrayFilter sweeps, no ShockwaveFilter ring. These
  read as programmer art and were the root cause of the "poor animations"
  reviewer callout. See STYLE_GUIDE.md §9.
  
  What lands instead:
  - **A single always-on baseline color grade** at the compositor level:
    faint `AdvancedBloomFilter` (high threshold, low intensity) + optional
    film-grain overlay. Invisible if toggled off; this is grading, not
    effects.
  - **Audit & remove** any existing active-filter wiring in `fxManager`,
    `postFx.ts`, or per-effect modules. Anything that "kicks" or "sweeps"
    on an event goes.
  - The hand-authored vocabulary (Track D sprite sheets, A5 textured
    particles, C2 camera grammar) carries the FX moments instead.
- **Improves**: "Poor animations" — by REMOVING the synthetic filter
  language that reads as a slot game. Hand-authored sheets + tweens
  carry the load.
- **Effort**: 0.5d (mostly tuning the static grade thresholds and
  unwiring whatever active filters already exist)
- **Depends on**: nothing
- **Status**: `[ ]`

### C2. P2 — Camera grammar + hit-stop
- **Change**: Pure code, no assets.
  - **Hit-stop**: `ticker.speed → 0.05` for ~4 frames on kanabo contact,
    then release. Coupled to TweenRunner (existing system handles this).
  - **Camera dip**: Board+BG container offsets 4px on tumble waves
  - **Camera zoom**: 1.0 → 1.04 slow zoom during celebration, settle-back
    with `backOut`
  - **Win presentation 3-act**: blackout + heartbeat thump → title
    slash-reveal → count-up + coin fountain
- **Improves**: "Poor animations" — current animations have no time
  modulation; everything plays at 1x speed. Hit-stop is *the* anime
  fight-scene grammar.
- **Effort**: 1d
- **Depends on**: nothing
- **Status**: `[ ]`

### C3. P3 — Textured particle vocabulary swap
- **Change**: ParticlePool currently uses procedural soft-glow dots for
  most effects. Swap to A5 textures per effect:
  - tumble cascade → ink + paper shreds
  - scatter land → petals + foxfire
  - kanabo X explode → ink + ember + debris
  - wild orb expand → orb_ring + foxfire wisps
- **Improves**: "Poor animations" — gives FX a *vocabulary* instead of
  one universal sparkle.
- **Effort**: 0.5d
- **Depends on**: A5
- **Status**: `[ ]`

### C4. P4 — Brush-stroke reveals (animated masks)
- **Change**: Use brush-stroke flipbook sheets (see D1) as animated masks
  for:
  - FS intro transition wipe
  - BIG WIN title reveal
  - Payline trace (drawn as textured brush stroke with ink droplets, not
    plain Graphics line)
- **Improves**: "Poor animations" — replaces clean vector wipes with the
  hand-drawn ink language the rest of the world is in.
- **Effort**: 0.5d
- **Depends on**: D1 (brush-stroke sheet)
- **Status**: `[ ]`

### C5. P5 — Flipbook FX integration
- **Change**: Wire the sakuga sheets from D1 into the FX moments:
  - Foxfire flame burst → wild land, scatter land
  - Slash arc → payline reveal, kanabo strike
  - Bell ring shockwave → scatter land
  - Ofuda seal stamp → M multiplier activation
  - Kanabo ink-splat → X exploder impact
  - Sakura petal swirl → big win celebration
- **Improves**: "Poor animations" — replaces "scale + glow" with
  hand-drawn animation
- **Effort**: 0.5d
- **Depends on**: D1
- **Status**: `[ ]`

### C6. Symbol idle/win micro-animations
- **Change**: Each high symbol gets:
  - A subtle idle breath (6-frame loop, plays at 8fps, 1% scale + 2px
    offset to give the symbol *life* on the board)
  - A win pulse (8-frame, plays once when symbol is in a win)
- **Improves**: "Poor animations" — currently symbols are static between
  events. Idle breath is the difference between "asset on a grid" and
  "characters on a stage."
- **Effort**: 1d (mostly gen+slice, code is light)
- **Depends on**: D2 (symbol flipbook sheets) — or skip flipbooks and do
  scale-tween-only as a fallback (cheaper, less impressive)
- **Status**: `[ ]`

---

## Track D — Sprite sheets (the new asset class)

Sakuga flipbooks. Generated as N-frame horizontal sheets on black, then
PIL-sliced and packed. We have proven this pipeline with the existing yen
coin sheet (`build-coin-sheet.py`). Pattern: gen sheet → slice frames →
pack atlas → load as PixiJS AnimatedSprite.

Each sheet listed below: target frame count + size + which FX consumes it.

### D1. FX flipbook sheets (must-have, drives C4 + C5)

| # | Sheet | Frames | Size/frame | Consumer | Effort |
|---|-------|--------|------------|----------|--------|
| D1.1 | Foxfire flame burst | 8 | 256×256 | C5 (wild, scatter) | 2h |
| D1.2 | Slash arc (white-on-black brush) | 8 | 512×256 | C4 (payline, transitions) | 2h |
| D1.3 | Bell ring shockwave glyph | 8 | 256×256 | C5 (scatter) | 2h |
| D1.4 | Ofuda seal stamp/unfurl | 6 | 256×256 | C5 (M multiplier) | 2h |
| D1.5 | Kanabo ink-splat impact | 8 | 384×384 | C5 (X exploder) | 2h |
| D1.6 | Sakura petal swirl burst | 12 | 512×512 | C5 (big win) | 3h |
| D1.7 | Brush-stroke wipe (white-on-black) | 8 | 1920×1080 | C4 (FS intro, win title) | 2h |

- **Improves**: Unlocks C4 + C5 → "poor animations"
- **Total effort**: ~2d incl. cold-start, curation, slicing, packing
- **Depends on**: A0 (model)
- **Status**: `[ ]`

### D2. Symbol idle/win micro-animation sheets (stretch — C6)

| # | Symbol | Idle frames | Win frames | Effort |
|---|--------|-------------|------------|--------|
| D2.1 | h1 Oni | 6 | 8 | 1h |
| D2.2 | h2 Kitsune | 6 | 8 | 1h |
| D2.3 | h3 Tengu | 6 | 8 | 1h |
| D2.4 | h4 Tanuki | 6 | 8 | 1h |
| D2.5 | h5 Rokurokubi | 6 | 8 | 1h |

- **Improves**: C6 → "poor animations"
- **Effort**: ~1d total. **Risk**: sakuga consistency across 6+ frames is the
  hardest case for FLUX/SDXL. May need img2img frame-by-frame, or fall back
  to procedural scale-tween idle (cheaper but less impressive).
- **Depends on**: A0, A1
- **Status**: `[ ]` (mark as stretch — do C6 with code-only fallback if D2 is
  too costly)

### D3. Ambient loop sheets (stretch)

| # | Sheet | Frames | Size | Purpose | Effort |
|---|-------|--------|------|---------|--------|
| D3.1 | Cherry blossom drift loop | 12 | 1024×1024 | Seamless ambient petal layer | 2h |
| D3.2 | Mist scroll | — | — | Skip (procedural is fine) | — |
| D3.3 | Foxfire ambient flicker | 8 | 256×256 | Avatar tail glow loop | 2h |

- **Improves**: Background life. "Inconsistent art style" — procedural
  particles + painted BG read as different art. Hand-drawn ambient ties them.
- **Effort**: ~0.5d
- **Status**: `[ ]`

---

## Track E — Audio + final polish (not in reviewer feedback but quick wins)

### E1. Win-tier audio re-grade
- **Change**: Current win audio is the Pixabay JP SFX bundle. Re-curate
  small/medium/big/mega tiers to feel *distinct* (currently all read
  similar). Add taiko build-ups on anticipation.
- **Improves**: General feel. Audio is a free force-multiplier on animation
  perceived quality.
- **Effort**: 0.5d (curation, no new gen needed)
- **Depends on**: nothing
- **Status**: `[ ]`

### E2. Loading screen + intro stinger
- **Change**: Add a single intro stinger (shakuhachi flute + bell toll)
  during loading screen. Current state is silent until base game music
  kicks in.
- **Improves**: First-3-seconds impression
- **Effort**: 1h
- **Depends on**: nothing
- **Status**: `[ ]`

### E3. Performance sanity pass
- **Change**: After bloom (C1) and flipbook FX (C5) are in, profile on a
  mid-tier mobile. If FPS drops, gate post-FX behind a quality setting or
  reduce bloom resolution.
- **Improves**: Prevents a *new* low-rating risk if we ship beautiful but
  janky.
- **Effort**: 0.5d
- **Depends on**: C1, C5
- **Status**: `[ ]`

### E4. Resubmission package + checklist
- **Change**: Re-run math (already at 0.965 RTP), rebuild atlases, run
  `submit/_verify_books.py`, update `submit/README.md` with the
  improvement summary. Then re-submit.
- **Improves**: Closes the loop. The submission itself is unblocked once
  A-D are done.
- **Effort**: 0.5d
- **Depends on**: All A-D tracks
- **Status**: `[ ]`

---

## 6. Recommended order

Two phases. Phase 1 lands the foundation; Phase 2 layers in depth.

### Phase 1 — Get visibly different (≈ 4 days)
Goal: a single playthrough of the game already looks like a different game.

1. **A0** — Model look-test (2-3h, gates everything)
2. **C1** + **C2** in parallel — Post-FX + camera grammar (the animation
   callout starts moving the moment bloom turns on; no assets needed)
3. **A2** — Background regeneration (biggest screen area)
4. **A3** — Frame + chrome regeneration
5. **B1** — Bet UI bar reskin (the one named callout)
6. **A6** — Logo + fonts

By end of Phase 1: reviewers replaying the game would see new BGs, new
chrome, new bet bar, post-processed FX, and proper camera/time grammar.
That alone is likely the threshold-crossing change.

### Phase 2 — Cinematic depth (≈ 3-4 days)
7. **A1** — Full symbol atlas regeneration
8. **A4** — Avatar + pose variants
9. **A5** — Particle textures
10. **D1** — FX flipbook sheets
11. **C3** + **C4** + **C5** — Particle swap, brush wipes, flipbook FX wired in
12. **B2** + **B3** + **B4** — Loading screen, modals, side panel
13. **E1** + **E2** — Audio polish + intro stinger

### Phase 3 — Stretch / risk-managed (≈ 2 days)
14. **D2** + **C6** — Symbol micro-animations (or fallback to code-only)
15. **D3** — Ambient loops
16. **E3** — Performance pass
17. **E4** — Resubmit

**Total realistic effort**: 9-11 working days end-to-end, assuming the
RunComfy cloud sessions stay warm (cold starts eat 5-7min each).

---

## 7. What this plan deliberately does not include

- **New game mechanics, math changes, or RTP tweaks** — math is locked at
  0.965. (Decided 2026-06-15: gameplay stays as-is for this revision pass.
  Mechanics rebalance — dropping the M ofuda multiplier, lowering its
  values, or adding a second FS mode — was considered and explicitly
  deferred until after the art bar is met. Revisit only if a *future*
  rating round flags mechanics as the problem.)
- New scenes / bonus rounds — we are polishing what exists, not adding scope.
- Effekseer / Live2D / Spine FX — those need a human in the editor
  (`runcomfy-pipeline.md`). Out of scope for this round; revisit on the
  next title.
- Localisation, regulatory text, certification — separate workstream.

---

## 8. Open decisions (need Max input before starting)

1. ~~**Model choice** (gates A0)~~ — **LOCKED 2026-06-15**: 3-model gen
   mix (NoobAI XL / FLUX 1.1 Pro Ultra / Seedream v4) on fal.ai, Wan 2.2
   a14b for I2V animation. Full workflow in `art/PIPELINE.md`.
2. **Symbol micro-animation ambition** (D2 / C6): commit to sakuga
   flipbooks (high cost, high reward, FLUX/SDXL consistency risk) or fall
   back to procedural idle-breath only (cheap, modest improvement)?
3. **Scope discipline**: if we hit 4.5 in the look-test mid-Phase-1, do we
   ship early or push through Phase 2 for a 6+ score?
4. ~~Latin vs kanji glyphs on washi lows~~ — **LOCKED 2026-06-15: kanji
   only, five classical elements 火 水 木 金 土 (fire/water/wood/metal/
   earth).** Rationale: visually distinct strokes (literal numerals
   一/二/三 are too similar at symbol size), universally read as Japanese,
   tonally fits a yokai world, palette-paired with the highs (火→Nekomata
   ember, 水→Kitsune foxfire, 木→Tengu charcoal-green, 金→seal gold,
   土→moonlit silver). Paytable shows symbol-image→payout directly, so
   intrinsic kanji meaning doesn't gate legibility.
5. ~~Baseline color grade nuance~~ — **LOCKED 2026-06-15: keep the
   baseline grade** (faint always-on AdvancedBloom + film grain at the
   compositor level). Active filter stack still nuked per STYLE_GUIDE §9.
