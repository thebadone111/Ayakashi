# Ayakashi — Session Handoff

**As of:** end of 2026-06-26 / morning 2026-06-27
**Branch:** `final-dev` (uncommitted; nothing pushed today)
**Phase:** Track A art reset — Phase 1 (asset generation) ≈ 70% done.
Phase 2 (wiring assets into the web-sdk) **not yet started**.

This is the picking-up-cold doc. If you skim only one thing: §3 + §7.

---

## 1. What changed this session

The two locked-in decisions everything else depends on.

### 1.1. The high symbols are MASKS, not character portraits

The 2026-06-15 plan generated h1–h5 as anime-portrait character art. Five
pretty anime women/warriors in a row read indistinguishable at 160 px and
competed visually with the avatar. **Pivoted to traditional Japanese
yokai theater masks** — culturally canonical, silhouette-distinct,
set-cohesive. See [art/STYLE_GUIDE.md](art/STYLE_GUIDE.md) §2 and
§6 for the locked cast/composition.

### 1.2. The style prefix is de-IP'd

Was: `"key visual from a painterly anime film in the style of Demon
Slayer / ufotable…"`. Now: `"painterly dark-fantasy anime, Edo-period
rural Japanese yokai folklore…"`. Reasons: (1) named studio anchors were
triggering training-prior shortcuts the negatives couldn't undo (forced
petals, vermillion temples, etc.); (2) IP-naming is a legal smell on a
shipping product. The mechanical instructions (palette, sumi-e contours,
cel-shading) didn't change.

---

## 2. What's locked

### 2.1. Cast palette (high symbols)

| Symbol | Yokai | Palette |
|---|---|---|
| h1 | Ao-oni mask | deep indigo lacquered wood + cyan foxfire accents |
| h2 | Kitsune-men fox mask | white porcelain + red curling brushwork |
| h3 | Daitengu mask | deep crimson red lacquer (long protruding nose) |
| h4 | Ko-omote Noh female mask | pale silver-white + cool blue tint |
| h5 | Sinister bake-neko mask | charcoal-green into ink-black + ember slit eyes |

Ao-oni (blue oni) is a canonical Japanese folklore variant, so moving oni
to indigo is grounded — frees crimson for the tengu and gives each of
the 5 highs its own hue.

### 2.2. Models

The fal.ai 2-model mix (NoobAI dropped 2026-06-26):

- **FLUX 1.1 Pro Ultra** — `fal-ai/flux-pro/v1.1-ultra` — best
  cuttability + restraint, wins canonical specs
- **Seedream v4** — `fal-ai/bytedance/seedream/v4/text-to-image` — most
  prompt-literal, wins palette/foxfire integration, wins unusual specs

Honourable mentions:
- **Recraft v3** — used once for bg_bg (painterly-illustration register).
  Has a 1000-char prompt cap; needs a compact prompt.
- **Ideogram v3** — tested for bg_bg, didn't beat FLUX/Seedream.
- **RunComfy** — driver restored at [art/runcomfy_generate.py](art/runcomfy_generate.py)
  BUT the project's deployment was deleted server-side (the API list
  endpoint reports it as alive, inference calls return
  `"error": "DeletedDeployment"`). Would need a fresh deployment to
  revive. Probably not worth it — fal.ai outputs are stronger now.

Image-to-video (used for animated petals; will be used for avatar):
- **Wan 2.2 a14b** — primary. Better motion realism + identity preservation.
- **Hailuo 02 standard** — cheaper fallback, faster, smaller files.

### 2.3. Manual background removal — IMPORTANT

Max cuts backgrounds **by hand**, except trivially easy cases (single
opaque object on flat solid color). Do not chain rembg/BiRefNet/alpha-
matting onto generation pipelines. See
[memory/bg-removal-manual.md](memory/bg-removal-manual.md) — saved as
session feedback.

This drives a convention: source PNGs in `_picked/<sym>.png`, manually-cut
versions in `_picked/<sym>-nobg.png`. Scripts that need cut versions
should prefer the `-nobg` variant (see [art/compose_atlas.py](art/compose_atlas.py)
`picked_source()` for the pattern).

### 2.4. Lows pipeline — REVERSED

Was: AI-generate kanji on washi, hand-comp as fallback. Now: **font-comp
is primary**, AI not used. Reasoning: kanji are typeface data and
diffusion models hallucinate ~50% of them. Yuji Syuku in
[art/fonts/](art/fonts/) is CJK-complete, mechanically uniform across
all five lows (which is the *whole point* of the lows family), zero
hallucination, ~$1 cheaper. Implementation lives in
[art/compose_atlas.py](art/compose_atlas.py) `compose_low()`.

---

## 3. Where the assets are

