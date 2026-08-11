# Ayakashi — Art & Style Review
**Date:** 2026-07-02
**Branch:** final-dev
**Scope:** Full audit of all art assets, animations, frontend visual design

---

## 1. Asset Inventory

### 1a. Symbol Art

All 14 game symbols have final production stills.

| Symbol | Concept | Source | Atlas tile | Quality |
|--------|---------|--------|-----------|---------|
| h1 Ao-Oni | Indigo lacquer oni mask, horns, cyan slit eyes | `art/generated/symbols-2026-06-26/_picked/h1.png` | `_atlas/h1.png` | HIGH |
| h2 Kitsune-men | White porcelain fox mask, red brushwork swirls | `art/generated/symbols-2026-06-26/_picked/h2.png` | `_atlas/h2.png` | HIGH |
| h3 Daitengu | Deep crimson tengu mask, long protruding nose | `art/generated/symbols-2026-06-26/_picked/h3.png` | `_atlas/h3.png` | HIGH |
| h4 Ko-omote | Pale Noh female mask, silver-white, cool blue | `art/generated/symbols-2026-06-26/_picked/h4.png` | `_atlas/h4.png` | HIGH |
| h5 Bake-neko | Charcoal-green cat-demon mask, ember slit eyes | `art/generated/symbols-2026-06-26/_picked/h5.png` | `_atlas/h5.png` | HIGH |
| l1 | Fire kanji 火 on washi | `_atlas/l1.png` | `_atlas/l1.png` | MEDIUM |
| l2 | Water kanji 水 on washi | `_atlas/l2.png` | `_atlas/l2.png` | MEDIUM |
| l3 | Wood kanji 木 on washi | `_atlas/l3.png` | `_atlas/l3.png` | MEDIUM |
| l4 | Metal kanji 金 on washi | `_atlas/l4.png` | `_atlas/l4.png` | MEDIUM |
| l5 | Earth kanji 土 on washi | `_atlas/l5.png` | `_atlas/l5.png` | MEDIUM |
| w (Wild) | Kitsune spirit orb | `_picked/w.png` | `_atlas/w.png` | MEDIUM |
| s (Scatter) | Temple bell | `_picked/s.png` | `_atlas/s.png` | MEDIUM |
| m (FS Multiplier) | Ofuda talisman | `_picked/m.png` | `_atlas/m.png` | MEDIUM |
| x (Exploder) | Oni kanabo club | `_picked/x.png` | `_atlas/x.png` | MEDIUM |

**Notes on highs:** The mask-format pivot (from anime character portraits) was the right decision. At 160 px each mask reads as a distinct silhouette. The Seedream-vs-FLUX picking strategy worked: Seedream won 4 of the 5 high slots on palette integration and unusual specs. FLUX won h4 (ko-omote) on restraint.

**Notes on lows:** The font-composite approach (Yuji Syuku over a shared washi background via Pillow) is mechanically correct — all five lows share identical paper texture and brushwork weight. The design intent (quiet family beneath the loud highs) is achieved. However, the washi paper visual itself is a simple monochrome paper — it is not compositionally interesting. These will read as slightly flat compared to the highs in a live game.

**Notes on specials:** w/s/m/x were generated but are considered "medium" quality. The object emblems (orb, bell, ofuda, kanabo) are photographically usable but none has the graphic boldness of the best mask designs. The specials are the symbols the player focuses on during free spins and multiplier moments — they need a stronger design presence than they currently have.

**Shipped atlas:** `art/generated/symbols-2026-06-26/_atlas/symbolsStatic.webp` (packed, deployed to `web-sdk/apps/lines/static/assets/sprites/symbolsStatic/`)

---

### 1b. Background

| Layer | File | Status | Quality |
|-------|------|--------|---------|
| bg_bg | `art/generated/bg-2026-06-26/_picked/bg_bg_seedream02.png` (3 finalists exist: flux03, seedream02, recraft01) | DEFERRED — final pick not made, current `bg_bg.webp` in-engine may be old | MEDIUM |
| bg_effect | `web-sdk/apps/lines/static/assets/sprites/background/bg_effect.webp` | In-engine (unknown source) | UNKNOWN |
| bg_mist | `web-sdk/apps/lines/static/assets/sprites/background/bg_mist.webp` | In-engine (placeholder or round-1 gen) | UNKNOWN |
| bg_fg | DROPPED — replaced by animated petal sprites over bg_bg | Done | — |

