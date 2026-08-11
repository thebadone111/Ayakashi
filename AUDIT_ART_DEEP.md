# Ayakashi — Deep Art Audit
**Date:** 2026-07-02  
**Branch:** `final-dev`  
**Last commit:** `b971896`  
**Auditor:** Claude Code (automated file audit + context synthesis)

---

## Critical Gaps (Top 5 — Fix Before Resubmission)

**GAP 1 — Zero symbol animations in-engine (10 of 14 symbols have no renders at all)**  
H1–H4 have raw mp4 output on disk but none are baked to sprite sheets or wired to the engine. H5-bake-neko, all five L symbols (l1–l5), and all four specials (w/s/m/x) have zero renders and no input images staged for W/S/M/X. The reel grid is fully static. `symbolIdle.ts` exists in-engine with no animation data to play.

**GAP 2 — Avatar is a static PNG; win celebration code fires events with no handler**  
`winCelebration.ts` emits `bigwin` / `win` avatar reaction events. `AvatarActor` has no animation sheet. Avatar I2V runs exist as raw mp4 (`Render_00002.mp4` in both avatar-wan-svi directories) but were never baked and the sheet registration was explicitly deleted from `assets.ts`. The game's single biggest differentiator — character-led win celebration — is architecturally wired but visually broken.

**GAP 3 — All four bitmap fonts are the Mining reference game's assets**  
`mm_gold.xml`, `miningfont_gold_blur.xml`, `mm_silver.xml`, `mm_purple.xml` — all four deployed bitmap fonts have "mm" or "mining" in their filenames and are explicitly identified in `assets.ts` comments as placeholder reference fonts. Win amounts, bet displays, and balance numbers all render in a Mining Madness visual language on an Ayakashi background. The `purpleFont` slot uses a palette color the style guide explicitly bans.

**GAP 4 — Generated chrome assets are better quality than what is in-engine, and they are unused**  
`art/generated/chrome-2026-06-27/reel_frame/_picked/B_sumi_brush_flux_02.png` (5.2 MB / picked) and `B_sumi_brush_flux_02-no-bg.png` (1.6 MB) and `art/generated/chrome-2026-06-27/fs_panel/_picked/B_iron_plate_flux_03-nobg.png` (2.4 MB) are sitting in the art directory, never converted or deployed. The in-engine `reel_frame.webp` (226 KB) and `Frame_FSCounter2.webp` (176 KB) are from an earlier design pass.

**GAP 5 — Zero Ayakashi audio deployed; game plays Mining reference soundtrack**  
`web-sdk/apps/lines/static/assets/audio/sounds.mp3` (2.4 MB), `.m4a` (3.5 MB), `.ogg` (2.4 MB) — these three files are the reference game's audio bundle. 68 curated Japanese instrument candidates exist in `art/generated/audio/` (gong, koto, shakuhachi, shamisen, taiko, wood-hit, kabuki) but zero have been selected, mixed, or deployed. The game is aurally a different game.

---

## Wins — What Is Production-Ready

- **H1–H5 mask stills**: Five picks at `_picked/h1.png` through `h5.png`, all also in `_atlas/` as both `.png` and `-nobg.png`. The atlas is deployed as `symbolsStatic.webp` (361 KB, 14 frames). Seedream v4 won 4 of 5 highs on palette integration; FLUX won h4 (Ko-omote) on restraint. These are the strongest visual assets in the project.
- **Avatar still**: `avatar.webp` deployed (444 KB). `art/generated/avatar-2026-06-26/_picked/avatar.png` (1.2 MB) and `avatar-nob.png` (3.3 MB — cut ready). Seedream v4 winner. Good pose, palette-correct, cuttable bg. Best single generated image in the project.
- **Petal animation system**: 8 WebP sheets deployed (`petal_v1_wan.webp` through `petal_v5_hailuo.webp`). Source mp4s from both Wan and Hailuo I2V pipelines in `petals-anim-v2-2026-06-27/mp4/`. Full pipeline proven: mp4 → frame extract → 4×4 grid → WebP. Wired in engine, plays on every win. This is the one animation category that is complete end-to-end.
- **Foxfire flame flipbook**: `foxfire_0.webp` through `foxfire_8.webp` (9 authored frames), deployed, preloaded, used in FS-intro pillars.
- **Brush wide banner**: `brush_wide.webp` (29.6 KB), deployed and preloaded. Ready to be used in WinCelebration as the sumi-e banner texture. (See §Chrome for confirmation of wiring status.)
- **Torii gate**: `torii.webp` deployed in `uiSlotsAssetsBespoke/`, used for FS intro.
- **Betting bar icons**: `icon_menu.webp`, `icon_bolt_slow/med/fast.webp`, `icon_arrow_up.webp`, `icon_autospin.webp`, `icon_spin.webp`, `autospin_active.webp`, `autospin_active_hover.webp`, `turbo_active.webp`, `turbo_active_hover.webp` — all deployed. Icon tint pass and spin glow ring are remaining polish items per HANDOFF.
- **Logo**: `ayakashi_logo.webp` (deployed) and `ayakashi_logo.svg` — functional, baked from SVG with NinjaKage brush title. Medium quality but ship-able.
- **Symbol atlas completeness**: 14 frames in `symbolsStatic.json` — h1–h5 (webp), l1–l5 (webp), s/w/x/x2 (png). All 14 game symbols have static stills. Note: the atlas uses `.png` for s/w/x/x2 while the highs and lows are `.webp` — this naming inconsistency in the JSON is worth checking but likely harmless.
- **Background generation breadth**: 4 model families tested for bg_bg (FLUX, Seedream, Ideogram, Recraft), 3 finalised into `_picked/` — a solid shortlist exists even if the pick is deferred.
- **Wan animation workflow**: Locked v5 single-pass SVI Pro workflow. 4 output variants per run (raw, rife, upscaled, rife-upscaled). Validated on H1 and H2. All 10 prose prompts written and validated. Workflow is production-ready — the bottleneck is execution time, not design.

