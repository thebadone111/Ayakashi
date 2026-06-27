# Ayakashi — Visual Style Guide

The art bible. Every asset generated for Ayakashi must read as if it came from
the same animated film. If a prompt isn't grounded here, it shouldn't ship.

Locked: 2026-06-26 (de-IP'd from the 2026-06-15 original — Demon Slayer /
ufotable named anchors removed; they triggered training-prior shortcuts
the negatives couldn't undo, and are a legal smell on a shipping product).

---

## 1. The core sentence (the locked style prefix)

> *"painterly dark-fantasy anime, Edo-period rural Japanese yokai
> folklore, a moonlit world of kitsune spirits beneath drifting cherry
> blossoms, ethereal cyan foxfire and faint sakura pink accents over
> deep indigo and ink-black, hand-drawn cel-shaded line art with bold
> black sumi-e contours"*

This sentence (or its tag-form equivalent — see PROMPT_GUIDE) goes on **every**
asset prompt. It is what kills the "inconsistent art style" reviewer callout.

**What changed from the 2026-06-15 version:** Studio-name anchors
("Demon Slayer / ufotable") removed. Replaced with abstract register
words ("painterly dark-fantasy anime", "Edo-period rural Japanese") that
give the model a direction without invoking a specific IP's training
attractor. The mechanical instructions (palette, cel-shading, sumi-e
contours) are unchanged.

---

## 2. World & motif hierarchy

**Central motif:** the kitsune (nine-tailed fox spirit). She *is* the world.
Her foxfire flames are the dominant magical light source.

**Support motif:** drifting cherry blossoms. Atmospheric, always present in
backgrounds and ambient drift, never the subject of a hero shot.

**Supporting yokai cast** (high symbols h1-h5, not motif). Locked
2026-06-26 — the high symbols are now traditional Japanese yokai
**MASKS**, not character portraits (cultural shorthand for yokai, strong
silhouette differentiation, set-cohesive at 160 px). Cast and palette:

- **h1 ao-oni** (indigo lacquered wood + cyan foxfire). The blue oni
  variant — equally canonical as the red oni in Japanese folklore.
  Frees crimson for h3 and keeps the cast inside our locked palette.
- **h2 kitsune-men** (white porcelain + red curling brushwork). The fox
  mask, globally the most recognisable yokai icon.
- **h3 daitengu** (deep crimson red lacquer + long protruding nose).
  Inherits the crimson slot now that oni is blue.
- **h4 ko-omote** (pale Noh female mask, silver-white with cool blue
  tint). Serene, closed eyes, the only mask that reads "human."
- **h5 sinister bake-neko** (charcoal-green into ink-black + ember-
  orange slit eyes). The drastic redesign — the early "kabuki cat with
  forked-tail emblem" read costume-store, replaced with a darker
  demonic cat-spirit.

Each yokai's silhouette is uniquely shaped (horns / pointed snout /
long nose / smooth oval / cat ears) and each has its own hue, so the
five never compete on the board.

Dropped from earlier drafts (2026-06-15): **tanuki** (reads too comic for the
moonlit tone — sake-jug raccoon-dog breaks atmosphere), **rokurokubi** (the
stretching-neck gimmick reads body-horror, wrong register for a regulated
product). Replaced by the cast above.

Dropped 2026-06-26: the original cast of character-portrait highs (anime
women/warriors three-quarter view). Five anime portraits in a row read
indistinguishable at 160 px and competed with the avatar. The mask format
is a slot-symbol-first design language.

**Architecture (allowed, never central):** the *occasional* weathered torii
gate silhouetted on the horizon, a distant temple roofline, hanging lanterns,
ofuda talismans on a tree trunk. Always background, never the hero.

**Banned as central:** vermillion torii gates (the slot-game cliché), shrine
interiors as the main scene, samurai castles, dojos.

---

## 3. Palette

### Primary (the two signature accent colors)
- **Foxfire blue** — `#7FD9FF` core, `#3A8BCE` mid, `#1B3B6F` shadow.
  Cyan-leaning, never teal. Glows. This is what makes the world feel magical.
- **Sakura pink** — `#FFCFE0` core, `#E388A8` mid, `#A14A6E` shadow.
  Warm pink, never lavender or magenta.

### Ground tones (the world)
- **Deep indigo** — `#1A1F3A` to `#2B3055`. Night sky, distant mountains.
- **Ink-black** — `#0B0C12` to `#161821`. Shadows, brush strokes.
- **Moonlit silver** — `#D8E3F0` to `#F4F7FC`. Backlight, moon, mist highlights.