**Issue:** The bg_bg final pick was deferred (IMPROVEMENT_PLAN.md status `[~]`). Three finalists exist at `art/generated/bg-2026-06-26/_picked/bg_bg_{flux03,seedream02,recraft01}.png` but no explicit "ship this" decision was recorded. The in-engine `bg_bg.webp` may be a previous-generation file rather than any of these. This is the largest single background risk: the world backdrop is the most visible visual element in the game and its production status is unclear.

The bg_effect and bg_mist files in the static assets directory have no clear provenance. Their session or generation origin is not documented.

---

### 1c. Avatar

| Asset | File | Status | Quality |
|-------|------|--------|---------|
| Avatar still | `art/generated/avatar-2026-06-26/_picked/avatar.png` | Picked (Seedream v4 winner) | HIGH |
| Avatar still (no-bg) | `art/generated/avatar-2026-06-26/_picked/avatar-nob.png` | Ready to cut | HIGH |
| Avatar in-engine | `web-sdk/apps/lines/static/assets/sprites/avatar/avatar.webp` | Deployed | HIGH |
| Avatar idle animation | MISSING — removed 2026-06-27 | Pending | MISSING |
| Avatar win animation | MISSING | Pending | MISSING |
| Avatar big-win animation | MISSING | Pending | MISSING |
| Avatar FS-entry animation | MISSING | Pending | MISSING |
| Avatar loading-splash key-art | MISSING | Pending | MISSING |

The avatar still is the best single generated image in the project — good pose, palette-correct, cuttable background. The absence of any animation sheets is the most critical gap in the entire project. The avatar is static in the live game. The win celebration code in `winCelebration.ts` fires `fxBus.emit('bigwin')` expecting the avatar to pirouette or react — that event has nowhere to land. The character-led win celebration design depends on her being alive.

Wan I2V passes were run (`art/generated/avatar-wan-svi-2026-06-27/` and `avatar-wan-svi-idle-avatar-2026-06-27/`) but the output sheets were explicitly removed from assets.ts with the comment "new still landed without a fresh Wan I2V pass; the sheet will return after that pass runs." These passes produced 6 raw mp4s (Pass_1–5 + Render_00002 in each folder) which have not been baked to WebP sprite sheets.

---

### 1d. Symbol Animations (Wan I2V)

| Symbol | Input image | Prompt (prose v2) | Raw renders | Status |
|--------|------------|------|------------|--------|
| H1 Ao-Oni | `art/wan-animations/h1-ao-oni/input.png` | Validated | Render-rife-upscaled_00001.mp4, Render-rife_00001.mp4 | DONE — quality TBD, bake pending |
| H2 Kitsune-men | `art/wan-animations/h2-kitsune-men/input.png` | Validated | Render_00001, Render_00002, Render-rife-*, Render-upscaled variants | DONE — multiple variants, pick/bake pending |
| H3 Daitengu | `art/wan-animations/h3-daitengu/input.png` | Ready (2026-07-01 fixes applied) | Render_00001, Render_00002, Render-rife-* | DONE — pick/bake pending |
| H4 Ko-omote | `art/wan-animations/h4-ko-omote/input.png` | Ready | Render_00001, Render_00002, Render-rife-*, multiple variants | DONE — pick/bake pending |
| H5 Bake-neko | `art/wan-animations/h5-bake-neko/input.png` | Ready | No renders exist | NOT RUN |
| L1 Fire | `art/wan-animations/l1-fire/input.png` | Ready | No renders exist | NOT RUN |
| L2 Water | `art/wan-animations/l2-water/input.png` | Ready | No renders exist | NOT RUN |
| L3 Wood | `art/wan-animations/l3-wood/input.png` | Ready | No renders exist | NOT RUN |
| L4 Gold | `art/wan-animations/l4-gold/input.png` | Ready | No renders exist | NOT RUN |
| L5 Earth | `art/wan-animations/l5-earth/input.png` | Ready | No renders exist | NOT RUN |

Additionally: W (wild orb), S (temple bell), M (ofuda), X (kanabo) have NO input images prepared for Wan. This is explicitly flagged in HANDOFF_2026-06-30.md §6.