---

## Section 1 — Symbols

### 1a. Generation Pool

Each of the 9 non-low symbols (h1–h5, w, s, m, x) was generated against two model families:
- `B_flux-pro-ultra/`: 6 candidates per symbol (numbered `_01` through `_06`, each with a `.png.prompt.sha` sidecar)
- `C_seedream-v4/`: 3 candidates per symbol (numbered `_01` through `_03`, each with a `.png.prompt.sha` sidecar)

Additionally, a `washi/` subdirectory exists with the same 6 FLUX + 3+3 Seedream/recraft candidates for the washi paper texture used in l1–l5 composites.

All picks live in `_atlas/` (composited, with and without bg) and `_picked/` (raw pick before composite). The `_picked/` directory also has a `_cast.jpg` contact sheet.

### 1b. Atlas Content (deployed: `symbolsStatic.webp`, 361 KB)

| Frame | Extension in atlas | Quality |
|-------|-------------------|---------|
| h1 Ao-Oni | .webp | HIGH |
| h2 Kitsune-men | .webp | HIGH |
| h3 Daitengu | .webp | HIGH |
| h4 Ko-omote | .webp | HIGH |
| h5 Bake-neko | .webp | HIGH |
| l1–l5 | .webp | MEDIUM |
| s (temple bell) | .png | MEDIUM |
| w (kitsune orb) | .png | MEDIUM |
| x (oni kanabo) | .png | MEDIUM |
| x2 | .png | UNKNOWN (second kanabo state?) |

**Note on m (ofuda talisman):** The atlas JSON contains 14 frames but lists `x2` instead of `m`. Either `m` was renamed to `x2` (second kanabo variant for the exploder mechanic) or `m` was dropped from the atlas and an alternative naming is in use. The `_atlas/m.png` and `_atlas/m-nobg.png` files exist on disk — confirm whether the engine references `m` by a different key or if it is truly absent from the shipped atlas.

**Note on mixed extensions:** s/w/x/x2 use `.png` in the atlas JSON while h1–h5 and l1–l5 use `.webp`. This is technically fine if the packer handled it correctly, but worth verifying no file-not-found errors at runtime.

### 1c. Unpicked Candidates (Generation Pool — NOT deployed)

Per symbol: 6 FLUX candidates + 3 Seedream candidates = 9 candidates, 1 was picked. The 8 unchosen per symbol represent potential upgrade targets if the current pick is reconsidered. For specials (w/s/m/x), the current picks are rated MEDIUM — the unchosen pool may contain stronger options. These files are in:  
`art/generated/symbols-2026-06-26/{h1..h5,w,s,m,x}/B_flux-pro-ultra/` and `C_seedream-v4/`

### 1d. Low Symbol Washi Texture

The washi texture has 6 FLUX candidates, 3 Seedream candidates, and 3 recraft candidates in `symbols-2026-06-26/washi/`. A pick exists at `_picked/washi.png` and `_picked/washi-nobg.png`. The style guide's requirement for "aged ivory mulberry-bark washi, torn rough edges, subtle sakura petal embossing" may not be fully satisfied by the current pick — this cannot be confirmed without visual inspection.

**Recommendation:** Visual-inspect the washi candidates in `C_seedream-v4/` (Seedream tends to produce more textural richness than FLUX for material surfaces). The torn-edge character should be clearly visible.

---

## Section 2 — Background

### 2a. Generation Pool

`art/generated/bg-2026-06-26/` contains generation campaigns for four background layers:
- `bg_bg/` — 6 FLUX + 3 Seedream + 3 Ideogram + 3 Recraft candidates (15 total)
- `bg_effect/` — 6 FLUX + 3 Seedream (no pick in `_picked/`)
- `bg_mist/` — 6 FLUX + 3 Seedream (no pick in `_picked/`)
- `bg_fg/` — 6 FLUX + 3 Seedream (DROPPED — cherry branches baked into bg_bg per `assets.ts` comment)

Additionally: `petal_v1/`, `petal_v2/`, `petal_v3/` generation campaigns (source stills for the petal animations) — these are now superseded by the shipped petal animation sheets.

### 2b. Background Finalists (in `_picked/`)

| File | Size | Notes |
|------|------|-------|
| `bg_bg_flux03.png` | 7.1 MB | FLUX 3rd candidate |
| `bg_bg_seedream02.png` | 847 KB | Seedream 2nd candidate |
| `bg_bg_recraft01.png` | 2.3 MB | Recraft 1st candidate |
| `bg_bg_seedream02_4x.png` | 42.5 MB | Seedream02 upscaled 4× via Real-ESRGAN |

**Deployed: `bg_bg.webp` (478 KB)**

