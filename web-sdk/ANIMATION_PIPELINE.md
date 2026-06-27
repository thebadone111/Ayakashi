# Ayakashi — Animation Pipeline

Two tiers depending on animation complexity. Rule of thumb: if a character appears in it, use Tier 1. If it's ambient FX, particles, or petals, use Tier 2.

---

## Tier 1 — Character & complex animations (RunComfy + Wan SVI Pro)

Used for: avatar idle, reelstop, tumble, wildland, smash, bonus, fsintro, bigwin — any animation where a character or elaborate scene needs to hold identity across multiple seconds.

**Current model stack (Ayakashi v1):**
- Wan 2.2 I2V A14B (HighNoise + LowNoise UNet pair)
- Stable Video Infinity 2.0 LoRA — extends temporal coherence across sequential passes
- LightX2V 4-step LoRA — speeds each pass (~163s per pass, ~14min total)
- 5 passes × 2 KSamplerAdvanced nodes per pass = ~32min full run
- **Cost: ~$1.33/run** (A6000 @ $2.50/hr × 32min)

**Output:** 5 per-pass MP4 previews + 1 final stitched render.

**Scaling costs:** 8 avatar clips (one run each) = ~$10.70. Raw GPU rental on RunPod/vast.ai (A6000 ~$0.60/hr) is ~4× cheaper — worth setting up for next game.

**Next game: RunPod.** Self-hosted ComfyUI on a rented A6000 (~$0.60/hr). Same hardware, same workflow, ~4× lower cost per run. Setup is a one-time effort.

---

### Planned workflow upgrade (next game / next character)

Polish and quality is the priority — longer render times are acceptable. Two workflow variants:

**Dev workflow** (fast iteration, same as current):
- 3 passes (down from 5 — sufficient for short looping clips)
- LightX2V 4-step LoRA kept in
- ~18–20min per run

**Final/hero workflow** (maximum quality, for approved animations):
- 3 passes, LightX2V removed — full 20-step sampling per pass
- Real-ESRGAN anime upscale applied per-frame after VAEDecode (before VHS_VideoCombine)
- RIFE frame interpolation on the final stitched render (24fps → 60fps)
- Higher input resolution (1080p instead of 720p)
- Estimated ~45–60min per run on A6000 @ $0.60/hr = ~$0.45–0.60/run on RunPod