**Petal animations (complete):** 8 WebP sprite sheets deployed at `web-sdk/.../sprites/particles/petals/`. This is the one animation category that is fully shipped and wired.

---

### 1e. UI Chrome

| Asset | File | Status | Quality |
|-------|------|--------|---------|
| Reel frame | `static/assets/sprites/reelsFrame/reel_frame.webp` | Deployed | MEDIUM — origin and style unclear, may be reference-game asset |
| Frame background panel | `static/assets/sprites/reelsFrame/frame_bg1.webp` | Deployed | MEDIUM |
| FS counter panel | `static/assets/sprites/reelsFrame/Frame_FSCounter2.webp` | Deployed | MEDIUM |
| Reel frame chrome gen | `art/generated/chrome-2026-06-27/reel_frame/_picked/B_sumi_brush_flux_02.png` | Generated, NOT deployed | HIGH |
| FS panel chrome gen | `art/generated/chrome-2026-06-27/fs_panel/_picked/B_iron_plate_flux_03-nobg.png` | Generated, NOT deployed | HIGH |

**Critical gap:** The generated chrome assets (`art/generated/chrome-2026-06-27/`) are better quality than the deployed assets but have NOT been wired into the game. The game is running with the old in-engine files while the new art sits unused in the art directory.

---

### 1f. Betting Bar / UI Icons

| Asset | File | Status |
|-------|------|--------|
| icon_menu | `static/.../uiSlotsAssetsBespoke/icon_menu.webp` | Deployed |
| icon_bolt_slow/med/fast | Deployed (3 variants) | Deployed |
| icon_arrow_up | Deployed | Deployed |
| icon_autospin | Deployed | Deployed |
| icon_spin | Deployed | Deployed |
| torii | Deployed | Deployed |
| spin_medallion | Deployed (legacy, unused) | Legacy |
| Autospin active / hover | `.../autospin_active.webp`, `autospin_active_hover.webp` | Deployed |
| Turbo active / hover | `.../turbo_active.webp`, `turbo_active_hover.webp` | Deployed |

The betting bar underwent a major redesign session on 2026-06-28 (AoA single-row layout). Icons are in place. HANDOFF_2026-06-30.md lists three remaining polish items: icon tint pass (white icons on dark buttons), ground strip, spin button glow ring.

---

### 1g. Bitmap Fonts

| Asset | File | Quality |
|-------|------|---------|
| goldFont | `static/.../fonts/goldFont/mm_gold.xml` | LOW — this is "Mining" game's gold font, not an Ayakashi asset |
| goldBlur | `miningfont_gold_blur.xml` | LOW — same: Mining reference game |
| silverFont | `mm_silver.xml` | LOW — Mining reference |
| purpleFont | `mm_purple.xml` | LOW — Mining reference, purple is a style-guide-banned color |

All four bitmap fonts are explicitly the Mining reference game's assets, held as placeholders. The `assets.ts` comment says "placeholder reference bitmap fonts — swap the files when Ayakashi audio/fonts land." The purpleFont is especially problematic: the style guide bans purple as a color ("reads 'western fantasy'"), yet a purple font slot exists in the asset registry.

---

### 1h. Particles / FX Textures

| Asset | File | Quality |
|-------|------|---------|
| Petal flipbook sheets (8 variants) | `static/.../particles/petals/*.webp` | HIGH — animated, authored |
| Foxfire flame (9 frames) | `static/.../particles/foxfire/foxfire_0-8.webp` | HIGH — authored flame frames |
| Brush stroke banner | `static/.../particles/brush_wide.webp` | MEDIUM |
| Ink splat | `static/.../particles/ink_splat.webp` | MEDIUM |
| Paper shred | `static/.../particles/paper.webp` | UNKNOWN — no gen record found |
| Ember | `static/.../particles/ember.webp` | UNKNOWN — no gen record found |
| Smoke wisp | `static/.../particles/smoke.webp` | UNKNOWN — no gen record found |
| Spark | MISSING — no file, uses procedural glow-dot fallback | MISSING |
| Coin particle | MISSING | MISSING |
| Orb ring | MISSING | MISSING |
| Seal glow | MISSING | MISSING |

