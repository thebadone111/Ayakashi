# Ayakashi — Asset Production Pipeline

Locked: 2026-06-15 after the avatar 5-model A/B and the Wan 2.2 vs
Hailuo 02 I2V baseline.

This is the canonical workflow for producing every still and animated
asset in Ayakashi. The earlier RunComfy-FLUX pipeline is replaced by
this fal.ai-first stack. See `memory/asset-pipeline.md` for the short
form and ROADMAP.md for the validation history.

---

## The four steps

```
┌──────────────────────────────────────────────────────────────────────────┐
│  1. GENERATE — 3 models × 3 candidates = 9 options                      │
│     ↓                                                                    │
│  2. PICK     — Max chooses 1 of 9                                        │
│     ↓                                                                    │
│  3. REFINE   — upscale, re-roll, or inpaint (one pass, skip if not)    │
│     ↓                                                                    │
│  4. ANIMATE  — prompt-driven I2V (Wan 2.2 primary, Hailuo 02 fallback) │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Generate — 2 models × 3 candidates

Every asset gets generated against both models below. Prose prompts in
both — same SUBJECT BLOCK across both (see PROMPT_GUIDE.md). NoobAI XL
was tested and DROPPED 2026-06-26 — its outputs leaned graphic-poster
rather than the painterly cel-shade Ayakashi locks. Full NoobAI prompting
reference preserved in `memory/noobai-prompting.md` for future projects.

| Model | fal.ai endpoint | Format | Price/img | Strengths |
|-------|-----------------|--------|-----------|-----------|
| **FLUX 1.1 Pro Ultra** | `fal-ai/flux-pro/v1.1-ultra` | prose | $0.06 | Crisp subject/bg separation, best cuttability, minimal/restrained register |
| **Seedream v4 full** | `fal-ai/bytedance/seedream/v4/text-to-image` | prose | $0.03 | Most prompt-literal; wins on unusual specs and palette/foxfire integration |

**3 candidates per model × 2 models = 6 total per asset.**
Cost: ~$0.27 per asset.

Driver: `art/fal_generate.py` is the shared queue helper
(`gen_one` / `gen_batch` / `build_contact_sheet`); per-asset scripts
(`avatar_ab.py`, `symbol_gen.py`) are thin wrappers that just define the
prompt and the variant table. Refactor landed 2026-06-26 — the previous
pattern of duplicated submit/poll/download loops per script is retired.

**Resume-by-prompt-hash:** every saved image writes a `<path>.prompt.sha`
sidecar; on rerun, gen_one skips only when the hash matches. Prompt
changes or hand-deleted sidecars force a regen. This replaces a
file-size-based check that silently shipped stale gens.

### Critical: one prompt PER ROLE not per asset

The 2026-06-15 A/B surfaced that a single prompt was doing two jobs
badly. The painterly env language baked the background INTO the figure
on anime models, breaking cuttability for in-game use. Fix:

- **CUTTABLE variant** — for any asset that needs to be cut out
  (avatar side-panel, symbols, UI elements). **Strip**
  painterly/gouache/atmospheric-depth language. **Add** isolation cues
  (`isolated against a simple dark indigo backdrop`, `subject lit by
  moonlight, background falling into shadow`). Keep cinematic terms
  targeted at the SUBJECT, not the scene.
- **KEY-ART variant** — for assets that ship with their full painterly
  background (loading splash, marketing/cover art, the in-game intro
  cinematic). Keep the full env language. Never cut.

A single character may produce both: a cuttable version for the
side-panel, a key-art version for the loading screen. They're separate
generations from the same SUBJECT block with different env/composition
slots.

---

## 2. Pick

Build a contact sheet of all 9 candidates with `art/_contact_sheet.py`.
Open in default viewer, side-by-side comparison.

One winner per asset/role. Aesthetic discussion and role assignment
happen here. If no candidate clears the bar, re-roll one model with a
tightened prompt before moving on — don't burn time generating 18
candidates hoping for a miracle.

For the avatar specifically, you may pick TWO winners — one cuttable for
in-game, one key-art for splash. They're allowed to come from different
models.

---

## 3. Refine — one pass

Choose the cheapest tool that closes the gap, then move on.

| Need | Tool | Cost | Driver |
|------|------|------|--------|
| Higher resolution | AuraSR 4x | ~$0.05 | `art/upscale.py` |
| More detail + sharpness | `fal-ai/clarity-upscaler` | $0.03/MP | (extend `upscale.py`) |
| Bad hands / face | `fal-ai/flux/dev/inpaint` | $0.03 | (TBD) |
| Wrong pose / expression | Re-roll same model, different seed | $0.03-0.06 | re-run gen driver |

Skip refinement entirely if the source is already shippable. The 4×
upscale of a 2304×1728 source is ~$0.05 of "why not"; the AuraSR pass
matters more for hero/marketing res than for in-game side-panel use.

---

## 4. Animate — prompt-driven I2V

For any asset that needs to move (avatar idle + reactions, symbol idle
breaths, scene transitions). Prompt-driven means we don't need driver
videos — the model invents motion from text instructions. That's the
property that lets us spin up many animation states cheaply.

| Model | fal.ai endpoint | Price | Use for |
|-------|-----------------|-------|---------|
| **Wan 2.2 a14b @ 720p** | `fal-ai/wan/v2.2-a14b/image-to-video` | $0.40 / 5s | **Default.** Best motion quality + identity preservation we tested. Better at multi-tail kitsune than Hailuo. |
| Hailuo 02 @ 768p | `fal-ai/minimax/hailuo-02/standard/image-to-video` | $0.27 / 6s | Cheap fallback / iteration. Hailuo had spawn-in/out artifacts on tails in our test — use with caution on complex characters. |

Driver: `art/i2v_test.py` (clone/adapt per animation state).

### Animation states per asset (typical for a character)

| State | Duration | Source still | Prompt focus |
|-------|----------|--------------|--------------|
| Idle loop | 5s | base pose | Subtle ambient — hair, tails, foxfire, petals drifting only |
| Win celebration | 5s | base pose | Smile, slight lean, foxfire pulse |
| Big win | 5s | base pose | More energetic — arm raise, tails fan out, bigger foxfire |
| Free spins entry | 5s | base pose | Dramatic, slow zoom, hand raised |
| Loading splash | 10s | key-art pose | Cinematic camera push-in, full env motion |

Each is **ONE Wan call** (~$0.40). Total per character: **~$2** for the
full reaction set. Re-roll cheaply if a state misfires.

### Prompt-engineering notes for Wan

- Be EXPLICIT about what stays still: "character holds her pose
  throughout, no walking, no head turning, no big gestures, no camera
  movement". Wan tends to over-animate by default.
- Identify the moving elements one by one: "her hair drifts in a soft
  breeze, her tails ripple slowly, the foxfire spark above her finger
  pulses gently". Otherwise the model decides for you.
- For loops, prompt "ends in the same pose as it began" — works ~70% of
  the time. The other 30%, fall back to ping-pong playback.

### Bake & ship — sprite sheets for PixiJS

```
mp4 → 16 evenly-spaced frames (ffmpeg)
    → resize to 512×910 per frame (PIL Lanczos)
    → 4×4 grid (2048×3640) sheet
    → WebP at q82  (~500 KB - 1.2 MB shippable per state)