The deployed file's origin is UNKNOWN — it is unclear whether it matches any of the three finalists. The 4x upscaled version at 42.5 MB was not converted to WebP. No explicit pick decision is documented in any HANDOFF.

**Recommendation:** Open the three finalists side by side (`bg_bg_flux03.png`, `bg_bg_seedream02.png`, `bg_bg_recraft01.png`) and compare against the deployed `bg_bg.webp`. If the deployed file does not match any finalist, it is an older generation. Pick from the finalists, convert to WebP, and deploy.

The `seedream02_4x.png` at 42.5 MB is the highest-quality version available — converting this to WebP (at appropriate quality) would give maximum detail for the most visible game element.

### 2c. Mist and Effect Layers

- `bg_effect.webp` — 63 KB, deployed, unknown provenance. Generation candidates exist in `bg-2026-06-26/bg_effect/` but no pick was made and no file was moved to `_picked/`.
- `bg_mist.webp` — 28 KB, deployed, unknown provenance. Same situation — candidates exist, no pick documented.

Both files may be from an earlier generation pass or from the reference game. Their small file sizes relative to their generation candidates suggest they may be compressed or scaled down originals rather than the best available quality.

---

## Section 3 — Avatar

### 3a. Still Assets

| File | Size | Status |
|------|------|--------|
| `art/generated/avatar-2026-06-26/_picked/avatar.png` | 1.2 MB | Source pick (Seedream v4) |
| `art/generated/avatar-2026-06-26/_picked/avatar-nob.png` | 3.3 MB | Background-removed version |
| `web-sdk/.../sprites/avatar/avatar.webp` | 444 KB | Deployed |

Generation pool: 3 FLUX + 3 Seedream candidates in `B_flux-pro-ultra/` and `C_seedream-v4/`. Seedream v4 won.

### 3b. Avatar Wan I2V Runs (2026-06-27 — OLD PIPELINE)

**Win animation run** (`art/generated/avatar-wan-svi-2026-06-27/`):

| File | Size | Notes |
|------|------|-------|
| `Render_00002.mp4` | 8.11 MB | Best candidate — final render pass |
| `Pass_1_00002.mp4` | 1.75 MB | Intermediate |
| `Pass_2_00002.mp4` | 1.81 MB | Intermediate |
| `Pass_3_00002.mp4` | 1.74 MB | Intermediate |
| `Pass_4_00002.mp4` | 2.08 MB | Intermediate |
| `Pass_5_00002.mp4` | 2.16 MB | Intermediate |

**Idle animation run** (`art/generated/avatar-wan-svi-idle-avatar-2026-06-27/`):

| File | Size | Notes |
|------|------|-------|
| `Render_00002.mp4` | 4.36 MB | Best candidate — final render pass |
| `Pass_1_00002.mp4` through `Pass_5_00002.mp4` | ~1.3–1.7 MB each | Intermediates |

**Status:** Both runs exist as raw mp4. Neither has been baked to a WebP sprite sheet. The sheet registration was deleted from `assets.ts` (comment: "New still landed without a fresh Wan I2V pass; the sheet will return after that pass runs"). HANDOFF flags that these runs used the old (pre-v5) workflow and recommends re-running through the v5 SVI Pro single-pass pipeline before baking.

**What exists in `art/wan-animations/avatar/`:** `input.png` (the avatar image for Wan input), `prompts.md`, and `output/.gitkeep` (no renders). This confirms the v5 re-run has not happened.

### 3c. Missing Avatar States

| State | Status |
|-------|--------|
| Idle animation | Raw mp4 exists (old pipeline); needs re-run + bake |
| Win animation | Raw mp4 exists (old pipeline); needs re-run + bake |
| Big-win animation | NOT RUN |
| FS-entry animation | NOT RUN |
| Loading splash key-art | NOT GENERATED |

---

## Section 4 — Wan Symbol Animation Renders

### 4a. H1 Ao-Oni (`art/wan-animations/h1-ao-oni/output/`)

| File | Size | Notes |
|------|------|-------|
| `Render_00001 (2).mp4` | ~8 MB | Raw 16fps — duplicate/retry |
| `Render-rife_00001.mp4` | 0.57 MB | RIFE 2× interpolated 32fps |
| `Render-rife_00001 (2).mp4` | ~2 MB | RIFE duplicate/retry |
| `Render-rife-upscaled_00001.mp4` | 4.7 MB | RIFE + RealESRGAN 4× — best quality |
| `Render-rife-upscaled_00001 (2).mp4` | ~8 MB | Duplicate of above |

The `(2)` suffix variants were auto-saved Windows duplicates from re-runs. The canonical files are the ones WITHOUT `(2)`. The best pick is `Render-rife-upscaled_00001.mp4` at 4.7 MB (32fps, 4× upscaled). **NOT BAKED. NOT WIRED.**

### 4b. H2 Kitsune-men (`art/wan-animations/h2-kitsune-men/output/`)

| File | Size | Notes |
|------|------|-------|
| `Render_00001.mp4` | 0.7 MB | Raw 16fps |
| `Render_00002.mp4` | 0.65 MB | Raw 16fps — second run |
| `Render-rife_00001.mp4` | ~0.6 MB | RIFE interpolated |
| `Render-rife_00002.mp4` | ~0.6 MB | RIFE second run |
| `Render-upscaled_00001.mp4` | ~0.7 MB | Upscaled only (no RIFE) |
| `Render-rife-upscaled_00001.mp4` | 4.78 MB | Best: RIFE + upscale |
| `Render-rife-upscaled_00002.mp4` | 4.89 MB | Best from second run |

