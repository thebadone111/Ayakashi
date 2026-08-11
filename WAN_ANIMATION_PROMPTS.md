# Ayakashi — Wan 2.2 I2V Animation Prompts

Local Wan 2.2 I2V on RunPod ComfyUI. Prompts are animation notes, not prose.

---

## Workflow Parameters

File: `C:\Users\tiger\Downloads\Wan 2.2 I2V 3 pass v5.json` (locked 2026-06-30)

| Setting | Value | Notes |
|---|---|---|
| `length` | **97** | 4k+1 valid · ~5s @ 16fps |
| `fps` — Render / Render-upscaled | **16** | Wan 2.2 native training rate |
| `fps` — Render-rife / Render-rife-upscaled | **32** | After RIFE 2× interpolation |
| `steps` INTConstant | **8** | LightX2V 4-step sampler active |
| `split_step` INTConstant | **4** | HighNoise 0→4 · LowNoise 4→10000 |
| `resolution` | **512px longest side** | LayerUtility ImageScaleByAspectRatio |
| Passes | **1** | Single WanImageToVideoSVIPro, prev_samples=none |
| SVI LoRA strength | **0.7** | HIGH + LOW both active |
| LightX2V LoRA strength | **0.7** | high_noise + low_noise both active |
| ModelSamplingSD3 shift | **8** | Both High and Low model chains |
| Upscaler | **RealESRGAN_x4plus_anime_6B.pth** | Applied to raw frames + RIFE frames |
| RIFE | **rife417.pth · 2×** | fast_mode=true · ensemble=true |

---

## System Template

State once per session. Never repeat inside prompts.

```
Static camera. Never pan. Never zoom. Never rotate.
```

---

## Animation Grammar

Each symbol prompt is a composition of these primitives.

### Motion Primitives
- **float** — slow continuous drift, up/down or side to side
- **tilt** — slight rotation then return
- **pulse** — expand/contract or brighten/dim cyclically
- **snap** — instant move to position, no ease-in
- **overshoot** — move past target, recover back
- **settle** — arrive with slight bounce then hold
- **anticipation** — small move opposite to main action before it fires
- **follow-through** — trailing element lags behind the primary mover

### FX Primitives
- **flicker** — rapid irregular brightness change
- **drift** — slow directional float (particles)
- **erupt** — sudden outward burst
- **trail** — particles follow a moving element with delay
- **orbit** — particles circle a point
- **dissipate** — particles fade while drifting
- **sweep** — light or highlight moves from one edge to another

### Timing Language
Use phases, not durations. Wan reads sequence, not seconds.

```
rise · pause · fall · pause · repeat
snap · overshoot · settle · hold
anticipation · impact · hold · settle
erupt · hold · sustain
```

### Particle Density
- **sparse** — a few
- **several** — handful
- **many** — a lot
- **dense** — overwhelming

---

## Pass Structure

Passes must be orthogonal. Each pass owns one subsystem entirely.

| Pass | Owns | Never includes |
|---|---|---|
| **Pass 1** | Primary motion. Secondary motion. Follow-through. | Glow. FX. Particles. Lighting changes. |
| **Pass 2** | Glow. Flame. Particles. Lighting. FX. | Any mask/object movement. |

---

## Animation Type Templates

### Landing
```
Pass 1: anticipation · snap in · overshoot · settle · hold
Pass 2: impact glow flash · particles burst · FX settle
```

### Win Loop
```
Pass 1: float up · pause · sink · pause · repeat · secondary lags
Pass 2: glow brightens on rise · dims on descent · FX trails behind motion
```

### Big Win
```
Pass 1: anticipation · surge forward · overshoot · hold
Pass 2: glow erupts · particles blast out · sustain
```

---

## H1 — Ao-Oni Mask
*(Indigo lacquer · horns · cyan slit eyes · cyan brow flame · fanged mouth — reference only)*

### Landing