```

PixiJS `AnimatedSprite` plays it back. Idle loops use ping-pong:
`[...frames, ...frames.slice(1, -1).reverse()]` gives a 30-frame seamless
loop from 16 unique frames.

Driver: `art/bake_sprites.py` (also generates a self-contained preview
HTML with the WebP base64-embedded — open in any browser, no server).

Target ship size: **~500 KB per state at 512×910 / q82**. Tunable down
to ~200 KB by halving per-frame res to 384×680 + q70.

---

## Cost reference (per asset, end-to-end)

| Stage | Typical cost |
|-------|--------------|
| Generate (9 candidates) | $0.30-0.50 |
| Pick (human time) | — |
| Refine (optional) | $0-0.50 |
| Animate, per state | $0.27-0.40 |
| Animate, 5-state reaction set | $1.35-2.00 |
| **Total animated character** | **~$2-3** |
| **Total still-only asset** | **~$0.40-0.80** |

Full Ayakashi asset re-spin estimate (avatar + 5 high symbols + 5 low
symbols + 4 specials + 4 BG layers + UI chrome + animations on the
avatar): **~$15-30**, days of work.

---

## What this pipeline does NOT do

- **GUI rigging** (Spine, Live2D, Rive) — replaced by Wan/Hailuo
  prompt-driven I2V. We don't need a rigger.
- **Driver-video animation** (Wan 2.2 Animate pose-driven) — possible if
  prompt-driven hits limits, but requires recording a phone video of the
  motion. Reserve for combat-style sequences if we ever need them.
- **Layered character compositing** (the "Pipeline 2" from 2026-06-15
  research — slice into 7 layers + AnimateDiff per layer + GSAP) — NOT
  validated. Reserve as fallback if whole-image I2V on a specific asset
  drifts unacceptably. Cost ~$3-4 vs Wan's $0.40, so this is a
  last-resort tool.
- **Custom ComfyUI workflows** (RunComfy serverless) — kept available
  for esoteric workflows fal.ai doesn't host (custom LoRA stacks, multi-stage
  graphs, AnimateDiff motion-brush). See `art/RUNCOMFY_OPERATIONS.md`
  for cost discipline — the "Disable" UI button does NOT stop billing.

---

## Status of legacy tooling

- `art/runcomfy_generate.py` — old RunComfy FLUX driver. Deployment
  deleted. Kept for prompt-history reference; do not extend.
- `art/seedream_iter*.py`, `art/seedream_pick.py` — earlier RunComfy
  Model API drivers (Seedream 5 Lite). Pattern superseded by
  `art/fal_generate.py`. Kept for the prompt-iteration history that
  produced V4b_01.
- `art/look_test.py`, `art/ab_test.py` — RunComfy-based. Their A/B
  pattern lives on in `art/avatar_ab.py` (fal.ai).
- `art/fal_generate.py` — canonical fal.ai queue driver. Reference for
  all new scripts.

---

## Pointers

- `art/STYLE_GUIDE.md` — what counts as on-style
- `art/PROMPT_GUIDE.md` — prompt anatomy, per-category templates,
  per-model adaptations
- `IMPROVEMENT_PLAN.md` — the asset reset track list (Track A)
- `art/RUNCOMFY_OPERATIONS.md` — for when RunComfy is still needed
- `memory/asset-pipeline.md` — short-form pointer for future sessions
- `ROADMAP.md` — completed-work log