Two complete runs exist. Best picks: either `Render-rife-upscaled_00001.mp4` (4.78 MB) or `Render-rife-upscaled_00002.mp4` (4.89 MB). Evaluate both for loop quality. **NOT BAKED. NOT WIRED.**

### 4c. H3 Daitengu (`art/wan-animations/h3-daitengu/output/`)

| File | Size | Notes |
|------|------|-------|
| `Render_00001.mp4` | 0.66 MB | Raw 16fps |
| `Render_00002.mp4` | ~1.1 MB | Raw second run |
| `Render-rife_00001.mp4` | ~0.6 MB | RIFE |
| `Render-rife_00002.mp4` | ~0.1 MB | RIFE second run |
| `Render-rife-upscaled_00001.mp4` | 4.14 MB | Best: RIFE + upscale |
| `Render-rife-upscaled_00002.mp4` | 4.41 MB | Best from second run |

Prompt was fixed 2026-07-01 to include explicit nose-still and flat-on orientation fixes. Two runs post-fix. **NOT BAKED. NOT WIRED.**

### 4d. H4 Ko-omote (`art/wan-animations/h4-ko-omote/output/`)

| File | Size | Notes |
|------|------|-------|
| `Render_00001.mp4` | 0.51 MB | Raw |
| `Render_00001 (1).mp4` | ~0.6 MB | Retry |
| `Render_00002.mp4` | 0.46 MB | Raw second run |
| `Render-rife_00001.mp4` | ~0.8 MB | RIFE |
| `Render-rife_00001 (1).mp4` | ~0.6 MB | Retry |
| `Render-rife_00002.mp4` | ~0.3 MB | RIFE second run |
| `Render-rife-upscaled_00001.mp4` | 3.14 MB | Best |
| `Render-rife-upscaled_00001 (1).mp4` | ~0 MB | Empty/corrupt |
| `Render-rife-upscaled_00002.mp4` | 2.86 MB | Best from second run |

Ko-omote is the lightest render (pale mask, less contrast = lower bitrate). Largest available is 3.14 MB. **NOT BAKED. NOT WIRED.**

### 4e. H5 Bake-neko (`art/wan-animations/h5-bake-neko/output/`)

`output/.gitkeep` only. **NO RENDERS EXIST.**

Prompt is written and validated. Input image exists at `art/wan-animations/h5-bake-neko/input.png`. Run is pending.

### 4f. L1–L5 (`art/wan-animations/l1-fire/ ... l5-earth/output/`)

All five: `output/.gitkeep` only. **NO RENDERS EXIST.**

Prompts written. Input images exist for all five. All runs pending.

### 4g. Specials W/S/M/X

**No Wan input images prepared.** No folders exist for w/s/m/x in `art/wan-animations/`. To run these, the pipeline requires:
1. Copy the best still from `_atlas/` (w.png, s.png, m.png, x.png) to a new `art/wan-animations/w-spirit-orb/input.png` etc.
2. Write prose prompts using the WAN_ANIMATION_PROMPTS.md template (prompts for all four specials ARE written in WAN_ANIMATION_PROMPTS.md)
3. Run through v5 workflow

### 4h. Temps Directory

`art/wan-animations/temps/outputs/` contains older generation experiments from early pipeline testing:
- Avatar states: `bigidle-1.mp4`, `bigidle-2.mp4`, `idle-1/2/3.mp4`, `win-1/2.mp4`, `maxwin-1/2.mp4` — with loop variants
- Symbol tests: `h1-1.mp4`, `h1-2.mp4`, `h2-1/2.mp4`, `h3-1/2.mp4`
- `x1-1/2.mp4` — kanabo test

These are from the early multi-pass pipeline that was superseded by v5. They should not be used for production baking — use the structured `art/wan-animations/{symbol}/output/` directories instead.

### 4i. Animation Bake Status Summary

| Symbol | Input | Prompt | Renders | Baked | In-engine |
|--------|-------|--------|---------|-------|-----------|
| H1 Ao-Oni | YES | YES | YES (5 files, best: 4.7 MB) | NO | NO |
| H2 Kitsune-men | YES | YES | YES (7 files, best: 4.89 MB) | NO | NO |
| H3 Daitengu | YES | YES (fixed 07-01) | YES (6 files, best: 4.41 MB) | NO | NO |
| H4 Ko-omote | YES | YES | YES (9 files, best: 3.14 MB) | NO | NO |
| H5 Bake-neko | YES | YES | NO | NO | NO |
| L1 Fire | YES | YES | NO | NO | NO |
| L2 Water | YES | YES | NO | NO | NO |
| L3 Wood | YES | YES | NO | NO | NO |
| L4 Gold | YES | YES | NO | NO | NO |
| L5 Earth | YES | YES | NO | NO | NO |
| W Orb | NO (atlas only) | YES | NO | NO | NO |
| S Bell | NO (atlas only) | YES | NO | NO | NO |
| M Ofuda | NO (atlas only) | YES | NO | NO | NO |
| X Kanabo | NO (atlas only) | YES | NO | NO | NO |

---

## Section 5 — Chrome Assets