**Pass 1 — movement:**
```
Primary:
• Mask snaps in from above.
• Overshoots downward.
• Snaps back.
• Settles.
• Hold.
```
**Pass 2 — FX:**
```
No mask movement.

Glow:
• Eye glow strobes to peak on impact.
• Hold.
• Dims to steady burn.

Flame:
• Brow flame spikes sharply upward.
• Falls back.
• Flickers unevenly.

Particles:
• Sparse cyan sparks erupt outward.
• Drift upward.
• Dissipate.
```

### Win Loop

**Pass 1 — movement:**
```
Primary:
• Mask floats upward.
• Pause.
• Sinks.
• Pause.
• Repeat.

Secondary:
• Tilts slightly left at peak.
• Returns to centre on descent.
• Follow-through lags.
```
**Pass 2 — FX:**
```
No mask movement.

Glow:
• Eye glow brightens during rise.
• Dims during descent.
• Breathe cycle.

Flame:
• Brow flame sways opposite to mask drift.
• Lags.
• Continuous flicker.

Particles:
• Sparse cyan sparks drift upward.
• Dissipate before frame edge.
```

### Big Win

**Pass 1 — movement:**
```
Primary:
• Mask surges forward.
• Overshoots.
• Pulls back slightly.
• Holds.
```
**Pass 2 — FX:**
```
No mask movement.

Glow:
• Eye glow erupts to blinding.
• Radiates outward from slits.
• Hold.

Flame:
• Brow flame erupts into tall column.
• Churns.
• Sustains.

Particles:
• Dense cyan sparks blast outward.
• Many large embers arc upward.
• Trail.
• Dissipate.
```

---

## H2 — Kitsune-men Mask
*(White porcelain · red brushwork swirls · warm gold eye slots · fox-ear shapes — reference only)*

### Landing

**Pass 1 — movement:**
```
Primary:
• Mask snaps in.
• Overshoots right.
• Settles to centre.
• Hold.
```
**Pass 2 — FX:**
```
No mask movement.

Glow:
• Eye glow pulses bright on impact.
• Fades to steady dim.

Swirls:
• Red swirls flare brighter.
• Settle back.

Particles:
• Several pink petals drift upward.
• Dissipate.
```

### Win Loop

**Pass 1 — movement:**
```
Primary:
• Mask drifts upward.
• Pause.
• Drifts downward.
• Pause.
• Repeat.

Secondary:
• Slight tilt right on rise.
• Returns on descent.
• Follow-through lags.
```
**Pass 2 — FX:**
```
No mask movement.

Glow:
• Eye glow breathes slowly.
• Brightens on rise.
• Dims on descent.

Swirls:
• Red swirl brightness pulses.
• Lags behind glow cycle.

Particles:
• Sparse pink petals drift left to right.
• Several gold sparks trail from swirl edges.
• Dissipate.
```

### Big Win

**Pass 1 — movement:**
```
Primary:
• Mask surges forward.
• Slight overshoot.
• Holds.
```
**Pass 2 — FX:**
```
No mask movement.

Glow:
• Eye glow blazes outward in two beams.
• Sweeps wide arcs.

Swirls:
• All red swirls ignite simultaneously.
• Churn across surface.

Particles:
• Dense gold and red sparks burst outward.
• Many petals spiral upward.
• Dissipate.
```

---

## H3 — Daitengu Mask
*(Crimson lacquer · long protruding nose · amber slit eyes · gold brow accent lines — reference only)*

### Landing

**Pass 1 — movement:**
```
Primary:
• Mask drops hard.
• Slight downward overshoot.
• Snaps back.
• Settles.

Secondary:
• Long nose vibrates once on impact.
• Stills.
```
**Pass 2 — FX:**
```
No mask movement.

Glow:
• Amber eye glow strobes to peak on impact.
• Holds.
• Settles to steady burn.

Accent:
• Gold brow lines flare bright.
• Light travels from centre outward along ridge.
• Fades.

Particles:
• Sparse crimson sparks fall from lower edge.
• Dissipate.
```