### Per-asset accents (NOT in the style prefix — use only where specified)
- **Seal gold** — `#E8B94F` to `#C7902B`. Ofuda kanji, kanabo glints, win
  numerals, low-symbol kanji brushwork. Sparingly.
- **Daitengu crimson** — `#A22429` to `#5E1014`. The deep red lacquer of
  the h3 tengu mask and the x kanabo's studs. Reassigned from "Oni
  crimson" 2026-06-26 — oni is now ao-oni indigo.
- **Bake-neko ember** — `#D9621F` to `#8C2E0B`. Only the glowing slit
  eyes of the h5 sinister bake-neko mask. The single warm accent in
  the whole cast.
- **Foliage charcoal-green** — `#2D3A2F`. Cherry tree trunks, mountain pine
  silhouettes, h5 mask base. Never lush green — we are in autumn-into-
  winter night.

### What this palette is NOT
- No vermillion (the lacquer red of generic shrine art). Killed deliberately.
- No purple — neither lavender mist nor royal purple. It reads "western
  fantasy" and pulls us out of the world.
- No saturated teal or aqua — foxfire is *cyan*, distinct.
- No warm browns or earth tones. The world is cool. Wood is silvered by
  moonlight, not lit by a campfire.

---

## 4. Lighting

The only light sources allowed:
1. **The moon** — silver-white, soft, always present (even when off-frame).
2. **Foxfire** — cyan-blue, glowing, emitted by the kitsune and her tails;
   pools on snow / petals / water near her.
3. **Paper lanterns** — warm cream `#F6E0B4`, dim. Used very sparingly, only
   in deep background (a distant lit torii at night, a shrine path).
4. **Magical seal gold** — only on ofuda activation / kanabo strike — short
   bursts, never ambient.

The world is **night**. Even daylight assets (if any are ever needed) should
feel like dawn at 4am, not midday. There is no sun in Ayakashi.

---

## 5. Texture & line work

### Subjects (symbols, avatar, UI elements)
- **Clean cel-shaded anime line art.** Visible black ink line work, 2-3 tone
  shading, no airbrush, no photorealism.
- Line weight: bold outer contour, finer interior lines. Painterly
  dark-fantasy anime register (2026-06-26: studio-name references
  removed from style anchors — see §1 for why).
- Hair, fur, fabric: stylised flowing strands, *not* individual hair strands.

### Backgrounds (and only backgrounds)
- **Ink-wash (sumi-e) brush texture is allowed and encouraged.**
- Soft brushy mountain silhouettes, hand-painted cloud edges, visible paper
  grain in deep BG.
- Foreground BG elements (cherry branches, rocks at board edge) can mix cel
  line with brushy texture — but symbols stay clean cel.

### Hard rule
- **Ink-wash brush texture goes in BG prompts only.** Symbols and UI never
  get the ink-wash modifier; it muddies their line work.

---

## 6. Composition rules

- **High symbols (h1-h5)** — yokai theater MASKS (see §2), generated
  alone, frontal view, mask fills 65-75% of canvas, isolated against a
  solid deep indigo backdrop. Each mask is then composited onto a
  uniform washi-paper roundel with a cyan foxfire halo in code (see
  PIPELINE.md) — never bake the halo into the gen, set cohesion comes
  from the uniform composite.
- **Low symbols (l1-l5)** — single classical-element kanji (火 水 木 金 土)
  brushed in seal-gold over the same washi-paper base. Pipeline:
  Yuji Syuku font rendered via Pillow over a single generated washi
  texture; no AI on the glyphs themselves (font-comp is the primary
  path as of 2026-06-26, not a fallback).
- **Wilds / scatters / specials (w, s, m, x)** — object emblems (kitsune
  orb, temple bell, ofuda talisman, kanabo club), front-facing, centered,
  isolated against deep indigo, with a transparent or near-transparent
  centre area where procedural energy effects layer at runtime.
- **Backgrounds** (1920×1080): rule-of-thirds, moon in upper third, kitsune
  silhouette or torii in middle/distance, cherry branch framing one lower
  corner. Negative space matters — don't fill every pixel.
- **Avatar** (~800×1067): full body, three-quarter pose facing slightly toward
  the board (left). Composes against bg_fg without a hard edge.
- **UI frames**: ornate but readable, transparent interior windows, gold inlay
  on lacquered dark wood (NOT red lacquer — black or deep indigo lacquer).

---

## 7. What we never do

Hard bans. If a generation produces any of these, reject it.