### 5a. Reel Frame Generation (`art/generated/chrome-2026-06-27/reel_frame/`)

Eight design directions, each tested against two models (FLUX and Seedream), 3 candidates each = ~48 candidates total:
- `A_shimenawa_flux/` + `A_shimenawa_seedream/` — rope/shrine rope border
- `B_sumi_brush_flux/` + `B_sumi_brush_seedream/` — sumi-e ink brush strokes
- `C_lacquer_thin_flux/` + `C_lacquer_thin_seedream/` — thin lacquer frame
- `D_bamboo_paper_flux/` + `D_bamboo_paper_seedream/` — bamboo/washi
- `E_iron_flame_flux/` + `E_iron_flame_seedream/` — iron plate + flame
- `F_kumiko_wood_flux/` + `F_kumiko_wood_seedream/` — kumiko woodwork

**Picks (in `_picked/`):**
| File | Size | Notes |
|------|------|-------|
| `B_sumi_brush_flux_02.png` | 5.3 MB | Picked sumi-e FLUX candidate |
| `B_sumi_brush_flux_02-no-bg.png` | 1.6 MB | Background removed |
| `C_lacquer_thin_seedream_02.png` | 1.3 MB | Second pick — Seedream lacquer |
| `C_lacquer_thin_seedream_02-no-bg.png` | 4.5 MB | Background removed |

**CRITICAL: Neither pick is deployed.** The in-engine `reel_frame.webp` (226 KB) is a different file — likely from an earlier design pass or the reference game. An `reel_frame_orig.webp` also exists in the deployed directory, suggesting the current `reel_frame.webp` is itself a replacement but not the chrome-session pick.

### 5b. FS Counter Panel Generation (`art/generated/chrome-2026-06-27/fs_panel/`)

Four design directions × two models = ~48 candidates:
- `A_washi_strip_flux/` + `A_washi_strip_seedream/`
- `B_iron_plate_flux/` + `B_iron_plate_seedream/`
- `C_lacquer_mini_flux/` + `C_lacquer_mini_seedream/`

**Pick (in `_picked/`):**
| File | Size | Notes |
|------|------|-------|
| `B_iron_plate_flux_03-nobg.png` | 2.4 MB | Iron plate FLUX 3rd candidate, bg removed |

**The in-engine `Frame_FSCounter2.webp` (176 KB) is deployed** but its origin is not confirmed. The chrome session pick has NOT been converted to WebP and has NOT been deployed. The `_compare/` directory contains comparison images (`fs_panel_compare.jpg`, `reel_frame_compare.jpg`, `picks_frame.jpg`, `picks_fs.jpg`) that can be used to visually evaluate the picks.

### 5c. Frame Background Panel

`frame_bg1.webp` (101 KB) is deployed. This is described in `assets.ts` as "lacquered ink-cloud panel behind the reels." No generation record found in `art/generated/`. Provenance unknown.

---

## Section 6 — Deployed Static Assets — Full Inventory

### 6a. Sprites Directory (`web-sdk/apps/lines/static/assets/sprites/`)

| Path | Size | Origin | Quality |
|------|------|--------|---------|
| `avatar/avatar.webp` | 444 KB | Ayakashi gen (Seedream v4) | HIGH |
| `background/bg_bg.webp` | 478 KB | Unknown — may be older gen | MEDIUM |
| `background/bg_effect.webp` | 63 KB | Unknown provenance | UNKNOWN |
| `background/bg_mist.webp` | 28 KB | Unknown provenance | UNKNOWN |
| `coin/SD2_Coin.json` + `.webp` | — | **SD2 reference game** (Stardust 2) | FOREIGN |
| `freeSpins/freeSpins.json/.png/.webp` | — | **SDK reference game** | FOREIGN |
| `logo/ayakashi_logo.svg` + `.webp` | — | Ayakashi (pre-pipeline SVG) | MEDIUM |
| `particles/brush_wide.webp` | 30 KB | Ayakashi gen | MEDIUM |
| `particles/ember.webp` | 2.6 KB | Unknown provenance | SUSPECT |
| `particles/ink_splat.webp` | 20 KB | Ayakashi gen (FLUX) | MEDIUM |
| `particles/paper.webp` | 5 KB | Unknown provenance | SUSPECT |
| `particles/smoke.webp` | 4 KB | Unknown provenance | SUSPECT |
| `particles/foxfire/foxfire_0-8.webp` | ~few KB each | Ayakashi gen (RunComfy) | HIGH |
| `particles/petals/petal_v1_wan.webp` through `petal_v5_hailuo.webp` | 8 sheets | Ayakashi gen (Wan/Hailuo I2V) | HIGH |
| `payFrame/payFrame.webp` | — | **Unknown — likely reference game** | SUSPECT |
| `pressToContinueText/MM_pressanywhere.*` | — | **MM = Mining Madness reference** | FOREIGN |
| `progressBar/progressBar.*` | — | SDK default | UNKNOWN |
| `reelsFrame/frame_bg1.webp` | 101 KB | Unknown provenance | UNKNOWN |
| `reelsFrame/Frame_FSCounter2.webp` | 176 KB | Unknown — not the chrome pick | UNKNOWN |
| `reelsFrame/reel_frame.webp` | 226 KB | Unknown — not the chrome pick | UNKNOWN |
| `reelsFrame/reel_frame_orig.webp` | — | Backup of even older file | FOREIGN |
| `reelsFrame/reels_frame.json/.png` | — | Sprite sheet (reel frame surround) | UNKNOWN |
| `symbolsStatic/symbolsStatic.json/.webp` | 361 KB | Ayakashi gen | HIGH |
| `uiSlotsAssetsBespoke/icon_*.webp` | — | Ayakashi bespoke | MEDIUM |
| `uiSlotsAssetsBespoke/autospin_*.webp` | — | Ayakashi bespoke | MEDIUM |
| `uiSlotsAssetsBespoke/turbo_*.webp` | — | Ayakashi bespoke | MEDIUM |
| `uiSlotsAssetsBespoke/torii.webp` | — | Ayakashi gen (RunComfy) | HIGH |
| `uiSlotsAssetsBespoke/spin_medallion.webp` | — | Legacy, unused | — |
| `uiSlotsAssetsBespoke/base_button.webp` | — | Legacy, unused | — |
| `uiSlotsAssetsBespoke/base_ticker.webp` | — | Legacy, unused | — |
| `winSmall/MM_Localisation_winsmall.*` | — | **MM = Mining Madness reference** | FOREIGN |

