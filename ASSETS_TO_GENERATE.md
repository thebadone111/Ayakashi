# Ayakashi — Assets To Generate (3-Star Upgrade)

**Written:** 2026-07-03 · Reviewed against `art/` contents same day · Companion to `GUIDE_3STAR.md`.

All code-side work from the 3-star guide is done (math re-run verified, all
FE bugs fixed, reference assets stripped, fonts pivoted to Yuji Syuku). What
remains is **generation work only** — every item below lists the asset, the
target file, and the prompt (sourced from `art/PROMPT_GUIDE.md` and
`WAN_ANIMATION_PROMPTS.md`).

## Art directory quality scorecard (reviewed 2026-07-03)

| Set | Rating | Verdict |
|-----|--------|---------|
| Symbols stills (`symbols-2026-06-26`) | 9/10 | Ship. Minor polish: Ofuda kanji is AI-gibberish (東東伸の寿); X reads more western mace than kanabo. Non-blocking. |
| Background (`bg-2026-06-26`) | 9/10 | Ship. seedream02 deployed. |
| Chrome (`chrome-2026-06-27`) | 7/10 | Ship. Sumi frame's pink inner rim slightly off the gold/cyan accent system. |
| Avatar still (`avatar-2026-06-26`) | 8/10 | Ship. |
| Avatar idles (`avatar-wan-svi-idle-avatar`, `avatar-idle-seedance`) | promising | **Already rendered, on-model** — pick & bake, don't regenerate (§2). |
| Wan symbol renders (`wan-animations`) | 6/10 uneven | H1 8/10, H3 7/10 usable; **H2 4/10 and H4 3/10 drift off-design — re-run** (§1). None loop seamlessly (one-way clips). |
| Petals (`petals-anim-v2`) | 9/10 | Done, deployed. |
| Audio (`generated/audio`) | 4/10 as a solution | Pixabay sample library. SFX coverable; **no real BGM exists** (§5). |

Pipeline references:
- **Wan I2V**: RunPod ComfyUI, workflow `C:\Users\tiger\Downloads\Wan 2.2 I2V 3 pass v5.json` (params locked in `WAN_ANIMATION_PROMPTS.md` §Workflow Parameters). Per symbol: swap input image in LoadImage node 97, swap prompt in CR Prompt Text node 366, run, prefer the `Render-rife-upscaled` output.
- **Bake**: `python art/bake_sprites.py --input <mp4> --out web-sdk/apps/lines/static/assets/sprites/symbols/<sym>_idle.webp`
- **Stills**: fal.ai FLUX 1.1 Pro Ultra + Seedream v4 (see `art/PROMPT_GUIDE.md` §6).

---

## STATUS 2026-07-05 — QUALITY PASS COMPLETE

All 13 symbols + avatar idle/cheer + tumble ink-burst re-rendered at **720px on
green screen** (from the exact atlas cutouts) and baked through the rebuilt
pipeline (`art/bake_sheets_v2.py` → `winSheets.manifest.json`). Key wins:
- **Smoke eliminated.** The Wan LoRA rendered any "aura/glow/wisp/ember/flame"
  language as volumetric smoke (the "CG look"). Fix: contained objects (masks,
  orb) keep a subtle glow pulse; hanging/emitting objects (bell, ofuda, kanabo)
  and the medallions use **pure physical motion** (sway/float/flutter + a
  metallic highlight sweep), zero glow — nothing left to bloom. Hard anti-smoke
  negative injected into the render graph.
- **Per-symbol drawScale** (measured vs the static atlas) so each flipbook's
  frame-0 matches the static symbol size exactly — no size-pop on win.
- Green-screen keying + despill + stray-island cleanup + edge-falloff; every
  sheet ≤ 4096px (mobile-safe). Avatar re-rendered green so the dark kimono
  keys cleanly. Verified: per-clip frame QC, drawScale-match composite, avatar-
  over-bg composite. Engine type-clean (svelte-check 176, ≤ baseline).

Pipeline of record: `art/bake_sheets_v2.py` (was bake_win_sheets.py /
bake_avatar_sheets.py). Prompts: `_prompts-20260705*` (v3 masks/orb, v4
physical-motion). Renders: `art/wan-animations/_renders-720-20260705/`.

---

## 1. Symbol win-loop animations (Wan I2V) — NON-NEGOTIABLE #8

Prose prompts for **every** symbol now exist in `WAN_ANIMATION_PROMPTS.md`
(H1–H5, L1–L5 were already there; **W, S, M, X added 2026-07-03**; the
flat-on orientation fix was back-ported into H1/H2).

