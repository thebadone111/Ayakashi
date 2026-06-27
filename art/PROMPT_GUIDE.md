# Ayakashi — Prompt Guide

How the locked style guide turns into actual model inputs. Read
STYLE_GUIDE.md first.

Locked: 2026-06-15.

---

## 1. Prompt anatomy

Every prompt is built from four slots in this order:

```
[STYLE PREFIX]  +  [SUBJECT BLOCK]  +  [COMPOSITION/FRAMING]  +  [NEGATIVES]
```

- **Style prefix** — never changes within a game. Locks the world.
- **Subject block** — the only slot that varies per asset.
- **Composition/framing** — varies per asset *category* (symbol, BG, UI,
  particle, flipbook frame). Reused within a category.
- **Negatives** — mostly fixed, with category-specific additions.

If two assets in the same batch read inconsistently, the diff is almost always
in the subject block. The other three slots are templates.

### Cuttable vs key-art prompt variants (added 2026-06-15)

A single prompt cannot do both jobs. Discovered in the 5-model avatar A/B:
painterly/gouache/atmospheric-depth language bakes the background INTO the
figure on anime models, breaking cuttability for in-game use. Every asset
that has both an in-game and a marketing use needs two variants:

| Variant | Use | Composition slot | Style words |
|---------|-----|------------------|-------------|
| **CUTTABLE** | side-panel avatar, symbols, UI elements — anything cut out for runtime use | `isolated subject, simple dark indigo backdrop, subject lit by moonlight, background falling into shadow` | cinematic terms target the SUBJECT only |
| **KEY-ART** | loading splash, cover art, intro cinematic — ships with its full painterly env | full env description (cherry grove, moon, torii, mountain ridge, drifting petals around her) | full painterly / gouache / atmospheric-depth vocabulary |

Same SUBJECT BLOCK in both. Only the composition slot and style words
differ. NoobAI in particular needs the cuttable variant or it will draw
the painted background straight through the character silhouette.

---

## 2. Style prefix — natural-language form (FLUX 1.1 Pro Ultra, Seedream v4)

```
painterly dark-fantasy anime, Edo-period rural Japanese yokai folklore,
a moonlit world of kitsune spirits beneath drifting cherry blossoms,
ethereal cyan foxfire and faint sakura pink accents over deep indigo and
ink-black, hand-drawn cel-shaded line art with bold black sumi-e contours
```

Updated 2026-06-26 — see STYLE_GUIDE.md §1 for what changed and why.

## 3. Style prefix — tag form (SDXL anime — kept for future-project reference; NoobAI dropped from Ayakashi)

NoobAI is no longer in the Ayakashi rotation (memory/noobai-prompting.md
explains why). If reviving for a different project, the tag-form prefix is:

```
masterpiece, best quality, newest, absurdres, highres, safe, very aesthetic,
official_art, key_visual, painterly_anime, japanese_fantasy, edo_period,
yokai, night, moonlit, kitsune, nine_tailed_fox, foxfire, blue_fire,
cherry_blossoms, sakura, falling_petals,
dark_theme, blue_theme, cyan_glow, pink_accent, indigo_background,
ink_black, high_contrast, cel_shading, clean_line_art, hand_drawn
```

Quality tags (`masterpiece, best quality, newest, absurdres, highres, safe,
very aesthetic`) at the start are required for NoobAI to hit its good
distribution. `very aesthetic` NOT `very aware`/`very awa` — those are
typos that contributed token noise in the original code.

---

## 4. Per-category templates

### 4a. Symbol (160×160 final, generate at 1024×1024)

```
[STYLE PREFIX]
+ [SUBJECT BLOCK — e.g. "an ornate katana blade lying diagonally, ink-wash
  brushwork on the blade reflection, gold tsuba"]
+ centered composition, three-quarter view (characters) OR front-facing
  (objects), full body, isolated subject, transparent dark background,
  10% padding, soft halo space around the figure, character symbol
+ Negatives: text, watermark, blurry, low quality, deformed hands, extra
  fingers, photorealistic, 3d render, plastic, red lacquer, vermillion,
  purple, generic anime, simple background — for character symbols add:
  multiple people, crowd, weapons not in brief
```

### 4b. Background layer (1920×1080)