**Foreign assets confirmed by filename:** SD2_Coin (Stardust 2), MM_pressanywhere (Mining Madness), MM_Localisation_winsmall (Mining Madness). These three are confirmed non-Ayakashi by naming convention.

**Suspected foreign/reference assets by unknown provenance:** ember.webp (2.6 KB), paper.webp (5 KB), smoke.webp (4 KB) — these extremely small file sizes are inconsistent with FLUX/Seedream generated textures and are likely grabbed from another source.

### 6b. Fonts Directory (`web-sdk/apps/lines/static/assets/fonts/`)

| Slot | XML | Texture | Origin |
|------|-----|---------|--------|
| goldFont | `mm_gold.xml` | `mm_gold.webp` | **Mining Madness** |
| goldBlur | `miningfont_gold_blur.xml` | `miningfont_gold_blur.webp` | **Mining Madness** |
| silverFont | `mm_silver.xml` | `mm_silver.webp` | **Mining Madness** |
| purpleFont | `mm_purple.xml` | `mm_purple.webp` | **Mining Madness (palette-banned color)** |

All four bitmap font slots are the Mining reference game's assets. Purple is explicitly banned by the Ayakashi style guide. None of these were generated for Ayakashi.

**Available Ayakashi fonts (NOT deployed, in `art/fonts/`):**
- `ShipporiMincho-Bold.ttf` (8.2 MB) — Japanese mincho serif
- `YujiMai-Regular.ttf` (8.1 MB) — Japanese display
- `YujiSyuku-Regular.ttf` (8.0 MB) — Japanese display with digit support (NinjaKage memory: Yuji Syuku is confirmed to have digit glyphs, unlike NinjaKage Demo)
- `art/fonts/brush/ninjakage/NinjaKageDemo-Regular.otf` (92 KB) — Brush title face (Demo = no digits)
- `art/fonts/brush/ninjakage/NinjaKageDemo-Rough.ttf` (230 KB) — Brush title face, rough variant
- `art/fonts/brush/scarfire/Scarfire-Regular.otf` + `Scarfire-Textured.otf` — Brush face
- `art/fonts/brush/shotengai/Shotengai Demo.otf` — Japanese brush

**Note:** NinjaKageDemo and Shotengai are Demo/Personal use versions — confirm licensing for commercial deployment. All three brush zip files also contain `Read Me_Personal Use.txt`.

### 6c. Audio (`web-sdk/apps/lines/static/assets/audio/`)

| File | Size | Origin |
|------|------|--------|
| `sounds.json` | 5.6 KB | Reference game manifest |
| `sounds.mp3` | 2.4 MB | **Mining/reference game audio** |
| `sounds.m4a` | 3.5 MB | **Mining/reference game audio** |
| `sounds.ogg` | 2.4 MB | **Mining/reference game audio** |

Zero Ayakashi audio deployed.

---

## Section 7 — Audio Candidates

`art/generated/audio/` contains curated Pixabay candidates (all sourced with URLs in `manifest.json`):

| Category | Count | Best candidates for Ayakashi |
|----------|-------|------------------------------|
| gong | 14 | `film-special-effects-zen-gong-199844.mp3` (3.05s), `film-special-effects-gong-91013.mp3` (6.07s) |
| koto | 12 | `japanese-koto-zen-471846.mp3` (32s loop), `musical-melody-koto-197263.mp3` (9.5s) |
| shakuhachi | 10 | `musical-shakuhachi-flute-play-51254.mp3` (274s — long ambient), `musical-shakuhachi-sequence-2-66112.mp3` (13.7s) |
| taiko | 14 | `musical-taiko-drumloop-001-120-97780.mp3` (8s loop), `film-special-effects-taiko-drum-367656.mp3` (10s) |
| shamisen | 3 | `musical-virtual-koto-shamisen-and-shakuhachi-...mp3` (25s, shared across 3 categories) |
| wood-hit | 14 | `film-special-effects-wood-hit-432148.mp3` (1.33s), `film-special-effects-wood-block-105066.mp3` (0.53s) |
| kabuki | 1 | `film-special-effects-kabuki-104876.mp3` (1.68s) — only 1 candidate |