The paper, ember, and smoke files exist but have no art-generation session record. They may be reference-game assets from Mining, carry-overs that have not been regenerated in the Ayakashi style.

---

### 1i. Audio

Audio is a placeholder set (Mining reference game). No Ayakashi-specific audio has been produced. The `sounds.json/mp3/m4a/ogg` in `static/assets/audio/` are the reference set. Japanese instruments have been curated in `art/generated/audio/` (gong, koto, kabuki, shakuhachi, shamisen, taiko, wood-hit categories with ~50 sample candidates each), but none have been selected, mixed, or deployed.

---

### 1j. Logo

| Asset | File | Status | Quality |
|-------|------|--------|---------|
| Logo SVG | `art/ayakashi_logo.svg` + `static/assets/sprites/logo/ayakashi_logo.svg` | Deployed | MEDIUM |
| Logo WebP | `static/assets/sprites/logo/ayakashi_logo.webp` | Deployed | MEDIUM |

The logo is rendered from SVG. The style guide flags it as needing regeneration (Track A6 in IMPROVEMENT_PLAN). The current logo was not generated through the validated fal.ai pipeline — it predates the model switch. Ideogram v3 is the designated tool for the replacement (best typography model, reserved for this role).

---

## 2. What Is Missing for a 3-Star Submission

The game received a 3.7/9 (below 4.5 threshold) in its last review. The following are the gaps that would prevent a re-submission from scoring higher:

### 2a. Zero symbol animations in-game
The most visible gap. The reel spins and symbols land as static images. Every competing premium slot game has at minimum idle breathing animations on winning symbols. The Wan I2V pipeline is production-ready and all prompts are written. H5 and all L1–L5 and all four specials have not been run. H1–H4 renders exist but have not been baked to sprite sheets or wired to the engine.