**Nodes to add to the ComfyUI workflow:**
- `UpscaleModelLoader` + `ImageUpscaleWithModel` with `4x-AnimeSharp` or `RealESRGAN_x4plus_anime_6B` — after each VAEDecode
- `VHS_RIFE_VFI` — after final VHS_VideoCombine stitch
- Increase resolution in `LayerUtility: ImageScaleByAspectRatio V2` (#398) from 720p → 1080p

---

### Further innovations under consideration

**IPAdapter identity lock** — feed the avatar still as an IPAdapter conditioning image alongside the text prompt on every pass. The model is explicitly shown what the character looks like rather than inferring from text. Biggest win for cross-clip consistency (all 8 clips look like the same character, not just similar). Under evaluation.

**ADetailer face pass** — after VAEDecode, detect the face region and re-run sampling specifically on that crop at higher steps. The rest of the frame stays as-is; the face gets sharpened. Significant quality improvement for close-up character shots.

**Temporal video super-resolution** — instead of per-frame ESRGAN, use a video-aware SR model that uses inter-frame information to upscale more accurately. Produces sharper results on motion edges where per-frame upscalers can flicker.

---

### Future ideas (not planned, revisit later)

**Optical flow from reference performance** — record a reference video of slow deliberate movement (kabuki/Noh-style), extract optical flow, use as ControlNet motion guidance. The AI generates the character but performs the exact motion you directed. Complete directorial control over character performance combined with AI visual generation. Technology exists in ComfyUI today — worth exploring when the pipeline is more mature.

---

## Web technology — planned improvements

The game runs in a browser on WebGL (PixiJS). The following are real capabilities available now that would meaningfully raise the quality ceiling.

### Active plan

**Interactive GLSL foxfire shader** — replace the current procedural foxfire (sin-wave oscillators in BackgroundAmbient) with a real fluid simulation running on the GPU as a custom GLSL shader via PixiJS's filter system. Mouse position is passed as a `vec2` uniform every frame — when the player moves the cursor near the avatar, the foxfire ripples and displaces away from it. Fast mouse movement creates a vortex; stillness lets it return to idle drift. This is Navier-Stokes fluid simulation in WebGL — organic, physical, impossible to replicate with pre-rendered assets because it responds to the player in real time. Not a filter on top of content — a simulation of a phenomenon. One custom shader, lives as its own PixiJS Filter class.

**Rapier physics for win celebrations** — Rapier is a Rust physics engine compiled to WASM, runs at near-native speed in the browser. Replaces the particle emitter for coin win FX with physically simulated coins that bounce off each other, off the reel frame, roll to rest. Feels tactile and real in a way particle systems cannot. Players interact with a system that has weight.

**GSAP for UI transitions** — GreenSock replaces CSS transitions on all Svelte UI components (paytable, modals, bottom bar, bet controls). Wired programmatically in component lifecycle hooks — no manual markup or configuration required. Gives access to cinema-quality easing curves, timeline sequencing, and stagger effects on lists of elements. The paytable opening, the rules panel sliding in, the bet increment feel like a premium native app.

### Visual philosophy note

Pre-rendered I2V animations are preferred over real-time computed visuals (bloom, godrays, chromatic aberration, post-processing filter stacks). These have a digital "computed" look that conflicts with the painterly aesthetic the I2V pipeline produces. The exception is physics simulations and fluid dynamics — these simulate real phenomena and look organic, not algorithmic.

### Very far future

**Spine 2D for the avatar** — the professional standard for character animation in AAA mobile games. An animator rigs the character with bones, IK joints, and cloth physics. The kimono flows naturally, hair has spring dynamics, the character can be re-posed infinitely without regenerating anything. Would completely replace the AI video pipeline for the avatar. Requires a dedicated character animator and a Spine license — not a near-term investment, but the correct long-term direction for a character this central to the game.

---

### Step-by-step: how to run a generation

#### 1. Enable the instance manually (CRITICAL — do this first)

Go to the RunComfy dashboard and enable/start the deployment:

```
Deployment ID: 274fbd0c-e4fc-4097-848d-24552911e37b
Name: ayakashi-wan-idle
```

Wait until the instance shows **Standby** status. Do NOT submit the job until the instance is on standby. If you submit while the instance is cold, the instance boots during inference, ComfyUI locks immediately, and the avatar image upload window is missed.

#### 2. Upload your source image to the instance while it's on standby

While the instance is idle (standby), upload the reference image via the proxy endpoint so it's already on disk when the workflow runs:

```
POST https://api.runcomfy.net/prod/v2/deployments/{dep_id}/instances/{instance_id}/proxy/upload/image
Authorization: Bearer e71e19b6-0ded-435a-8caf-948090ca77d1
Content-Type: multipart/form-data

Fields:
  image       = <file bytes>   filename: avatar.webp
  overwrite   = true
  type        = input
  subfolder   = (empty)
```

The instance_id is visible in the RunComfy dashboard when the instance is live.

#### 3. Run the generation script

```bash
# From repo root, with Python venv active
python -u art/wan_svi_idle_avatar.py
```

The `-u` flag forces unbuffered output so you see progress live. The script:
- Submits the job with all 5 pass prompts overridden (nodes 366–370)
- Polls status every 4s
- Monitors the ComfyUI log for `4/4 [` completion markers (2 per pass)
- Downloads each pass MP4 as it finishes via `/proxy/history` + `/proxy/view`
- Prints `>>> PASS 4 DONE. Cancel now...` so you can Ctrl+C before the final render if needed

**Outputs land in:** `art/generated/avatar-wan-svi-idle-avatar-2026-06-27/`

---

### RunComfy API reference

All requests: `Authorization: Bearer e71e19b6-0ded-435a-8caf-948090ca77d1`

| Action | Method | URL |
|---|---|---|
| Submit job | POST | `https://api.runcomfy.net/prod/v2/deployments/{dep_id}/inference` |
| Poll status | GET | `{status_url}` (returned in submit response) |
| Cancel job | POST | `{cancel_url}` (returned in submit response) |
| Upload image | POST | `.../instances/{instance_id}/proxy/upload/image` |
| ComfyUI history | GET | `.../instances/{instance_id}/proxy/history` |
| Download output | GET | `.../instances/{instance_id}/proxy/view?filename=X&type=output&subfolder=` |
| Final result | GET | `.../requests/{req_id}/result` |

**Submit body structure:**
```json
{
  "overrides": {
    "97":  { "inputs": { "image": "avatar.webp" } },
    "366": { "inputs": { "prompt": "..." } },
    "367": { "inputs": { "prompt": "..." } },
    "368": { "inputs": { "prompt": "..." } },
    "369": { "inputs": { "prompt": "..." } },
    "370": { "inputs": { "prompt": "..." } }
  }
}
```

Node 97 = LoadImage (the reference image). Nodes 366–370 = CR Prompt Text nodes, one per SVI pass, routed via Set/Get variables to CLIPTextEncode nodes 93/152/284/297/310. All 5 must be overridden — only overriding 366 leaves passes 2–5 on the workflow's default prompt.

**Log URL pattern (for monitoring ComfyUI progress):**
```
https://cdn.runcomfy.com/logs/{instance_id}/comfyui.txt
```

---

### Workflow prompt structure

Prompts work best with a beat-by-beat structure describing motion in sequential named beats. The model reads these as choreography cues. Keep the subject description identical across all 5 pass prompts — only vary the action verbs or camera cues between passes if you want narrative progression. For a looping idle, use the same prompt for all 5.

Example structure:
```
Subject: [physical description of character, costume, distinctive features]
Beat 1 — [name]: [what happens]
Beat 2 — [name]: [what happens]
...
Camera: [camera instruction — "completely locked static portrait frame" for idles]
Style: [style cues]
```

---

## Tier 2 — Simple FX & particle animations (fal.ai sprite sheets)

Used for: petals, embers, foxfire wisps, ambient particle effects — anything that loops as a PixiJS `AnimatedSprite` particle.

**Pipeline:**
1. Generate stills: `art/symbol_gen.py` / `art/bg_gen.py` (FLUX 1.1 Pro Ultra + Seedream v4)
2. Max cuts backgrounds manually (rembg/BiRefNet unreliable on translucent FX)
3. Animate: `art/petal_animate.py` as canonical template — Wan 2.2 ($0.40/5s) OR Hailuo 02 ($0.27/6s)
   - Pick Wan when motion realism matters
   - Pick Hailuo when file size matters (sheets routinely 2–4× smaller at similar quality)
4. Bake: `art/petal_bake.py` — mp4 → 16 evenly-spaced frames → 4×4 WebP sprite sheet (~30–110 KB)
5. Wire into PixiJS `AnimatedSprite`. Ping-pong loop for idles: `[...frames, ...frames.slice(1,-1).reverse()]`

---

## Still image generation (fal.ai)

For symbols, avatar stills, and backgrounds:

| Model | Use case | Endpoint |
|---|---|---|
| FLUX 1.1 Pro Ultra | Restraint, cuttability, minimalism | `fal-ai/flux-pro/v1.1-ultra` |
| Seedream v4 | Prompt-literal, palette/foxfire, unusual specs | `fal-ai/bytedance/seedream/v4/text-to-image` |
| Recraft v3 | Painterly backgrounds (1000-char prompt cap) | `fal-ai/recraft/v3/text-to-image` |

Run 2 models × 3 candidates = 6 options per asset. Build contact sheet, pick 1, refine or re-roll.

**AuraSR 4x upscale:** `fal-ai/aura-sr` (~$0.05) — use after picking, before background removal.

---

## Code quality & polish — known issues

Findings from a full web-sdk review. Sorted by impact.

### Bugs / will break in production

| Issue | File | Fix |
|---|---|---|
| Overlay resize not handled — WinCelebration, BonusTriggerAnimation, FreeSpinsScreen capture canvas size at construction, never update. Rotating device mid-session breaks big-win and bonus screens. | `fxManager.ts` | Add `resize(w,h)` to each overlay class matching BackgroundAmbient's pattern. Wire into fxManager resize handler. |
| FS counter X position has no bounds clamp — renders off-screen on narrow portrait mobile. | `FreeSpinCounter.svelte` L28–39 | Clamp X to `canvasWidth - panelWidth * 0.5 - 10`. |
| Symbol win 1200ms timeout swallows stuck states silently — stuck symbols won't surface in logs. | `Board.svelte` L43 | Add `console.warn` on timeout fire with reel/row context. |

### Incomplete / placeholder work

| Item | Status |
|---|---|
| Audio — all sounds are mining-game placeholders | Hard blocker before submission |
| Bitmap fonts — mining placeholders in use | Hard blocker |
| Storybook test data — still uses mining game books | Replace from Ayakashi books |
| TypeScript compilation — never verified against registry per HANDOFF.md | Run `pnpm --filter lines check` |

### Polish gaps worth doing

| Opportunity | Impact | Notes |
|---|---|---|
| No retrigger animation — FS retrigger counter just updates silently | High | Minimum: brief pulse/flash on the FS counter. Players expect a moment here. |
| Anticipation intensity is flat — 2 scatters triggers same visual as 4 scatters | High | Should escalate. Meaningful feel difference, easy to implement in `reelSpinFx.ts`. |
| Ofuda charm doesn't scale with multiplier magnitude — 2x and 5x feel identical | Medium | Scale particle count or duration with multiplier value. |
| MAX win tier has no distinct climax — just more particles vs EPIC | Medium | Top tier should feel momentous. Distinct sfx stinger or screen-filling explosion moment. |
| PressToContinue sprite is fixed 800×134, not responsive | Low | Scale to `mainLayout.width * 0.6` capped at 800. |

---

## Full animation target list

All animations needed to reach studio-level quality. Priority 1 = game feels incomplete without it. Priority 2 = clearly elevates above average. Priority 3 = separates good from exceptional.

### Avatar (character reactions)

| Animation | Priority | Notes |
|---|---|---|
| `idle` | 1 | Loop. In progress. |
| `idle_freespin` | 1 | Separate loop for FS mode — different mood/energy |
| `anticipation` | 1 | 2 scatters visible, avatar leans in, tension |
| `reelstop` | 1 | Planned |
| `tumble` | 1 | Planned |
| `wildland` | 1 | Planned |
| `smash` | 1 | Planned |
| `bonus` | 1 | Planned |
| `fsintro` | 1 | Planned |
| `bigwin` | 1 | Planned |
| `megawin` | 2 | Distinct from bigwin, reserved for 50x+ |
| `lose` | 2 | Subtle composed acknowledgment, not sad |
| `bet_up` | 3 | Player raises bet, avatar reacts — approving/interested |
| `intro` | 2 | First load — avatar materialises from foxfire mist |

### Symbols

| Animation | Priority | Notes |
|---|---|---|
| `sym_land` (×5) | 1 | Per high symbol: settling thud, dust mote, settle. 5 variations. |
| `sym_win` (×5) | 1 | Per high symbol: winning line glow. Each mask has its own character — ao-oni flares indigo, kitsune flares white-gold, etc. |
| `sym_idle` | 2 | Very subtle ambient breathing loop at rest. Foxfire pulsing slowly. Makes the board feel alive between spins. |
| `wild_land` | 1 | More dramatic than regular sym_land |
| `scatter_1/2/3` | 1 | Accumulating anticipation — each scatter landing more intense than the last |

### Reel & board FX

| Animation | Priority | Notes |
|---|---|---|
| `spin_start` | 2 | Reels launch with motion blur / speed trail |
| `reel_stop_impact` | 1 | Each reel thumping into place, subtle per-column camera nudge |
| `anticipation_hold` | 1 | 2 scatters showing, final reel slows dramatically |
| `cascade_fall` | 1 | Symbols drop after win, new ones fall in |
| `winline_reveal` | 1 | Payline traces across winners with light pulse |
| `multiplier_pop` | 2 | Multiplier badge appears, scales up with weight |

### Full-screen moments

| Animation | Priority | Notes |
|---|---|---|
| `bigwin_screen` | 1 | Avatar + particles + counter, full canvas |
| `megawin_screen` | 1 | Bigger, different particle set |
| `bonus_trigger_cinematic` | 1 | Short cut-scene: avatar gestures, foxfire blooms, title card. The moment players remember and screenshot. |
| `freespin_end_tally` | 2 | Coins/energy counting up, avatar watching satisfied |

### Background / scene FX

| Animation | Priority | Notes |
|---|---|---|
| `bg_idle` | 1 | Done (BackgroundAmbient) |
| `bg_freespin` | 1 | Done (setMood) |
| `bg_bigwin` | 1 | Full dramatic palette shift |
| `foxfire_surge` | 2 | Ambient foxfire intensifies at scatter lands, bonus triggers |
| `screen_vignette_pulse` | 2 | Edge darkness breathes inward on anticipation / near-miss |

### Loading & intro

| Animation | Priority | Notes |
|---|---|---|
| `loading_screen` | 1 | Animated, on-brand — not just a spinner |
| `game_intro` | 2 | Avatar reveals from foxfire mist, reels materialise, first spin ready |
| `logo_reveal` | 2 | Game logo animation on load |

### UI micro-animations

| Animation | Priority | Notes |
|---|---|---|
| `balance_tick` | 1 | Win lands, balance counts up with particle burst |
| `coin_burst` | 2 | Small wins spawn coin/foxfire particles from win area |
| `bet_change` | 3 | Bet amount updates with quick pulse |
| `info_panel` | 3 | Paytable/rules slides in elegantly |

---

## Still image generation — symbols & avatar

### Models

Two models run in parallel for every asset. Generate 3 candidates each = 6 options total per symbol. Build a contact sheet, pick 1, then refine or re-roll.

| Model | Endpoint | Wins on |
|---|---|---|
| FLUX 1.1 Pro Ultra | `fal-ai/flux-pro/v1.1-ultra` | Restraint, clean cuttability, museum-artifact register |
| Seedream v4 | `fal-ai/bytedance/seedream/v4/text-to-image` | Prompt-literal, palette accuracy, foxfire integration |
| Recraft v3 (optional) | `fal-ai/recraft/v3/text-to-image` | Painterly bg register — **1000-char prompt cap** |

~$0.27 per asset (2 models × 3 candidates). Upscale the winner with AuraSR 4x (`fal-ai/aura-sr`, ~$0.05) before background removal.

### Scripts

```
art/fal_generate.py    — shared queue/poll/download helpers + resume-by-hash logic
art/symbol_gen.py      — high symbol (mask) driver
art/avatar_ab.py       — cuttable avatar driver  
art/bg_gen.py          — background layer driver
art/bg_more.py         — bg variants with Recraft v3
art/upscale.py         — AuraSR 4x upscale
```

Run any driver with:
```bash
$env:FAL_KEY = "5682095b-d1df-4149-a96e-eca959dd9207:..."
python art/symbol_gen.py h2     # single symbol
python art/symbol_gen.py all    # all symbols
```

Resume is automatic — each saved image gets a `<file>.prompt.sha` sidecar. If the prompt hasn't changed, the file is skipped. Delete the `.sha` to force a regen.

### Style system

All symbols share a locked style prefix:

```
"painterly dark-fantasy anime emblem, Edo-period rural Japanese yokai folklore,
moonlit night palette, ethereal cyan foxfire and faint sakura pink accents over
deep indigo and ink-black, hand-drawn cel-shaded line art with bold black sumi-e contours"
```

Then a composition block (frontal view, isolated subject, ~65–75% canvas fill, solid indigo backdrop), then the per-symbol subject description. Negative prompt explicitly excludes bodies, persons, scenery, text, and photorealism.

### High symbols (h1–h5) — Yokai masks

All highs are Japanese theater masks presented straight-on in flat frontal view, isolated. The mask IS the symbol — no body behind it.

| Symbol | Subject | Key palette |
|---|---|---|
| h1 | Ao-oni mask | Deep indigo lacquer + cyan foxfire |
| h2 | Kitsune-men fox mask | White porcelain + red brushwork |
| h3 | Daitengu mask | Deep crimson lacquer + long nose |
| h4 | Ko-omote Noh female mask | Pale silver-white + cool blue tint |
| h5 | Bake-neko cat-spirit mask | Charcoal-green/ink-black + ember-orange eyes |

### Low symbols (l1–l5) — Kanji on washi

Lows are NOT AI-generated. They are: Yuji Syuku font kanji composited over a single AI-generated washi paper background. Hallucination-free, visually uniform, cheaper. The kanji-on-washi approach replaced five separate AI gens after the AI consistently hallucinated or mis-rendered Japanese characters.

### Background removal

Max cuts backgrounds manually. Do not chain `rembg` / BiRefNet onto gens automatically — the binary segmenter cuts foxfire tails and translucent glows as "background". Deliver clean-cuttable source images (solid uniform backdrop, clear subject edge) and let Max cut.

---

## File locations

| Thing | Path |
|---|---|
| SVI Pro generation script | `art/wan_svi_idle_avatar.py` |
| Sprite sheet animator | `art/petal_animate.py` (template) |
| Sprite sheet baker | `art/petal_bake.py` (template) |
| Seedance experiment script | `art/seedance_idle_experiment.py` |
| Generated character anims | `art/generated/avatar-wan-svi-idle-avatar-2026-06-27/` |
| Generated FX sheets | `art/generated/` |
| Avatar source | `web-sdk/apps/lines/static/assets/sprites/avatar/avatar.webp` |
| RunComfy workflow JSON | Downloaded from RunComfy dashboard |