**Review findings 2026-07-03 (frame-extracted from ALL 9 distinct runs, 5
frames each — composition-level only; check motion smoothness by playing the
picked mp4s before baking):**
- **H1 (8/10): SHIP run `00001`** — identity rock-solid in both runs, and
  run 1's last frame lands near its first (closest to a real loop in the set).
- **H3 (7.5/10): SHIP either run** — amber ignition + gold brow flare hold
  identity in both; run 2's flare slightly prettier.
- **H2 (4/10): RE-RUN — both runs fail the same way** (closed eye-slits open
  into golden cat eyes, red forehead blotch, run 1 adds full orange fire), so
  it's a prompt problem, not a seed problem. Add anchors: `the eye slits
  remain narrow and closed-lidded`, `the forehead stays clean white porcelain`,
  keep the flat-on sentence.
- **H4 (6.5/10): DESIGN CALL.** All 3 runs open the mask's eyes (unbeatable
  prior without anchoring), but run `00001 (1)` — gold halo ring igniting,
  dissolving to sparkles, settling calm — is elegant and on-palette. If "the
  serene mask awakens on a win" is acceptable, ship run `(1)` today; discard
  the other two (grey-skin smoke / lightning + drip artifact). If closed-eye
  stillness is non-negotiable, re-run with `her eyes remain gently closed
  throughout`, `no lightning, no electricity`.
- **None of the runs loop except approximately H1-run1** — they're one-way
  "win reveal" clips. Acceptable if played once on win; for true idles,
  emphasize the loop-closure sentence in re-runs and use ping-pong bakes
  (like the petal sheets) as fallback.

| Symbol | Input still | Prompt | Status |
|--------|-------------|--------|--------|
| H1 Ao-Oni | `art/wan-animations/h1-ao-oni/input.png` | WAN §H1 | **Rendered, GOOD** — pick from 5 outputs, bake |
| H2 Kitsune-men | `art/wan-animations/h2-kitsune-men/input.png` | WAN §H2 | **Rendered, RE-RUN** — identity drift (see above) |
| H3 Daitengu | `art/wan-animations/h3-daitengu/input.png` | WAN §H3 | **Rendered, GOOD** — pick from 6 outputs, bake |
| H4 Ko-omote | `art/wan-animations/h4-ko-omote/input.png` | WAN §H4 | **Rendered, DESIGN CALL** — run `00001 (1)` usable if eyes-opening is accepted (see above) |
| H5 Bake-neko | `art/wan-animations/h5-bake-neko/input.png` | WAN §H5 | **Run** (note: H5 is cut from the math — only animate if it returns to the reels; otherwise skip) |
| L1 Fire 火 | `art/wan-animations/l1-fire/input.png` | WAN §L1 | **Run** |
| L2 Water 水 | `art/wan-animations/l2-water/input.png` | WAN §L2 | **Run** |
| L3 Wood 木 | `art/wan-animations/l3-wood/input.png` | WAN §L3 | **Run** |
| L4 Gold 金 | `art/wan-animations/l4-gold/input.png` | WAN §L4 | **Run** |
| L5 Earth 土 | `art/wan-animations/l5-earth/input.png` | WAN §L5 | **Run** |
| W Spirit Orb | `art/generated/symbols-2026-06-26/_atlas/w.png` | WAN §W *(new)* | **Run** |
| S Temple Bell | `art/generated/symbols-2026-06-26/_atlas/s.png` | WAN §S *(new)* | **Run** |
| M Ofuda | `art/generated/symbols-2026-06-26/_atlas/x.png` | WAN §M *(new)* | **Run** |
| X Kanabo | `art/generated/symbols-2026-06-26/_atlas/x2.png` | WAN §X *(new)* | **Run** |

**Integration note (code, ~half a day, after bakes land):**
`symbolIdle.ts` is currently a procedural breath manager, not a flipbook
player. Wire baked sheets the same way `fxManager.ts` slices the petal
sheets (`sliceSheet()`, 4×4 grid): register each `<sym>_idle.webp` in
`assets.ts`, slice at load, and have `SymbolIdleManager` swap the symbol
sprite's texture through the frames instead of (or on top of) the scale
breath. Fall back to the existing procedural breath for any symbol whose
render drifts badly across all 4 output variants (acceptable for lows,
not for highs).

---

## 2. Avatar animations (Wan I2V) — NON-NEGOTIABLE #7 — ✅ DONE 2026-07-04

**Resolved:** idle + cheer re-rendered against a green screen
(`art/wan-animations/avatar/input-greenscreen.png`, prompts in this section),
keyed + despilled by `art/bake_avatar_sheets.py`, deployed as
`static/assets/sprites/avatar/avatar_idle.webp` (24f) / `avatar_cheer.webp`
(16f), and wired: idle cycles on the mesh under the procedural flow;
big wins twirl into the animated cheer clip (`AvatarActor.setPoseFrames`).
The notes below are kept for reference / future re-runs.

**IDLE: do NOT regenerate from scratch.** Reviewed 2026-07-03 — usable idle
candidates already exist and hold the character on-model with subtle
breathing/tail motion:
- `art/generated/avatar-wan-svi-idle-avatar-2026-06-27/Render_00002.mp4` (485 frames, Wan-SVI)
- `art/generated/avatar-idle-seedance-2026-06-27/idle_a.mp4` / `idle_c.mp4` / `idle_d.mp4` (193–241 frames, Seedance)

Pick the one with the cleanest loop seam (check first vs last frame), then
bake. Only the **cheer** still needs a fresh render.

Input still (for the cheer run): `art/generated/avatar-2026-06-26/_picked/avatar.png`,
through the same v5 workflow (97 frames). Bake each to a 4×4 WebP sheet at 256 px/frame
→ `static/assets/sprites/avatar/avatar_idle.webp` / `avatar_cheer.webp`.

Then register in `game/assets.ts`:

```ts
avatarIdleSheet: { src: 'sprites/avatar/avatar_idle.webp', preload: true },
avatarCheer:     { src: 'sprites/avatar/avatar_cheer.webp', preload: true },
```

`fxManager.registerAvatar()` already guards `setPoses` — it activates
automatically once `avatarCheer` resolves. (An `avatarWink` pose is optional;
same guard covers it.)

**Idle loop prompt** (template: WAN §Writing Template):

```
A silver-haired kitsune shrine maiden stands centered in the frame, fox
ears upright, dark indigo kimono with sakura embroidery hanging still at
rest, pale foxfire wisps hovering near her shoulders. She holds her pose,
neither stepping nor turning. Her chest slowly rises and falls in a gentle
breathing rhythm. Her long hair and kimono sleeves continuously sway
softly side to side, lagging gently behind each breath. The foxfire wisps
at her shoulders steadily brighten then dim. Sparse pink petals drift
slowly downward past her and dissolve. The motion returns to rest and the
cycle repeats seamlessly. Static locked camera. No camera movement.
```

**Win reaction (cheer) prompt** — kept cyclic so the loop seam survives:

```
A silver-haired kitsune shrine maiden stands centered in the frame, fox
ears upright, dark indigo kimono with sakura embroidery, cyan foxfire
wisps circling her at rest. She holds her position, neither stepping nor
turning away. She gently raises both arms upward in celebration, her
sleeves lifting with a soft lag, then gradually lowers them back to rest.
Her hair sways continuously with the motion, trailing gently behind. The
foxfire wisps steadily brighten to a vivid glow at the peak of her
gesture then dim back. Several gold sparks drift slowly upward around
her and dissolve. The motion returns to rest and the cycle repeats
seamlessly. Static locked camera. No camera movement.
```

---

## 3. Logo rebake — licence follow-up

`static/assets/sprites/logo/ayakashi_logo.webp` was baked (bake-logo.py)
from **NinjaKageDemo-Regular.otf** — the demo face we just removed from the
runtime for licence reasons. A baked raster still derives from the demo font.
Either purchase the Ninja Kage commercial licence (covers the logo only), or
rebake: edit `bake-logo.py` to point at `art/fonts/YujiSyuku-Regular.ttf`
and re-run. No prompt needed — this is a font-render pipeline, not a gen.

Optional gen alternative (Ideogram v3 is reserved for typography per
PROMPT_GUIDE §6): brush-calligraphy logotype "AYAKASHI" + 妖かし, gold on
transparent, sumi-e stroke energy — but the bake pipeline is the zero-risk
path.

---

## 4. Big-win shockwave ring (flipbook) — P1-ART-02 leftover

The event-triggered screen-space filters were removed (postFx.ts is now
bloom + hit-stop only). `winCelebration.ts` `spawnShockwave()` still draws a
procedural Graphics circle — replace with an authored ink-ring flipbook.

Target: `static/assets/sprites/particles/ink_ring_burst.webp` (8-frame row,
sliced like the petal sheets).

Prompt (PROMPT_GUIDE §4e flipbook template):

```
anime fx animation frames, demon slayer style
+ a sumi-e ink shockwave ring burst animation, 8 sequential frames of a
  single brush-stroke circle expanding outward from small dense ring to
  wide thin dissipating ring, gold-white ink on black, ragged brush edge