```
art/generated/
├── audio/                              # purchased Pixabay SFX bundle (unchanged)
├── avatar-2026-06-26/
│   └── _picked/avatar.png              # locked Seedream V3 cuttable still
│                                       # (still needs Wan I2V animation pass)
├── symbols-2026-06-26/
│   ├── _picked/                        # locked highs h1–h5 + washi + w/s/m/x
│   │                                   # plus h*-nobg.png for the hand-cut versions
│   ├── _atlas/                         # final 14-tile atlas (h*, l*, w, s, m, x)
│   │   └── _grid.jpg                   # 3-row visual preview
│   └── h1/ h2/ … x/                    # all candidate gens
└── bg-2026-06-26/
    ├── _picked/
    │   ├── bg_bg_flux03.png            # 3 bg_bg finalists — final pick deferred
    │   ├── bg_bg_seedream02.png
    │   ├── bg_bg_recraft01.png
    │   ├── petal_v1.png … petal_v5-nobg.png  # source stills + hand-cuts
    │   └── backups/                    # alt petal variants
    └── bg_bg/ bg_fg/ bg_effect/ bg_mist/ petal_v1/ petal_v2/ petal_v3/   # candidates

art/generated/petals-anim-v2-2026-06-27/
├── mp4/                                # 10 raw Wan + Hailuo videos (5 petals × 2 models)
├── sheets/                             # 10 baked 4×4 256 px WebP sprite sheets
└── _picked/
    ├── petal_v1_hailuo.webp            # 5 PRIMARY picks (~241 KB total)
    ├── petal_v1_wan.webp
    ├── petal_v3_hailuo.webp
    ├── petal_v5_hailuo.webp
    ├── petal_v5_wan.webp
    └── backups/                        # 3 BACKUP picks (v2 × 2, v4 hailuo)
```

For the symbol atlas specifically, the 14 tiles in `_atlas/` are
**production-ready** and just need to be converted to WebP and copied
into `web-sdk/apps/lines/static/assets/symbols/`.

---

## 4. Where the code is

The `art/` directory is at minimum-viable shape (3 docs, 9 scripts, logo,
fonts, generated dir). Everything else got moved to git history during a
cleanup pass.

| File | Purpose |
|---|---|
| [art/STYLE_GUIDE.md](art/STYLE_GUIDE.md) | The art bible — read this first |
| [art/PROMPT_GUIDE.md](art/PROMPT_GUIDE.md) | Per-category prompt templates |
| [art/PIPELINE.md](art/PIPELINE.md) | 4-step canonical workflow |
| [art/fal_generate.py](art/fal_generate.py) | Shared fal.ai helpers (gen_one, gen_batch, build_contact_sheet) |
| [art/symbol_gen.py](art/symbol_gen.py) | Symbol candidate generator |
| [art/avatar_ab.py](art/avatar_ab.py) | Avatar still generator |
| [art/bg_gen.py](art/bg_gen.py) | Background-layer generator |
| [art/bg_more.py](art/bg_more.py) | Additional bg_bg models (Recraft + Ideogram) |
| [art/bg_runcomfy.py](art/bg_runcomfy.py) | RunComfy bg_bg companion (deployment broken — see §2.2) |
| [art/runcomfy_generate.py](art/runcomfy_generate.py) | RunComfy queue driver (restored from git) |
| [art/i2v_test.py](art/i2v_test.py) | Avatar I2V baseline (Wan vs Hailuo) |
| [art/petal_animate.py](art/petal_animate.py) | Petal Wan + Hailuo I2V driver |
| [art/petal_bake.py](art/petal_bake.py) | mp4 → 4×4 WebP sprite sheet |
| [art/bake_sprites.py](art/bake_sprites.py) | mp4 → 4×4 WebP sprite sheet + PixiJS preview HTML (older, hard-coded to avatar) |
| [art/upscale.py](art/upscale.py) | AuraSR 4× upscaler |
| [art/compose_atlas.py](art/compose_atlas.py) | Composes the final 14-symbol atlas |
| [art/_contact_sheet_symbol.py](art/_contact_sheet_symbol.py) | (legacy — superseded by `fal_generate.build_contact_sheet`) |

The thin-wrapper convention: per-asset scripts (`symbol_gen.py`,
`avatar_ab.py`, `bg_gen.py`, etc.) just define prompts + variants and
call into `fal_generate.gen_batch()`. Queue plumbing + resume-by-hash +
contact-sheet generation all live in `fal_generate.py`. Don't reimplement
the submit/poll/download loop in new per-asset scripts.

---

## 5. Resume-by-hash sidecar

`gen_one` writes a `<path>.prompt.sha` next to every saved image
containing `sha256(request body)`. On rerun, it skips only when the hash
matches; if the prompt changed (or the .sha is missing), it regenerates.