Backgrounds are the ONLY category where ink-wash brush texture goes in the
prompt.

```
[STYLE PREFIX] + ink-wash brush texture, sumi-e painted background
+ [SUBJECT BLOCK — e.g. "distant misty mountain ridge under a full moon,
  a single weathered torii silhouetted on the horizon, scattered cherry
  branches in the upper foreground"]
+ wide cinematic composition, rule of thirds, atmospheric depth, soft
  bokeh, no characters, no central subject, no text
+ Negatives: text, watermark, blurry, low quality, photorealistic,
  3d render, characters, people, red lacquer, vermillion temple,
  bright daylight, sunlight, summer, lush green, fluorescent
```

### 4c. UI frame / chrome

```
[STYLE PREFIX]
+ [SUBJECT BLOCK — e.g. "ornate lacquered black-and-gold rectangular frame
  with yokai motif corners, transparent interior window, hanging foxfire
  lanterns at the top corners"]
+ centered, symmetric, isometric flat-front view, clean transparent center,
  decorative element, game UI panel, no characters, no text inside
+ Negatives: text, kanji, letters, numbers, watermark, blurry, photorealistic,
  3d render, red lacquer, vermillion, purple, characters
```

### 4d. Particle / FX texture (small, alpha)

Particles need a *black* background, not transparent — we knock out the black
in post (rembg or simple luminance keying).

```
[STYLE PREFIX shortened to: "anime fx asset, demon slayer style"]
+ [SUBJECT BLOCK — e.g. "a single foxfire flame wisp, cyan-blue gradient
  from white-hot core to translucent edge, hand-drawn flame language"]
+ centered isolated element, pure black background, soft glow halo, no
  characters, no text, single element
+ Negatives: text, watermark, photorealistic, 3d render, multiple elements,
  background detail, characters, frame, border
```

### 4e. Flipbook frame sheet (sakuga sprite sheets)

A flipbook is generated as a *single image of N frames in a row* on black,
then PIL-sliced. Example for an 8-frame foxfire burst:

```
[STYLE PREFIX shortened to: "anime fx animation frames, demon slayer style"]
+ [SUBJECT BLOCK — e.g. "a foxfire flame burst animation, 8 sequential
  frames from small spark to full bloom to dissipation"]
+ 8 frames in a single horizontal row, evenly spaced, each frame on pure
  black square, identical composition per frame, sprite sheet layout,
  hand-drawn sakuga animation frames, no in-betweens missing
+ Negatives: text, frame numbers, watermark, irregular spacing, varying
  frame size, drift between frames, photorealistic, 3d render
```

Realistic caveat: FLUX/SDXL can usually do 4-8 coherent frames in a row before
breaking down. For 12+ frames we either generate two sheets and concatenate,
or accept that we'll hand-curate (regenerate failed frames as img2img off
neighbors).

### 4g. Low symbol — washi + font-comp kanji (l1-l5)

Lows are deliberately quiet so the high yokai pop. Each is a single
classical-element kanji (火 / 水 / 木 / 金 / 土) brushed in seal-gold over
the same aged-washi paper backdrop. All five share an identical paper
background and identical glyph render — only the kanji itself changes.
This is what gives lows their family resemblance.

**Pipeline (reversed 2026-06-26 — font-comp is now PRIMARY, not fallback):**

1. **Generate ONE washi paper background** via FLUX or Seedream. Square
   1024×1024. Aged ivory mulberry-bark washi, torn rough edges, subtle
   sakura petal embossing in the paper grain, NO text, NO kanji, NO
   glyphs of any kind, moonlit dark indigo backdrop around the paper.
   Run 3–6 candidates and pick the best paper.
2. **Render each kanji over the picked washi via Pillow** using the
   Yuji Syuku font (`art/fonts/YujiSyuku-Regular.ttf`) at large size,
   centered, filled in seal-gold (`#C7902B`). Apply a ~60% opacity
   multiply blend against the underlying paper grain so the gold reads
   as ink absorbed into the paper, not a PNG sticker overlaid on a JPG.
3. Done. Five low symbols from one gen + one ~50-line composite script.
   Total cost: ~$0.18 + zero AI cost on the glyphs themselves.

**Why this flipped from "fallback" to primary:**