### Win Loop

**Pass 1 — movement:**
```
Primary:
• Mask drifts upward barely.
• Pause.
• Sinks.
• Pause.
• Repeat.

Secondary:
• Long nose leads downward drift slightly.
• Follow-through.
```
**Pass 2 — FX:**
```
No mask movement.

Glow:
• Amber eye glow pulses.
• Brightens on rise.
• Dims on descent.

Accent:
• Soft highlight sweeps left to right along brow once per cycle.

Particles:
• Sparse dark feathers drift past slowly.
• Exit frame.
```

### Big Win

**Pass 1 — movement:**
```
Primary:
• Mask surges sharply forward.
• Overshoots.
• Snaps back slightly.
• Holds.
```
**Pass 2 — FX:**
```
No mask movement.

Glow:
• Amber eye jets erupt outward.
• Sweep wide arcs.
• Hold.

Accent:
• Gold brow lines blaze white.
• Pulse rapidly.
• Cool back to gold slowly.

Particles:
• Dense dark feathers and amber embers blast outward.
• Many arc upward.
• Dissipate.
```

---

## H4 — Ko-omote Mask
*(Pale silver-white porcelain · serene face · cool blue shadows · gold hairline detail — reference only)*

### Landing

**Pass 1 — movement:**
```
Primary:
• Mask drifts in from above.
• Decelerates.
• Stops abruptly.
• Tilts one degree downward.
• Holds.

Anticipation:
• Slight upward drift before stop.
• Uncanny stillness.
```
**Pass 2 — FX:**
```
No mask movement.

Glow:
• Cold pale ripple radiates outward from centre.
• Fades.

Light:
• Blue shadows deepen briefly.
• Return to normal.

Particles:
• Wisp of translucent mist drifts upward from lower edge.
• Dissipates.
```

### Win Loop

**Pass 1 — movement:**
```
Primary:
• Mask floats upward very slowly.
• Pause.
• Descends.
• Pause.
• Repeat.

Secondary:
• Barely perceptible sway side to side.
• Lags behind vertical motion.
```
**Pass 2 — FX:**
```
No mask movement.

Glow:
• Spectral glow breathes around face.
• Brightens on rise.
• Dims on descent.

Light:
• Soft highlight sweeps left cheek to right cheek once per cycle.

Particles:
• Sparse white mist wisps drift upward.
• Dissipate slowly.
```

### Big Win

**Pass 1 — movement:**
```
Primary:
• Mask rises steadily.
• Grows slightly larger.
• Holds elevated.
```
**Pass 2 — FX:**
```
No mask movement.

Glow:
• White-blue aura erupts from edges.
• Expands outward.
• Sustains at full brightness.

Light:
• Inner glow blazes through surface.
• Dims very slowly.

Particles:
• Dense spirit-fire tendrils stream upward from edges.
• Many translucent petals spiral outward.
• Dissipate.
```

---

## H5 — Bake-neko Mask
*(Charcoal-green to ink-black lacquer · ember-orange cat slit eyes · jagged lower edge · green foxfire wisps — reference only)*

### Landing

**Pass 1 — movement:**
```
Primary:
• Mask slams in hard.
• Downward overshoot.
• Snaps back.
• Holds.

Secondary:
• Jagged lower edge vibrates on impact.
• Stills.
```
**Pass 2 — FX:**
```
No mask movement.

Glow:
• Ember slit eyes ignite to full brightness on impact.
• Contract slightly.
• Hold at intense burn.

FX:
• Green foxfire wisps snap outward from sides.
• Retract.
• Settle close to mask edges.

Particles:
• Sparse ash particles fall from lower edge.
• Dissipate.
```

### Win Loop