This replaced a file-size-based check that silently shipped stale gens
on the morning of 2026-06-26 (the first h2 mask re-run kept the previous
day's portrait files because they were >50 KB). If you ever want to
force a regen, delete the `.sha` file (the `.png` will be overwritten on
the next gen).

The same hash is computed per-thread-deterministic now —
`hashlib.md5(sym_key)[:4]` for seed_base, not Python's `hash()` (which
is salted per-process and was breaking resume across reruns).

---

## 6. Credentials / accounts

**fal.ai** — active, paid, working. Env var `FAL_KEY` in
`"id:secret"` format.

**RunComfy** — account has credits but the `ayakashi-fx`
deployment `8ef39157-1983-46a9-b750-017363846751` was deleted
server-side. To revive, create a new deployment from the RunComfy
dashboard, update `RUNCOMFY_DEPLOYMENT_ID` env, and re-test via
[art/bg_runcomfy.py](art/bg_runcomfy.py). Skip unless you specifically
want a third-model comparison again.

**Cost so far this session** — rough estimate: ~$10-15 in fal.ai gens
across the symbol atlas, avatar regen, backgrounds, petals (still +
animation). Each component documented in commit messages once we commit.

---

## 7. What to do next

Pick one. They're roughly independent.

### Option A — Wire what we have into the game (cheapest, biggest visible win)

This is the "do you actually see the new atlas on the reel" step. Nothing
new gets generated.

1. Convert the 14 atlas tiles in
   `art/generated/symbols-2026-06-26/_atlas/*.png` to WebP.
2. Drop into `web-sdk/apps/lines/static/assets/symbols/` (replace the
   existing ones).
3. Pick ONE of the 3 bg_bg finalists from
   `art/generated/bg-2026-06-26/_picked/bg_bg_*.png` and drop it as
   `web-sdk/apps/lines/static/assets/scene/bg_bg.webp` (or whatever the
   current name is — check what's there).
4. Take the 5 picked petal sprite sheets from
   `art/generated/petals-anim-v2-2026-06-27/_picked/petal_*.webp` and
   drop them into the particle / FX asset path (depends on how the
   existing petals are wired in `fxManager.ts`).
5. Run the game, screenshot, confirm.

Result: you see the new symbols, new background, new petal motion in
the actual game. **This is the load-bearing demo.**

### Option B — Avatar animation pass

Same pipeline as the petals but on the locked avatar still
(`art/generated/avatar-2026-06-26/_picked/avatar.png`).

Use [art/i2v_test.py](art/i2v_test.py) as the template — it already has a
working Wan + Hailuo pattern for the avatar with the V4b idle prompt.
Update the source path to point at `avatar-2026-06-26/_picked/avatar.png`,
duplicate the script for 4-5 reaction states (idle, win, big-win,
FS-entry, loading-splash). ~$2 total.

### Option C — UI chrome (A3 in the IMPROVEMENT_PLAN)

`reel_frame`, `frame_bg1`, `Frame_FSCounter2` need to be regenerated to
match the new mask/atlas aesthetic. Follow the symbol_gen.py pattern.
~$0.30, ~30 min.

### Option D — Particle pack + logo + fonts (A5 + A6)

Round out Track A. Ember, smoke, ink-splat textures via symbol_gen.py
clone. Logo via Ideogram. Bitmap fonts via existing build-fonts.py.

---

## 8. Open decisions to make

In order of how soon they bite:

1. **Which bg_bg of the 3 finalists ships?** Cosmetic, can defer until
   wiring time. The FLUX is most cinematic; Seedream most stylised;
   Recraft softest.
2. **Do we generate the broader particle pack (A5) or rely on procedural
   particles for FX moments other than petals?** Cost low ($0.30), but
   it's another curation pass.
3. **Avatar animation: idle only, or full reaction set?** Idle is the
   minimum. Reactions are ~$0.40 each.
4. **RunComfy: revive (new deployment + 5-7 min cold start every session)
   or accept the fal.ai-only mix as final?** I'd accept fal.ai-only.

---

## 9. Pointers

- Project status log: [ROADMAP.md](ROADMAP.md) — see ROUND 7
  (2026-06-26) for the full session log.
- Plan tracking: [IMPROVEMENT_PLAN.md](IMPROVEMENT_PLAN.md) — A1 is now
  `[~]` in progress.
- Live shipping game assets: `web-sdk/apps/lines/static/assets/` —
  these are what gets replaced during wiring.
- Memory pointers: [`memory/MEMORY.md`](memory/MEMORY.md) indexes all
  saved session-level notes. Relevant ones for this work:
  [bg-removal-manual](memory/bg-removal-manual.md),
  [noobai-prompting](memory/noobai-prompting.md),
  [asset-pipeline](memory/asset-pipeline.md).