- Vermillion / Chinese-red lacquer as a dominant color
- Photorealism, 3D-render look, "plastic FLUX" smoothness
- Western dark-fantasy purples or saturated magic-school glows
- Generic shrine interiors, generic dojo, generic feudal castle
- Sexualised character design (this is a regulated gambling product)
- Gore, visible blood, body horror — yokai are spooky-beautiful, not horror
- Visible text on assets unless explicitly briefed (FLUX in particular will
  hallucinate fake kanji — strip these in post or regenerate)
- Watermarks, signatures, model name leaks
- Western anatomy errors that SDXL is famous for — review hands/feet on
  every gen, reject silently broken ones

---

## 8. Reference touchstones

When in doubt, ask "what would these reference?"

- **Demon Slayer (Kimetsu no Yaiba)** — overall animation grammar, color
  saturation, lighting drama
- **ufotable** — production style, background paintings, particle work
- **Okami** — sumi-e ink-wash brush language for backgrounds
- **Mononoke (2007 anime)** — yokai design eccentricity, color block boldness
- **Nezuko / kitsune fanart of Demon Slayer's Tamayo** — character feel
- **Yuki Onna** depictions — moonlit, ethereal, blue-white palette
- **Sekiro** — *only* as a "what NOT to do" reference (too dark, too grim,
  too desaturated)

---

---

## 9. Animation philosophy — no programmer art

A style decision as load-bearing as the palette. Locked 2026-06-15 after the
first review round's "poor animations" callout.

### The thesis

Demon Slayer / ufotable animation does not use a bloom shader, an RGB-split
filter, or a zoom-blur kick. The glow is **painted into the frame**. The
impact flash is a **hand-drawn keyframe**. The camera dip is **timing**.
What we currently have — procedurally-spawned soft-glow dots over Pixi's
default rendering, with no hit-stop or weight — is the visual signature of
*programmer art*. It reads cheap no matter how clever the shader stack.

### What's banned

- **Active post-processing filter stack** — no event-triggered RGBSplit
  pulses, ZoomBlurFilter kicks, GodrayFilter sweeps, ShockwaveFilter
  displacement, ColorMatrix glitches. These are video-game language.
- **Soft-glow-dot particle vocabulary** — no procedural "sparkle dust" as a
  catch-all FX. Particles spawn with **authored textures** (ink splat, petal,
  ember, foxfire wisp) and behave like the thing they're a picture of.
- **Pure-vector Pixi Graphics for ANY visible FX** — no plain-line paylines,
  no clean-vector rays, no perfect-circle rings. Vector primitives are for
  hitboxes and layout, never for screen.
- **Universal-sparkle catch-all** — no single FX that plays for every win
  tier scaled by intensity. Each tier has its own authored cue.

### What's kept (the "this isn't effects, this is grading" exception)

- **A single static, always-on baseline color grade** at the compositor
  level: a faint AdvancedBloomFilter (high threshold, low intensity) plus
  optional film-grain overlay. Invisible if you toggle it off; what makes
  the final composite read filmic. This is grading, not effects.
- **Camera grammar** (next section) — this is not "FX," it's *direction*.

### What we lean on instead

1. **Sprite-sheet flipbooks (sakuga)** — hand-drawn frame sequences for
   every authored FX moment. Foxfire bursts, brush-stroke wipes, slash
   arcs, bell shockwaves, seal stamps, petal swirls. Generated via the
   fal.ai pipeline (`art/PIPELINE.md` — Wan 2.2 a14b prompt-driven I2V),
   sliced, packed, played through PixiJS `AnimatedSprite`.
2. **Authored-texture particles** — `ParticlePool` keeps the procedural
   *spawning* (random direction, velocity, lifetime) but each emitter is
   pinned to hand-drawn texture sprites that match the world (ink, petal,
   ember, foxfire wisp, paper shred). Procedural *system*, authored *look*.
3. **Tween-driven motion** — GSAP + the existing TweenRunner cover all
   position/scale/rotation/alpha animation. No shader-based motion.
4. **Camera grammar** — hit-stop (ticker.speed → 0.05 for ~4 frames),
   camera dip (4px on tumble impact), slow zoom (1.0 → 1.04 during
   celebration), settle-back with `backOut`. This is the "time and weight"
   layer that anime fight scenes use; pure code, zero assets.
5. **Win-presentation as three acts** — blackout + heartbeat thump →
   title slash-reveal → count-up + coin fountain. Each act with its own
   authored sheet/grade, not one continuous scaling glow.

### The acid test

Look at any single FX moment with sound off. Would it pass for a frame
of Demon Slayer? If yes, ship it. If it could only come from a slot
game, redesign it.

---

See PROMPT_GUIDE.md for how this turns into actual generator inputs.