**Pass 1 — movement:**
```
Primary:
• Mask drifts upward.
• Pause.
• Predatory stillness.
• Sinks.
• Pause.
• Repeat.
```
**Pass 2 — FX:**
```
No mask movement.

Glow:
• Ember eyes snap bright.
• Hold.
• Smoulder low.
• Repeat.
• Offset from mask drift — eyes brighten on descent not rise.

Light:
• Faint orange light sweeps across mask surface during bright phase.

FX:
• Green foxfire wisps flicker and drift upward independently.

Particles:
• Thin smoke trail from lower edge.
• Drifts upward.
• Dissipates.
```

### Big Win

**Pass 1 — movement:**
```
Primary:
• Mask lurches forward hard.
• Overshoots.
• Pulls back.
• Holds.
```
**Pass 2 — FX:**
```
No mask movement.

Glow:
• Ember eyes flare wide in blazing orange.
• Continuously.

FX:
• Green foxfire jets erupt from both sides.
• Roar upward.
• Churn and spiral.

Particles:
• Dense dark embers and green sparks rotate around mask.
• Many arc outward.
• Dissipate.
```

---

## Element Symbols — Win Loops
*(Kanji on washi medallion · the medallion itself is the moving object)*

### 火 — Fire (l1)

**Pass 1 — movement:**
```
Primary:
• Medallion pulses outward slightly.
• Pause.
• Returns.
• Pause.
• Repeat.
```
**Pass 2 — FX:**
```
No medallion movement.

Flame:
• Fire licks upward from kanji strokes.
• Continuous flicker.
• Curling tongues.

Light:
• Warm glow radiates from kanji centre.
• Breathes with pulse cycle.

Particles:
• Several embers drift upward.
• Sparse sparks peel from flame tips.
• Dissipate.
```

### 土 — Earth (l2)

**Pass 1 — movement:**
```
Primary:
• Medallion shifts downward very slightly.
• Pause.
• Returns.
• Tremor once.
• Settle.
• Repeat.
```
**Pass 2 — FX:**
```
No medallion movement.

Light:
• Amber glow breathes slowly.
• Deepens at kanji strokes.
• Fades toward rim.

Particles:
• Sparse dust particles drift upward from lower edge.
• Settle slowly.
• Dissipate.
```

### 金 — Gold (l3)

**Pass 1 — movement:**
```
Primary:
• Medallion holds still.
• Shimmer vibration once.
• Returns to still.
• Repeat.
```
**Pass 2 — FX:**
```
No medallion movement.

Light:
• Bright glint sweeps left to right across kanji.
• Hold.
• Softer glint sweeps right to left.
• Pause.
• Repeat.

Particles:
• Several gold sparkles appear on kanji stroke edges.
• Trail briefly.
• Dissipate.
```

### 木 — Wood (l4)

**Pass 1 — movement:**
```
Primary:
• Medallion sways left.
• Pause.
• Sways right.
• Pause.
• Visible amplitude.
• Repeat.

Secondary:
• Slight tilt follows sway direction.
• Lags.
• Follow-through.
```
**Pass 2 — FX:**
```
No medallion movement.

Light:
• Green glow pulses slowly.
• Brightens at kanji centre.
• Fades outward.

Particles:
• Several small leaves drift past.
• Exit frame slowly.
• Single petal drifts downward once per cycle.
```

### 水 — Water (l5)

**Pass 1 — movement:**
```
Primary:
• Medallion drifts upward barely.
• Pause.
• Descends.
• Pause.
• Repeat.
```
**Pass 2 — FX:**
```
No medallion movement.

FX:
• Ripple waves flow across kanji surface top to bottom.
• Continuous.

Light:
• Cool blue-white glow breathes.
• Brightens on rise.
• Dims on descent.

Particles:
• Sparse droplets drift downward.
• Faint mist drifts upward from lower edge.
• Dissipates.
```

---

## Special Symbols

### W — Kitsune Spirit Orb (Wild)