**Total candidates:** 68 individual audio files across 7 categories.

**Deployment gap:** None of these 68 candidates have been auditioned, selected, or mixed into a deployable sounds pack. The game needs at minimum: (1) an ambient loop (shakuhachi or koto + taiko pulse), (2) reel spin sound, (3) symbol land sound, (4) win sound, (5) big-win fanfare, (6) FS trigger stinger. The current sounds.json from the reference game likely has ~20 mapped sound events that all need Ayakashi replacements.

**Kabuki gap:** Only 1 kabuki candidate (`film-special-effects-kabuki-104876.mp3`, 1.68s). This is a high-impact sound (the distinctive kabuki wood-clap is perfect for symbol landings and win triggers) — consider sourcing additional kabuki candidates.

---

## Section 8 — Fonts

### 8a. Deployed Bitmap Fonts

All four are Mining Madness (see §6b above). All must be replaced before resubmission.

### 8b. Available Ayakashi Fonts (Undeployed)

The `art/fonts/` directory contains:
- Three Japanese web fonts (`ShipporiMincho-Bold.ttf`, `YujiMai-Regular.ttf`, `YujiSyuku-Regular.ttf`) — large TTFs, not currently registered in `assets.ts`
- Four brush fonts in `art/fonts/brush/` — `ninjakage`, `scarfire`, `shotengai` extracted; others in zip