- Kanji are typeface data, not images. A CJK-complete font is a
  designer's correctness-guaranteed solution to "draw this glyph
  exactly." Diffusion models hallucinate ~50% of kanji even when the
  character is named in the prompt.
- Uniformity is the WHOLE POINT of the lows family. Mechanical
  font-render guarantees the brushwork weight, position, and styling
  are identical across all five. Five separate AI gens would give five
  slightly-different brushwork interpretations — exactly the opposite
  of what the design calls for.
- Yuji Syuku is already in `art/fonts/` (downloaded for the bitmap-
  font and UI work). Zero new dependencies.

**Glyph variants** — the five classical-element kanji (locked 2026-06-15):

| Symbol | Kanji | Element | Visual notes |
|--------|-------|---------|--------------|
| l1 | 火 | fire   | upward strike + two flanking sweeps |
| l2 | 水 | water  | central vertical + flowing diagonals |
| l3 | 木 | wood   | tree silhouette |
| l4 | 金 | metal  | pyramidal top + grid base |
| l5 | 土 | earth  | bold cross |

### 4f. Avatar (~800×1067, generate at 832×1216)

```
[STYLE PREFIX]
+ [SUBJECT BLOCK — e.g. "a beautiful kitsune yokai woman, long silver-white
  hair, fox ears, nine ethereal blue flame tails arcing behind her, dark
  indigo kimono with sakura embroidery, slight three-quarter pose facing
  left, calm confident expression"]
+ full body, standing pose, three-quarter view facing left toward the
  viewer's left, transparent or pure black background, slight wind in
  hair and tails, NOT centered (composed for right-side panel placement)
+ Negatives: text, watermark, blurry, low quality, deformed hands, extra
  fingers, photorealistic, 3d render, plastic, red lacquer, vermillion,
  multiple people, sexualised, swimsuit, lingerie, modern clothing,
  generic anime girl
```

---

## 5. Universal negatives (always include)

```
text, watermark, signature, logo, blurry, low quality, jpeg artifacts,
deformed, mutated, extra limbs, photorealistic, 3d render, plastic, cgi,
red lacquer, vermillion, generic dark fantasy, western fantasy
```

Append category-specific negatives from sections 4a-4f on top of this base.

---

## 6. Model-specific tweaks