**Win Loop — Pass 1:**
```
Primary:
• Orb rotates slowly clockwise.
• Continuous.

Secondary:
• Slight wobble once per cycle.
• Surface energy swirls with rotation.
```
**Win Loop — Pass 2:**
```
No orb movement.

Glow:
• Rim glow breathes.
• Brightens.
• Dims.

FX:
• Inner foxfire light churns in core.
• Shifts direction once slowly.

Particles:
• Sparse sparks peel from rim.
• Orbit briefly.
• Dissipate.
```

### S — Temple Bell (Scatter)

**Win Loop — Pass 1:**
```
Primary:
• Bell sways left.
• Pause.
• Sways right.
• Pause.
• Very slow arc.
• Repeat.

Secondary:
• Rope above sways.
• Lags behind bell.
• Follow-through.
```
**Win Loop — Pass 2:**
```
No bell movement.

Light:
• Soft highlight sweeps across bronze surface once per cycle.

FX:
• Faint resonance shimmer radiates from rim at each sway peak.
• Dissipates.

Particles:
• Sparse foxfire wisps drift upward from rim.
• Dissipate.
```

### M — Ofuda Talisman (FS Multiplier)

**Win Loop — Pass 1:**
```
Primary:
• Paper edges flutter continuously.
• Visible amplitude.

Secondary:
• Paper folds shift with flutter.
• Follow-through.
```
**Win Loop — Pass 2:**
```
No paper movement.

Glow:
• Gold kanji seal pulses.
• Brightens.
• Hold.
• Fades.
• Repeat.

Light:
• Foxfire edge glow shifts warm to cool.
• Returns slowly.

Particles:
• Fine gold particles drift from seal.
• Float upward.
• Dissipate.
```

### X — Oni Kanabo Club (Exploder)

**Win Loop — Pass 1:**
```
Primary:
• Kanabo sways left.
• Pause.
• Sways right.
• Pause.
• Heavy pendulum arc.
• Repeat.

Secondary:
• Slight rotation follows swing.
• Lags.
• Follow-through.
```
**Win Loop — Pass 2:**
```
No kanabo movement.

Glow:
• Red glow breathes along shaft.
• Deepens at sway peak.
• Dims at centre.

FX:
• Energy crackles at spike tips.
• Arcs between adjacent spikes briefly.

Particles:
• Sparse red embers drift from lowest spike.
• Trail downward.
• Dissipate.

---

---

# PROSE PROMPT SYSTEM (v2 — 2026-06-30)

> Logic-Atomization prose prompts. Single descriptive paragraph per symbol, ~70-90 words.
> Validated on H1 Ao-Oni. Use these for production runs.
> The primitive-notation system above remains for reference and multi-pass work.

**Validated 2026-06-30:** H1 (Ao-Oni) and H2 (Kitsune-men) prose prompts produced acceptable output. Use these as the quality reference when evaluating H3–L5 runs.

---

## Writing Template

Source system: see `art/wan-animations/FEIHOU_PROMPT_SYSTEM.md`

```
[1. ANCHOR] A [color/material] [subject] fills the center of the frame,
[defining features at rest — eyes, markings, edges, attached FX].

[2. CYCLIC SEQUENCE] The [primary feature] slowly [cyclic verb]
[visible consequence], then gradually [returns]. [Secondary feature]
continuously [cyclic verb] [direction/rhythm]. A faint [color] aura at
the [edges] steadily breathes outward then constricts inward. [Particles]
drift slowly [direction] and dissolve.

[3. LOOP CLOSURE] The glow returns to its resting level and the cycle
repeats seamlessly.

