# Ayakashi — Wan 2.2 I2V Animation Prompts

Local Wan 2.2 I2V on RunPod ComfyUI. Prompts are animation notes, not prose.

---

## Workflow Parameters

| Setting | Value | Notes |
|---|---|---|
| `length` | **97** | Odd · ~4s @ 24fps · 8s ping-pong loop |
| `fps` (all VHS nodes) | **16** | Set on all three VHS_VideoCombine nodes (Pass_1, Pass_2, Render) — Wan 2.2 native training rate |
| `steps` INTConstant | **30** | No LightX2V · full sampling |
| `split_step` INTConstant | **11** | HighNoise 0→11 · LowNoise 11→30 |
| `resolution` | **730px longest side** | LayerUtility scale node |
| Passes | **2** | Pass 3 bypassed |
| LoRAs | **All bypassed** | LightX2V + SVI both off |

Ping-pong: `(97 × 2) - 2 = 192 frames = 8.0s @ 24fps`

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
```