The locked 2026-06-26 stack runs **two** models in parallel for every
asset (3 candidates × 2 models = 6 options). NoobAI XL was dropped from
the Ayakashi rotation — see `memory/noobai-prompting.md` for the prompting
recipe (still useful for projects that want the booru-anime graphic-poster
register that we specifically don't). See `art/PIPELINE.md` for the
workflow and `art/symbol_gen.py` / `art/avatar_ab.py` for the canonical
drivers.

### FLUX 1.1 Pro Ultra — `fal-ai/flux-pro/v1.1-ultra`
- Uses natural-language prefix (section 2).
- $0.06 per image, up to 4 megapixels (2K resolution).
- **Best cuttability AND most restrained.** Crispest subject/background
  separation, and pulls toward the museum-artifact register that the mask
  redesign needs (h4 ko-omote especially).
- Wins canonical Japanese specs (hannya, kitsune-men, ko-omote) but tends
  to fall back to "horns + fierce eyes" training prior when the spec is
  less canonical (h3 daitengu kept getting horns instead of the long
  nose; h5 nekomata came out as a literal cat head).
- Leans slightly photoreal-anime; counteract with `hand-drawn cel-shaded
  line art, visible black ink contours` in the prefix.
- `aspect_ratio: "9:16"` (portrait) or `"1:1"` (square symbols),
  `safety_tolerance: "5"`, `output_format: "png"`.

### Seedream v4 full — `fal-ai/bytedance/seedream/v4/text-to-image`
- Uses natural-language prefix (section 2).
- $0.03 per image, 1024×1024 for symbols, 1536×2688 portrait for avatars.
- **Most prompt-literal.** When the spec says "long protruding nose, NOT
  horns" or "ember slit eyes with no white sclera" Seedream actually
  listens. Wins on unusual specs.
- Best palette/foxfire integration — picks up "cyan foxfire glow" cues
  and bakes them into the gen as halos, glowing eyes, edge rim light.
  Pairs visually with the locked Ayakashi accent palette.
- Trade-off: negatives stick less strongly than on FLUX. Cherry petals
  and ground-scenery details creep back in even when explicitly negated.

### Workflow: which model wins which role

Picked per asset based on the contact sheet. Empirical pattern from the
2026-06-26 cast: **FLUX wins on minimalism/restraint** (h4 ko-omote, any
asset where the museum-artifact framing matters most). **Seedream wins
on palette integration and unusual specs** (h1 ao-oni cyan slits, h3
long-nose tengu, h5 bake-neko ember slits).

| Role | Likely winner | Why |
|------|---------------|-----|
| Cuttable avatar | **Seedream v4** | Picked for 2026-06-26 V4b — most dynamic pose, palette-perfect, easier-to-cut backdrop |
| High mask symbols (yokai) | **Seedream wins 4/5** | Listens on hollow eyes + non-canonical specs; FLUX won h4 for restraint |
| Background layers (no character) | TBD (untested 2026-06-26) | Both should work; Seedream cheaper |
| Logo / UI text | Ideogram v3 (separate model) | Strongest typography model; reserved for this role |

Consistency across the cast comes from the STYLE PREFIX (section 2) and
the locked motif hierarchy (STYLE_GUIDE.md §2), not from forcing one
model on every asset.

### Models intentionally NOT in the rotation

- **NoobAI XL 1.1** — tested 2026-06-26, dropped (graphic-poster register,
  not painterly). Full prompting reference preserved in
  `memory/noobai-prompting.md` for future projects.
- **Illustrious XL** — tested 2026-06-15; Seedream v4 was stronger.
- **Ideogram v3** — reserved for typography/logo work; not used for
  characters or environments.
- **Recraft v3** — not tested; reserved for illustrative-poster work.
- **FLUX dev (1.0)** — superseded by FLUX 1.1 Pro Ultra.

---

## 7. Practical: how a single asset prompt is assembled

Example — high symbol h2 (Kitsune), targeting Illustrious XL:

```
masterpiece, best quality, very aesthetic, newest, key visual,
demon slayer style, ufotable, painterly anime, japanese fantasy,
night, moonlit, kitsune, nine_tailed_fox, foxfire, blue_fire,
cherry_blossoms, sakura, falling_petals, cyan_glow, pink_accent,
indigo_background, ink_black, high_contrast, cel_shading,
clean_line_art, hand_drawn, anime_screenshot,

a regal nine-tailed kitsune yokai, white-silver fox spirit, all nine tails
fanned in a wide arc behind her, each tail wreathed in ethereal blue foxfire
flames, glowing cyan eyes, ornate gold seal markings on her forehead,
seated in a calm three-quarter pose,

centered composition, three-quarter view, full body, isolated subject,
transparent dark background, 10% padding, soft halo space, character symbol

Negative prompt:
text, watermark, signature, logo, blurry, low quality, jpeg artifacts,
deformed, mutated, extra limbs, extra fingers, photorealistic, 3d render,
plastic, cgi, red lacquer, vermillion, generic dark fantasy, western fantasy,
multiple people, simple background, white background, sexualised, modern
clothing
```

---

## 8. Look-test — DONE 2026-06-15

The model look-test ran on the V4b avatar prompt as a 5-way A/B (Illustrious
XL, NoobAI XL, Ideogram v3, FLUX 1.1 Pro Ultra, Seedream v4 full) plus a
Wan 2.2 vs Hailuo 02 I2V baseline on the picked still. Total spend $0.87.

Outcome (full record in `memory/image-model-upgrade.md`):
- **Stills**: 3-model gen mix — NoobAI XL / FLUX 1.1 Pro Ultra / Seedream v4
- **Animation**: Wan 2.2 a14b primary, Hailuo 02 fallback
- **Workflow**: 4-step pipeline in `art/PIPELINE.md` — 9 candidates per
  asset, pick, optional refine, optional animate.

Driver: `art/avatar_ab.py` is the canonical fal.ai multi-model A/B
script — clone and adapt per asset class (the symbol look-test, the
BG look-test, etc.). Output: `art/generated/<batch>/<variant>/<variant>_NN.png`,
then a contact sheet via `art/_contact_sheet.py`.