+ 8 frames in a single horizontal row, evenly spaced, each frame on pure
  black square, identical composition per frame, sprite sheet layout,
  hand-drawn sakuga animation frames, no in-betweens missing
Negatives: text, frame numbers, watermark, irregular spacing, varying
frame size, drift between frames, photorealistic, 3d render
```

---

## 5. Audio — NON-NEGOTIABLE #3 (the current bundle is 100% Mining audio)

**Reviewed 2026-07-03:** `art/generated/audio/` is a 68-file Pixabay sample
library sorted by instrument, not composed game audio. Split the work:

- **SFX: coverable from the library.** wood-hit (reel stops), gong (scatter
  sting, big-win resolve), taiko one-shots (anticipation, impacts), koto
  plucks (tumble ladder — note the koto folder contains mislabelled celtic
  harp files, audition carefully).
- **BGM: NOT coverable.** Only 4 files exceed 60 s and none is a seamless
  game loop. The base-game and free-spins BGM loops must be commissioned or
  licensed (Pond5/AudioJungle, Japanese instruments category). This is the
  single biggest unsolved asset in the project.

Rebuild the bundle with `build-audio-bundle.py`, then swap key names in
`game/sound.ts` (keys like `sfx_multiplier_landing`, `sfx_royals_landing`
are Mining names and must go).

Minimum viable set for submission:

| Cue | Spec |
|-----|------|
| Base game BGM loop | ~90 s seamless loop, koto + shakuhachi over a low taiko pulse, night-time, sparse |
| Free spins BGM loop | same palette, denser taiko, higher energy |
| Scatter sting | 2–3 s, temple bell toll + drum hit |
| Big win flourish | 3–5 s, taiko roll into gong resolve |
| Tumble koto ladder ×5 | single koto plucks stepping up a pentatonic scale (`tumble_win_1..5`) |
| Anticipation loop | building taiko heartbeat, loopable (`sfx_anticipation`) |
| Reel stop ×5 | wood-block/kokiriko clicks, descending set |

---

## 6. Optional polish (non-blocking, spotted in the 2026-07-03 art review)

- **Ofuda (M) kanji is AI-gibberish** (東東伸の寿 — not a real phrase). Fix
  the cheap way: composite real text (e.g. 招福 "good fortune" or 御守
  "protective charm") over the scroll in Yuji Syuku via Pillow, exactly like
  the low-symbol pipeline (PROMPT_GUIDE §4g). Only Japanese readers notice.
- **X Kanabo reads as a western spiked mace.** A regen with `octagonal
  studded iron kanabo war club, parallel rows of blunt square studs, no
  spikes` in the subject block would land closer to the folklore weapon.
- **Sumi reel frame's pink inner rim** sits slightly off the gold/cyan accent
  system — a hue-shift toward gold in post is enough if it ever bothers.

## 7. Priority order — the shortest path to 3 stars

1. **Audio BGM** (§5) — hard submission blocker, longest lead time if
   commissioned. Start first.
2. **Avatar idle pick + bake + cheer render** (§2) — non-negotiable #7,
   mostly done already.
3. **Wan queue** (§1): L1–L5 + W/S/M/X runs, H2/H4 re-runs, then pick/bake
   all + wire flipbook playback in `symbolIdle.ts` — non-negotiable #8.
4. **SFX bundle rebuild** (§5) from the Pixabay library + `sound.ts` key swap.
5. **Logo rebake** (§3) — licence hygiene, 30 minutes.
6. **Ink-ring flipbook** (§4) and §6 polish — only if time remains.
7. **Final human QA**: 30-min desktop + 15-min portrait play sessions
   (GUIDE_3STAR §7 "Final Verification" — the only unticked non-asset items).

## 8. Explicitly NOT needed anymore (resolved in code this session)

- ~~Bitmap fonts (gold/silver/purple/blur)~~ — removed; no runtime consumer, all text is Yuji Syuku TextStyle.
- ~~Press-anywhere text asset~~ — now live Yuji Syuku Text in `PressToContinue.svelte`.
- ~~Coin sheet~~ — bespoke yen coin already built; renamed `ayakashi_coin.*`.
- ~~bg_bg pick~~ — deployed file **is** `bg_bg_seedream02` (pixel-diff MAE 0.4 vs its 4× upscale). Documented here per GUIDE §3B.
- ~~Reel frame / FS panel chrome~~ — already deployed (`B_sumi_brush_flux_02`, `B_iron_plate_flux_03-nobg`).
- ~~Particle textures~~ — paper/ember/smoke are FLUX-generated originals (commit 25b74fa), not Mining assets.