### 2b. Static avatar
The avatar is a single PNG. The win celebration code (winCelebration.ts) fires avatar reaction events that have no handler. The character-led win celebration (the game's biggest differentiator) is non-functional. Avatar I2V was attempted but the results were stripped pending a new pass.

### 2c. Placeholder bitmap fonts in active use
Win amounts, bet values, and balance displays use the Mining game's gold and silver bitmap fonts. These contain no Ayakashi visual language and the silver/purple variants may conflict with the palette. Numbers in a gold Mining font on an indigo Ayakashi background are the most prominent readability indicator that this is a reskin job.

### 2d. Reference audio
No sound has been produced or deployed for Ayakashi. The game plays Mining-game audio. Audio is a top-3 reviewer trigger for "inconsistent art style."

### 2e. Chrome mismatch
The generated reel frame and FS panel (`art/generated/chrome-2026-06-27/`) are unused. The in-engine chrome assets are from an earlier design pass. The gap between generated-and-picked art and deployed art means the reviewers never see the better work.

### 2f. No loading screen animation
The loading screen shows a logo + progress bar with no animation. The improvement plan calls for an animated kitsune walking across the moon (B2), but neither the animation nor the themed loading screen exists.

### 2g. Background pick not finalized
Three bg_bg finalists exist but no decision was made. The in-engine background may be a prior generation. The game's world — its most visible persistent element — has an unclear art state.

### 2h. Pay table and game rules modals unthemed
Stock SDK Svelte panels with no Ayakashi theming. Reviewers open these. The pay table shows symbol art against whatever the panel's default background is.

### 2i. Specials have no Wan animations
W (wild orb), S (temple bell), M (ofuda), X (kanabo) need animated idle loops for win displays. No input images have been prepared for Wan for these four symbols.

---

## 3. What Is Low Quality and Needs Rework

### 3a. Bitmap fonts (HIGH PRIORITY)
All four bitmap fonts are visually wrong for Ayakashi. The `purpleFont` conflicts with the style guide's palette (purple is explicitly banned). The `goldFont` and `silverFont` use the Mining game's brushwork register. These need replacement before any reviewer sees a win amount. Options: (1) generate Ayakashi bitmap fonts using the same brush aesthetic, or (2) pivot to WebGL TextStyle with the NinjaKage or Scarfire brush fonts (already in `art/fonts/brush/`) for title text, and system monospace as a number font fallback until a proper digit font lands.

### 3b. Win celebration banner
`winCelebration.ts` builds a procedural rounded-rect lacquer plaque ("an orange blob behind the total win text" in the code comments) as a fallback when no brush texture is loaded. The `brushWide.webp` asset is deployed and preloaded — the banner should always use the sumi-e texture. Need to verify the brush texture is actually being passed to `WinCelebration` options in the Game component.

### 3c. Paper, ember, smoke particle assets
These three files exist in the deployed static directory (`paper.webp`, `ember.webp`, `smoke.webp`) but have no art-generation session record. If they are Mining reference assets, they are visually mismatched with Ayakashi's palette and line style. They are used in the win celebration particle burst and tumble effects — high-visibility moments.

### 3d. Low symbols washi texture
The washi paper backing the l1–l5 kanji is a simple procedural-looking paper. The STYLE_GUIDE calls for "aged ivory mulberry-bark washi, torn rough edges, subtle sakura petal embossing in the paper grain." The current washi appears to be a flat texture without the torn-edge character. These need a re-generate from the locked prompt.

### 3e. Specials (w/s/m/x) design strength
The four special symbols lack the visual authority the masks have. As the high-value function symbols, they anchor free spins and explosion moments. The kitsune spirit orb (w) and oni kanabo (x) need stronger graphic treatment — bigger, bolder, with more visual presence at 160 px.

---

## 4. Visual Consistency Issues

### 4a. Post-FX stack contradiction with style guide
`postFx.ts` implements the exact techniques the style guide (§9) bans: RGBSplitFilter kicks, ZoomBlurFilter pulls, GodrayFilter sweeps, ShockwaveFilter rings. IMPROVEMENT_PLAN.md Track C1 says to remove these, but they are still wired. The "no programmer art" philosophy is written in the style guide but not enforced in code. The active filter stack fires on `smash`, `bigwin`, and `fsintro` events. Per the style guide, the impact kick and godray sweep should be replaced by hand-authored sprite-sheet moments and camera-grammar tweens.

### 4b. Post-FX contradiction: the impactKick is also cited as "camera grammar"
The STYLE_GUIDE §9 says "camera grammar" (hit-stop, dip, zoom) is kept. The `impactKick` in postFx.ts uses zoom-blur, which is listed as banned in the same document. These are not the same thing. Camera grammar = `ticker.speed`, container offset, scale tweens. ZoomBlurFilter = post-process shader. The code conflates them.

### 4c. Win celebration text style uses web fonts with no fallback defined
`winCelebration.ts` uses `this.fontFamily` (defaulting to `'Arial'`) for tier titles and `this.numberFontFamily` for amounts. These are string props with no Ayakashi font wired in the Game component (not visible in the code read). If no custom font is passed, win amounts display in Arial, which is off-brand.

### 4d. `pressToContinueText` is still the Mining game's asset
`static/assets/sprites/pressToContinueText/MM_pressanywhere.json` — "MM" is Mining Madness. This text sprite is the Mining game's press-to-continue overlay.

### 4e. `freeSpins` sprite sheet is unthemed
`static/assets/sprites/freeSpins/freeSpins.json/png/webp` — this sprite sheet is used for the free spins counter and intro. The file name and likely content are from the reference SDK game, not Ayakashi-authored.

### 4f. `payFrame` is unthemed
`static/assets/sprites/payFrame/payFrame.webp` — the frame that borders pay-table / win amounts. No generation record, likely reference game.

### 4g. Coin sprite is the reference game's
`static/assets/sprites/coin/SD2_Coin.json` — "SD2" suggests Stardust or another Stake reference game. The coin particle texture used in win celebrations is not Ayakashi-themed.

### 4h. Color constants file
`packages/constants-shared/colors.ts` defines only WHITE, BLACK, GREY. The Ayakashi palette (foxfire blue, sakura pink, deep indigo, seal gold, etc.) is implemented as inline hex values inside `winCelebration.ts` (via the `PALETTE` export from fx.ts), not as a shared constants file. This creates a risk of palette drift if any other component needs to reference the brand colors.

---

## 5. Style Guideline Update / Recommendations

The existing STYLE_GUIDE.md and PROMPT_GUIDE.md are thorough and well-written. The following additions and clarifications are needed:

### 5a. Add explicit DOs/DON'Ts for particle FX (not covered in style guide)
The style guide bans "soft-glow-dot particle vocabulary" and demands "authored textures" but does not specify what those textures look like or how they are composed. Add a section covering:
- Embers: hand-drawn flake shape, warm orange/gold, irregular edge, no perfect circles
- Ink splat: asymmetric, splatter shape, not a rounded blob
- Paper shred: torn-edge rectangle, not a smooth quad
- Foxfire wisp: teardrop/flame shape with translucent tail, not a glow orb

### 5b. Add section on bitmap font / number display standards
Fonts are the highest-frequency visual element (every bet, balance, win count). Currently unaddressed in the style guide. Add:
- Numbers: use a legible brush or serif Japanese-adjacent face; gold (`#E8B94F`) for wins, moonlit silver (`#D8E3F0`) for balance, seal red (`#A22429`) for loss
- Title text (BIG WIN, SUPER WIN, etc.): NinjaKage or Scarfire brush face, stroked with ink-black
- Explicitly ban: Arial, Helvetica, any system sans-serif, the Mining-game gold/silver bitmap fonts

### 5c. Clarify post-FX permitted vs banned
The style guide says camera grammar is kept and active filter kicks are banned, but postFx.ts implements both simultaneously. The guide needs an explicit table:

| Technique | Status | Notes |
|-----------|--------|-------|
| AdvancedBloomFilter (always-on, high threshold) | PERMITTED | Grading only; never event-triggered |
| ticker.speed → 0.05 hit-stop | PERMITTED | Camera grammar |
| Container offset camera dip (4px) | PERMITTED | Camera grammar |
| Scale tween slow zoom | PERMITTED | Camera grammar |
| RGBSplitFilter (event-triggered) | BANNED | Programmer art |
| ZoomBlurFilter (event-triggered) | BANNED | Programmer art |
| GodrayFilter | BANNED | Programmer art |
| ShockwaveFilter | BANNED | Programmer art |
| Graphics circle / vector ring shockwave | BANNED | Programmer art; use authored flipbook instead |

### 5d. Add rule on asset provenance tracking
Every deployed asset must have a documented origin. Add to PIPELINE.md: any file deployed to `static/assets/` must have either a `.prompt.sha` sidecar (from gen pipeline) or an explicit entry in a per-session HANDOFF noting the source. Assets with no provenance are treated as reference-game placeholders and must be replaced.

### 5e. Add rule on washi paper sourcing
Low symbols use a shared washi texture. The style guide describes it as "aged ivory mulberry-bark washi, torn rough edges, subtle sakura petal embossing." Add to PROMPT_GUIDE: the washi template prompt must be run fresh per-project (do not reuse between games), and the torn-edge character must be visible at 1024 px. Reject candidates that read as flat paper.

### 5f. Clarify the win celebration design intent
The character-led win celebration (winCelebration.ts) anchors to the avatar position. This design only works when the avatar is animated. The style guide should state: all win tiers (big through max) are character-led; a static avatar is an incomplete implementation, not an acceptable ship state.

### 5g. Remove IP references from STYLE_GUIDE §8 (reference touchstones)
§8 still lists "Demon Slayer (Kimetsu no Yaiba)" and "ufotable" as named references after the de-IP pass that removed them from prompt prefixes. The §8 list is for internal direction only (not in prompts), but named IP in a shipped document creates a legal paper trail. Replace with abstract descriptors: "high-production late-2010s dark fantasy anime," "ink-wash environmental painting tradition."

---

## 6. Animation Status

### 6a. Symbol animations

| Symbol | Renders exist | Best pick | Baked to sheet | In-engine |
|--------|--------------|-----------|---------------|-----------|
| H1 Ao-Oni | YES (Render-rife-upscaled_00001.mp4) | NOT PICKED | NO | NO |
| H2 Kitsune-men | YES (7 files: Render_00001, _00002, rife variants) | NOT PICKED | NO | NO |
| H3 Daitengu | YES (Render_00001, _00002, rife variants) | NOT PICKED | NO | NO |
| H4 Ko-omote | YES (9 files including (1) variants) | NOT PICKED | NO | NO |
| H5 Bake-neko | NO | — | NO | NO |
| L1–L5 | NO | — | NO | NO |
| W, S, M, X | NO input images even | — | NO | NO |

H1–H4 have usable raw renders but none have been evaluated for quality, selected, and baked to WebP sprite sheets via `art/bake_sprites.py`. H5, all lows, and all specials need to be run through the Wan pipeline first.

The animation type produced is "win loop" only (prose prompts in WAN_ANIMATION_PROMPTS.md are win loop prompts). Landing animations and big-win surges have not been prompted or run.

### 6b. Avatar animations

| State | Runs attempted | Usable mp4 | Baked | In-engine |
|-------|---------------|-----------|-------|-----------|
| Idle | YES (avatar-wan-svi-idle-avatar-2026-06-27) | Render_00002.mp4 + pass variants | NO | NO (sheet removed) |
| Win | YES (avatar-wan-svi-2026-06-27) | Render_00002.mp4 + pass variants | NO | NO |
| Big-win | NO | — | NO | NO |
| FS-entry | NO | — | NO | NO |
| Loading splash | NO | — | NO | NO |

Note: The avatar I2V runs used the old (pre-SVI-Pro-lock) workflow. The HANDOFF says these should be re-run through the v5 single-pass workflow.

### 6c. Background / ambient animations

| Element | Status |
|---------|--------|
| bg_bg static | Deployed (pick unclear) |
| Petal particle sheets | DONE — 8 WebP sheets deployed, wired in engine |
| Foxfire bokeh (procedural) | Active in fxManager |
| Mist drift (procedural) | Active in backgroundAmbient.ts |
| bg_effect layer | Static sprite, no animation |
| bg_mist layer | Static sprite, no animation |
| FS intro pillars / torii | Wired (foxfire + torii sprites) |

### 6d. FX animations

| Element | Status |
|---------|--------|
| Win celebration particles | Active (uses ember/petal textures, procedural glow-dot fallback for many) |
| Kanabo smash shockwave | Active (procedural Graphics circle — violates style guide) |
| Brush banner wipe | Active (brushWide.webp deployed) |
| Payline highlight | Active (procedural) |
| Foxfire particle (authored) | Active (foxfire_0–8.webp) |
| Symbol idle breath | Code exists (symbolIdle.ts) — needs animation sheets to work |
| Symbol landing snap | Code exists — needs animation sheets |
| Tumble explosion | Code exists — uses procedural particles |
| Wild landing FX | Code exists — uses procedural particles |

---

## 7. Priority Order for Art Work

Ordered by impact on reviewer score, not by implementation complexity.

### Priority 1 — Ship-blockers (must be done before resubmission)

**P1a. Run and bake H5, L1–L5, W, S, M, X Wan animations**
H5-bake-neko and all 9 remaining symbols need Wan runs. For specials (W/S/M/X): prepare input images first (pick from `_atlas/` stills), write prose prompts using the WAN_ANIMATION_PROMPTS template, run through v5 workflow. Then bake all 10 pending symbols (H1–H4 raw renders + H5/L1-L5/W/S/M/X new renders) to sprite sheets and wire to `symbolIdle.ts`.

**P1b. Run avatar I2V and deploy idle + win sheets**
Re-run avatar through v5 SVI Pro single-pass workflow. Produce idle loop + win state (minimum viable). Bake to 4×4 WebP sheets. Wire to AvatarActor so the character-led win celebration actually works.

**P1c. Replace all four bitmap fonts**
Generate Ayakashi-specific bitmap fonts or switch the number displays to system fonts styled with gold hex color. Remove the Mining reference fonts from all four slots. The `purpleFont` slot should be either removed from assets.ts or repurposed to a foxfire-blue or seal-gold variant.

**P1d. Finalize bg_bg pick and confirm in-engine file matches**
Compare `art/generated/bg-2026-06-26/_picked/bg_bg_{flux03,seedream02,recraft01}.png` against the current `static/assets/sprites/background/bg_bg.webp`. Pick the best finalist, convert, deploy. Document the pick in HANDOFF.

**P1e. Wire generated chrome to the engine**
Deploy `art/generated/chrome-2026-06-27/reel_frame/_picked/B_sumi_brush_flux_02.png` (and the FS panel pick) as `reel_frame.webp` and `Frame_FSCounter2.webp`. These are better art than what is currently in-engine.

---

### Priority 2 — High impact, pre-review

**P2a. Audit and replace paper/ember/smoke particle textures**
If these are Mining reference assets, regenerate them against the Ayakashi style prompt. Use the PROMPT_GUIDE §4d particle template. These appear in every win event.

**P2b. Replace pressToContinueText with Ayakashi-authored asset**
The "MM_pressanywhere" text is a Mining branding. Generate a simple brush-text "PRESS ANYWHERE" in the NinjaKage or Scarfire font, baked to WebP.

**P2c. Replace coin sprite**
SD2_Coin.json is not Ayakashi. Generate a gold seal coin or foxfire orb particle sheet in the style. Or replace the gold-coin celebration with a foxfire-wisp / petal rain (already authored) instead of coins.

**P2d. Theme the freeSpins sprite sheet and payFrame**
These are SDK reference assets. Regenerate against the chrome generation session style. The FS counter panel gen exists (`Frame_FSCounter2`) — just needs deployment.

**P2e. Remove RGBSplit/ZoomBlur/Godray/Shockwave from postFx.ts**
Per style guide §9. Replace `impactKick` with `ticker.speed → 0.05` hit-stop. Replace the Graphics circle shockwave in winCelebration with a sprite-sheet ring (author a flipbook ring using the foxfire/ink aesthetic). The always-on AdvancedBloomFilter stays — that is grading, not FX.

**P2f. Produce at least one commissioned audio track**
Commission or license a 90-second ambient loop in a Japanese instruments palette (koto lead, shakuhachi breath, taiko pulse, temple bell accents). The curated audio candidates in `art/generated/audio/` should be auditioned and a selection committed. Even a single ambient loop distinguishes the game from a silent placeholder.

**P2g. Wire brushWide.webp into the WinCelebration options**
Confirm `brushTexture: assets.brushWide` is being passed to the WinCelebration constructor in the Game component. If not, the banner falls back to the procedural rounded rect for every win tier.

---

### Priority 3 — Polish (post-threshold submission)

**P3a. Loading screen animation**
Animated kitsune or foxfire motif crossing the progress bar. The avatar idle sheet (P1b) can be repurposed here.

**P3b. Theme pay table and game rules modals**
Replace stock SDK panels with Ayakashi washi-paper backdrop + lacquer frame. Use chrome gen session as design reference.

**P3c. Avatar panel lacquered frame**
The right-side avatar panel has a flat background. Add the lacquered frame + foxfire lantern motif from the chrome gen session.

**P3d. Logo regeneration**
Run Ideogram v3 on the `ayakashi_logo` prompt. Current SVG logo is pre-pipeline. A cleaner logo is the loading screen's first impression.

**P3e. Generate remaining particle textures**
Spark, orb_ring, seal_glow, coin_particle — from ASSETS_TO_GENERATE list. Currently all fall back to the procedural glow dot.

**P3f. Betting bar final polish**
Icon tint pass (white icons on dark buttons), ground strip, spin button glow ring. These are small but the betting bar is the most-used UI element.

**P3g. Author landing and big-win animation types**
The Wan prompts cover win-loop only. Landing (snap-in + impact flash) and big-win (surge forward) animation types need separate prose prompts and separate runs per symbol.

---

## Summary Scorecard (Current State)

| Category | Completeness | Quality |
|----------|-------------|---------|
| High symbol stills (h1–h5) | 100% | HIGH |
| Low symbol stills (l1–l5) | 100% | MEDIUM |
| Special symbol stills (w/s/m/x) | 100% | MEDIUM |
| Symbol animations | 4/14 rendered, 0/14 shipped | — |
| Avatar still | 100% | HIGH |
| Avatar animations | 0/5 states shipped | — |
| Background (bg_bg) | Pick unclear | MEDIUM |
| Petal animations | 100% | HIGH |
| UI chrome (reel frame, FS panel) | Generated but not deployed | MEDIUM |
| Bitmap fonts | 0/4 Ayakashi | LOW |
| Betting bar icons | ~90% | MEDIUM |
| Logo | Placeholder SVG | MEDIUM |
| Audio | 0% (reference set) | LOW |
| Particle textures | Petals + foxfire HIGH; rest unknown | MIXED |
| Post-FX compliance | 0% (banned techniques active) | LOW |