**Recommendation hierarchy:**
1. **Numbers (win amounts, bet, balance):** Use `YujiSyuku-Regular.ttf` — confirmed digit glyph support. Gold (#E8B94F) for wins, silver-blue (#D8E3F0) for balance. Register in assets.ts as a web font + use PixiJS TextStyle (not bitmap font) to avoid needing to bake a new bitmap atlas.
2. **Title text (BIG WIN, SUPER WIN, etc.):** `NinjaKageDemo-Rough.ttf` (230 KB) — best visual weight for titles. **License check required** before commercial ship.
3. **Bitmap font replacement:** If bitmap fonts must stay (for performance on lower-end devices), generate Ayakashi-specific bitmap fonts using `YujiSyuku` for the number glyphs baked into a gold and silver texture.

---

## Section 9 — Particles / FX Textures

### 9a. Deployed Particles — Status

| File | Size | Origin | Quality | Used In |
|------|------|--------|---------|---------|
| `brush_wide.webp` | 30 KB | Ayakashi gen | MEDIUM | Win celebration banner (preloaded) |
| `ink_splat.webp` | 20 KB | FLUX gen | MEDIUM | Win particles |
| `ember.webp` | 2.6 KB | UNKNOWN | SUSPECT | Win particles |
| `paper.webp` | 5 KB | UNKNOWN | SUSPECT | Win particles / tumble |
| `smoke.webp` | 4 KB | UNKNOWN | SUSPECT | Win particles |
| `foxfire_0-8.webp` | 9 frames | RunComfy (Ayakashi) | HIGH | FS intro pillars |
| `petal_v1_wan.webp` through `petal_v5_hailuo.webp` | 8 sheets | Wan/Hailuo I2V | HIGH | Ambient + win particles |

**ember/paper/smoke suspect status:** These three files are 2–5 KB each. FLUX/Seedream generates textures in the 100KB–5MB range. Files this small are either: (a) heavily compressed reference-game assets, or (b) tiny placeholder textures used in the Mining game. Their provenance is undocumented. They appear in win event particles — high-visibility moments. If they are visually wrong (e.g., generic circular embers rather than ink-smear embers), they should be regenerated.

### 9b. Missing Particles (from `ASSETS_TO_GENERATE` list)

| Asset | Status | Impact |
|-------|--------|--------|
| spark.webp | MISSING — procedural glow dot fallback | Low-med |
| coin_particle.webp | MISSING — SD2_Coin.json substitutes | HIGH (branding) |
| orb_ring.webp | MISSING — procedural | Low |
| seal_glow.webp | MISSING — procedural | Low |

The SD2_Coin substitute is the most visible — the gold coin celebration in win events is from a different game. If the coin celebration FX is prominent, replace with a foxfire-wisp burst (petals already authored) or generate an ink-seal coin texture.

---

## Section 10 — Visual Consistency Issues (Code-Level)

These are not missing art assets — they are code-level issues that undermine the art that exists:

### 10a. Post-FX violations (postFx.ts)
`RGBSplitFilter`, `ZoomBlurFilter`, `GodrayFilter`, `ShockwaveFilter` are actively wired and fire on `smash`, `bigwin`, `fsintro`. Style guide §9 bans all four. `AdvancedBloomFilter` (always-on) is permitted. The `impactKick` uses `ZoomBlurFilter` but should use `ticker.speed` hit-stop.

### 10b. Win banner wiring uncertain
`brushWide.webp` is deployed and preloaded. Whether it is passed as `brushTexture: assets.brushWide` to the `WinCelebration` constructor in the Game component needs verification. If not passed, every win tier shows the procedural rounded-rect fallback ("orange blob").

### 10c. Win celebration font uses Arial fallback
`winCelebration.ts` defaults `this.fontFamily` to `'Arial'`. No Ayakashi font is wired in the Game component (not visible in assets.ts). Win amounts likely display in Arial.

### 10d. pressToContinueText is Mining Madness
`MM_pressanywhere.json/.png/.webp` — three files, all with Mining Madness branding. This overlay appears every time the player needs to proceed.

### 10e. winSmall is Mining Madness
`MM_Localisation_winsmall.json/.png/.webp` — three files. Used for the small win display animation.

### 10f. freeSpins sprite sheet is unthemed
`freeSpins.json/.png/.webp` — the FS counter/intro sprite sheet is from the SDK reference game.

### 10g. payFrame is unthemed
`payFrame.webp` — the frame around win amounts in the pay table. No generation record.

### 10h. progressBar is unthemed
`progressBar.json/.png/.webp` — the loading progress bar sprite sheet. No generation record.

---

## Priority Action List

### Priority 1 — Must-Have for Resubmission

| # | Action | Files involved |
|---|--------|----------------|
| P1.1 | Bake H1–H4 Wan renders to WebP sprite sheets; pick best `Render-rife-upscaled` per symbol | `art/wan-animations/h1-h4/output/*.mp4` → `symbolsStatic/` atlas or per-symbol sheet |
| P1.2 | Run H5, L1–L5 through v5 Wan pipeline; bake all 6 | `art/wan-animations/h5-bake-neko/ ... l5-earth/` |
| P1.3 | Stage W/S/M/X input images; run through v5 Wan | Copy `_atlas/w.png etc.` → create `art/wan-animations/w-spirit-orb/input.png` etc. |
| P1.4 | Re-run avatar I2V through v5 pipeline (win + idle states minimum); bake and wire | `art/wan-animations/avatar/input.png` → new sheets → `assets.ts` |
| P1.5 | Replace all 4 bitmap fonts OR switch to WebGL TextStyle with YujiSyuku | `art/fonts/YujiSyuku-Regular.ttf` → register in assets.ts |
| P1.6 | Pick bg_bg finalist; confirm in-engine file matches; deploy best candidate | `art/generated/bg-2026-06-26/_picked/bg_bg_{flux03,seedream02,recraft01}.png` |
| P1.7 | Deploy chrome picks: convert `B_sumi_brush_flux_02-no-bg.png` → `reel_frame.webp`; convert `B_iron_plate_flux_03-nobg.png` → `Frame_FSCounter2.webp` | `art/generated/chrome-2026-06-27/*/\_picked/` |
| P1.8 | Select and deploy at minimum 1 ambient audio track + ~6 key SFX from curated pool | `art/generated/audio/{koto,shakuhachi,gong,taiko,wood-hit}/` |

### Priority 2 — High Impact Before Review

| # | Action |
|---|--------|
| P2.1 | Audit ember/paper/smoke: compare visually against Ayakashi style; if mismatched, regenerate |
| P2.2 | Replace `pressToContinueText` (MM_pressanywhere) with Ayakashi brush-text asset |
| P2.3 | Replace `winSmall` (MM_Localisation_winsmall) with Ayakashi-styled win display |
| P2.4 | Replace `SD2_Coin` with foxfire/petal burst (reuse existing petal system) or generate ink-seal coin |
| P2.5 | Remove RGBSplit/ZoomBlur/Godray/Shockwave from postFx.ts; replace impactKick with ticker.speed hit-stop |
| P2.6 | Confirm/wire `brushTexture: assets.brushWide` into WinCelebration options |
| P2.7 | Wire NinjaKage or YujiSyuku font for win celebration title text |

### Priority 3 — Polish

| # | Action |
|---|--------|
| P3.1 | Theme freeSpins sprite sheet |
| P3.2 | Theme payFrame and progressBar |
| P3.3 | Theme pay table and game rules modals |
| P3.4 | Loading screen animation (kitsune / foxfire motif) |
| P3.5 | Betting bar polish: icon tint, ground strip, spin button glow ring |
| P3.6 | Regenerate logo via Ideogram v3 |
| P3.7 | Generate spark/orb_ring/seal_glow particle textures |
| P3.8 | Source additional kabuki SFX candidates (only 1 exists currently) |

---

## Appendix A — File Count Summary

| Category | Generated | Picked/Deployed | Gap |
|----------|-----------|----------------|-----|
| Symbol stills (h1-h5) | 9 candidates each | 1 each, all in atlas | None |
| Symbol stills (l1-l5) | Composite from washi | All in atlas | None |
| Special stills (w/s/m/x) | 9 candidates each | 1 each, all in atlas | m key TBD |
| Symbol animations | H1–H4 raw mp4; H5/L1-5/W/S/M/X none | 0 baked | Major |
| Avatar still | 6 candidates | 1 deployed | None |
| Avatar animations | 2 old-pipeline mp4 sets | 0 baked | Major |
| Background (bg_bg) | 15 candidates | 3 in _picked | Pick not deployed |
| Background (effect/mist) | 9 each | 0 picked | Unclear |
| Chrome reel frame | ~48 candidates | 2 in _picked | Picks not deployed |
| Chrome FS panel | ~24 candidates | 1 in _picked | Pick not deployed |
| Petal animations | 10 mp4s (Wan+Hailuo) | 8 WebP sheets deployed | Complete |
| Foxfire particles | 9 frames (RunComfy) | 9 deployed | Complete |
| Bitmap fonts | 0 Ayakashi generated | 4 Mining reference | Critical |
| Audio | 68 candidates | 0 deployed | Critical |
| Web fonts | 3 TTFs + 4 brush OTFs | 0 registered | Critical |