[4. CAMERA LOCK] Static locked camera. No camera movement.
```

### Vocabulary

**Approved cyclic verbs:**
`pulse · breathe · flicker · drift · shimmer · oscillate · sway · fade · undulate · waver · throb · twinkle · curl · lick · expand/recede · brighten/dim`

**Approved degree words (≥3 per prompt):**
`slowly · gradually · steadily · gently · rhythmically · continuously · faintly · softly · subtly · evenly`

**FORBIDDEN — vague mood:**
`elegant · vortex · atmosphere · soul · energy · picturesque · beautiful · mystical · ethereal · majestic · stunning · dramatic`

**FORBIDDEN — cause/effect:**
`because · therefore · causing · as a result · so that · which makes`

**FORBIDDEN — one-shot onset verbs (break loops):**
`erupt · burst · ignite · awaken · summon · unleash · explode · shatter · emerge · materialize`

### Loop test
Read each action: *does it return to its start?* If no — rewrite it.
Read the prompt: *any forbidden word?* If yes — delete it.

### Known model biases — anchor these explicitly

Some features have strong folklore associations in training data. If left vague, Wan fills them in autonomously — usually with fire or particle FX at the wrong place.

| Feature | Model bias | Fix |
|---|---|---|
| Tengu long nose | Generates sparks/fire at nose tip (Tengu = fire spirit in training data) | Describe as `pale lacquer nose smooth and still` in anchor |
| Any prominent appendage left undescribed | Model treats it as a particle emitter | Give it an explicit material + static state in the anchor line |
| Long-nosed mask (any) | Forward tilt — nose exits frame. "Static camera" locks the camera, not the subject | Add `The mask faces the viewer flat-on, neither tilting nor rotating.` as a standalone sentence after the anchor, before the FX sequence |

**Rule:** Any physically prominent feature that should NOT animate needs a material description + `still` in the anchor sentence. Don't leave appendages undefined.

**Rule:** "Static locked camera" constrains the camera only. To lock the subject's orientation, add an explicit flat-on constraint as a standalone sentence early in the prompt.

---

## H1 — Ao-Oni (Win Loop Prose Prompt)

```
A deep cobalt oni demon mask fills the center of the frame, painted in
glossy blue with two large symmetrical cyan eyes glowing steadily at rest
and ghostly blue flame wisps standing above the brow. The mask faces the
viewer flat-on, neither tilting nor rotating. The eyes slowly
pulse brighter, their glow gradually expanding outward across the cobalt
surface then receding back. The brow flame wisps continuously sway side
to side in a gentle rhythm. A faint cyan aura at the mask edges steadily
breathes outward then constricts inward. Tiny luminous embers drift
slowly upward and dissolve. The glow returns to its resting level and
the cycle repeats seamlessly. Static locked camera. No camera movement.
```

## H2 — Kitsune-men (Win Loop Prose Prompt)

```
A white porcelain fox-spirit mask fills the center of the frame, marked
with orange-red brush swirls, narrow gold eye slits glowing softly at
rest, and small pointed fox ears at the top. The mask faces the viewer
flat-on, neither tilting nor rotating. The eye slits slowly pulse
brighter, their warm glow gradually expanding then receding. The red
swirl markings continuously shimmer, their color wavering faintly across
the cream surface. A soft orange foxfire aura at the mask edges steadily
breathes outward then constricts inward. Sparse gold sparks drift slowly
upward and dissolve. The glow returns to its resting level and the cycle
repeats seamlessly. Static locked camera. No camera movement.
```

## H3 — Daitengu (Win Loop Prose Prompt)

> **Note 2026-07-01:** Two issues fixed — (1) leaving the nose undescribed causes sparks/fire at nose tip (Tengu fire-spirit prior); fix: `pale lacquer nose smooth and still`. (2) mask tilts forward causing nose to exit frame; "static camera" only locks the camera not the subject — fix: add flat-on orientation sentence early in prompt.

```
A dark crimson lacquer tengu mask fills the center of the frame, with
a long pale lacquer nose smooth and still, fierce amber eyes glowing
steadily at rest, and gold accent lines tracing the heavy brow ridge.
The mask faces the viewer flat-on, neither tilting nor rotating. The
amber eyes slowly pulse brighter, their glow gradually expanding
outward across the lacquer surface then receding back. The gold brow
lines continuously shimmer, a soft highlight drifting slowly from the
ridge center outward to each tip and back. A faint crimson aura at the
mask edges steadily breathes outward then constricts inward. Static
locked camera. No camera movement.
```

## H4 — Ko-omote (Win Loop Prose Prompt)

```
A pale porcelain-white young woman Noh mask fills the center of the
frame, with serene delicate features, soft cool-blue shadows, and a thin
gold hairline detail at rest. The mask faces the viewer flat-on,
neither tilting nor rotating. A spectral pale glow slowly breathes
around the face, gradually brightening then dimming back to rest. The
cool blue shadows continuously waver, deepening faintly then softening.
A faint white-blue aura at the mask edges steadily breathes outward then
constricts inward. Sparse translucent mist wisps drift slowly upward and
dissolve. The glow returns to its resting level and the cycle repeats
seamlessly. Static locked camera. No camera movement.
```

## H5 — Bake-neko (Win Loop Prose Prompt)

```
A dark charcoal cat-demon mask fills the center of the frame, with
shadowed fur texture, slitted amber-yellow eyes glowing steadily at rest,
and pale green foxfire wisps hovering at the sides. The amber eyes slowly
pulse brighter, their glow gradually expanding then receding back to a
low smoulder. The green foxfire wisps continuously flicker and sway side
to side in a gentle rhythm. A faint green aura at the mask edges steadily
breathes outward then constricts inward. Sparse green sparks drift slowly
upward and dissolve. The glow returns to its resting level and the cycle
repeats seamlessly. Static locked camera. No camera movement.
```

## L1 — Fire (Win Loop Prose Prompt)

```
A red-and-orange fire kanji medallion fills the center of the frame, its
strokes burning steadily at rest on a dark washi disc. The kanji glow
slowly pulses brighter, gradually expanding outward across the medallion
then receding. Small flame tongues lick continuously upward along the
stroke edges, flickering in a gentle rhythm. A faint warm aura at the
medallion rim steadily breathes outward then constricts inward. Sparse
orange embers drift slowly upward from the flames and dissolve. The glow
returns to its resting level and the cycle repeats seamlessly. Static
locked camera. No camera movement.
```

## L2 — Water (Win Loop Prose Prompt)

```
A blue-and-teal water kanji medallion fills the center of the frame, its
strokes glowing softly at rest on a dark washi disc. The kanji glow
slowly pulses brighter, gradually expanding outward then receding back.
A cool watery shimmer continuously undulates across the strokes, the
surface light wavering gently top to bottom. A faint blue aura at the
medallion rim steadily breathes outward then constricts inward. Sparse
droplets drift slowly downward while faint mist drifts upward and
dissolves. The glow returns to its resting level and the cycle repeats
seamlessly. Static locked camera. No camera movement.
```

## L3 — Wood (Win Loop Prose Prompt)

```
A green wood kanji medallion fills the center of the frame, its strokes
glowing softly at rest on a dark washi disc. The kanji glow slowly
pulses brighter, gradually expanding outward across the medallion then
receding. A soft green light continuously shimmers along the strokes,
wavering gently from center to rim. A faint green aura at the medallion
rim steadily breathes outward then constricts inward. Sparse small leaves
drift slowly past and dissolve, with a single petal drifting gently
downward each cycle. The glow returns to its resting level and the cycle
repeats seamlessly. Static locked camera. No camera movement.
```

## L4 — Gold (Win Loop Prose Prompt)

```
A gold metal kanji medallion fills the center of the frame, its polished
strokes gleaming steadily at rest on a dark washi disc. The kanji glow
slowly pulses brighter, gradually expanding outward then receding. A
bright metallic glint continuously shimmers, drifting slowly along the
strokes from one edge to the other and back. A faint golden aura at the
medallion rim steadily breathes outward then constricts inward. Sparse
gold sparkles twinkle along the stroke edges and dissolve. The glow
returns to its resting level and the cycle repeats seamlessly. Static
locked camera. No camera movement.
```

## L5 — Earth (Win Loop Prose Prompt)

```
A brown-and-amber earth kanji medallion fills the center of the frame,
its strokes glowing warmly at rest on a dark washi disc. The kanji glow
slowly pulses brighter, gradually expanding outward then receding back.
A soft amber light continuously shimmers across the strokes, deepening
faintly then softening in a gentle rhythm. A faint amber aura at the
medallion rim steadily breathes outward then constricts inward. Sparse
dust motes drift slowly upward from the lower edge and dissolve. The
glow returns to its resting level and the cycle repeats seamlessly.
Static locked camera. No camera movement.
```

## W — Kitsune Spirit Orb (Win Loop Prose Prompt)

> Added 2026-07-03. Input still: `art/generated/symbols-2026-06-26/_atlas/w.png`

```
A luminous cyan spirit orb fills the center of the frame, a glassy sphere
of pale blue foxfire with a bright white core glowing steadily at rest.
The orb holds its position, neither drifting nor rotating out of frame.
The inner foxfire light slowly churns in a gentle circular rhythm, its
glow gradually brightening then dimming back. Thin flame tendrils at the
orb surface continuously curl and waver softly. A faint cyan aura at the
rim steadily breathes outward then constricts inward. Sparse blue sparks
drift slowly upward from the rim and dissolve. The glow returns to its
resting level and the cycle repeats seamlessly. Static locked camera. No
camera movement.
```

## S — Temple Bell (Win Loop Prose Prompt)

> Added 2026-07-03. Input still: `art/generated/symbols-2026-06-26/_atlas/s.png`

```
An aged bronze temple bell fills the center of the frame, its engraved
surface and dark rope hanging still at rest. The bell faces the viewer
flat-on, neither tilting nor rotating. The bell gently sways side to side
in a slow narrow arc, gradually returning to center each time, the rope
above swaying softly with a slight lag. A warm highlight continuously
drifts slowly across the bronze surface from one edge to the other and
back. A faint gold aura at the bell rim steadily breathes outward then
constricts inward. Sparse pale foxfire wisps drift slowly upward from the
rim and dissolve. The motion returns to rest and the cycle repeats
seamlessly. Static locked camera. No camera movement.
```

## M — Ofuda Talisman (Win Loop Prose Prompt)

> Added 2026-07-03. Input still: `art/generated/symbols-2026-06-26/_atlas/x.png` (M uses the x.png frame)

```
A white paper ofuda talisman fills the center of the frame, a vertical
rectangular charm with a gold kanji seal glowing softly at rest. The
talisman faces the viewer flat-on, neither tilting nor rotating. The
paper edges continuously flutter in a gentle rhythm, the lower corners
wavering softly then settling back. The gold seal slowly pulses brighter,
its glow gradually expanding across the paper then receding. A faint warm
aura at the talisman edges steadily breathes outward then constricts
inward. Fine gold particles drift slowly upward from the seal and
dissolve. The glow returns to its resting level and the cycle repeats
seamlessly. Static locked camera. No camera movement.
```

## X — Oni Kanabo (Win Loop Prose Prompt)

> Added 2026-07-03. Input still: `art/generated/symbols-2026-06-26/_atlas/x2.png`

```
A heavy black iron kanabo war club fills the center of the frame, a
studded shaft with dark metal spikes smooth and still at rest, wrapped
in a red cord grip. The club faces the viewer flat-on, neither tilting
nor rotating. The club gently sways side to side in a slow heavy
pendulum rhythm, gradually returning to center each time. A deep red
glow along the shaft slowly pulses brighter, gradually expanding then
receding back. Faint sparks continuously twinkle at the spike tips in
an uneven rhythm. A faint crimson aura at the club edges steadily
breathes outward then constricts inward. Sparse red embers drift slowly
downward from the lowest spike and dissolve. The glow returns to its
resting level and the cycle repeats seamlessly. Static locked camera.
No camera movement.
```
