"""High-symbol mask generator — FLUX 1.1 Pro Ultra + Seedream v4.

Thin wrapper on top of fal_generate.gen_batch — this script only defines
the prompts and per-symbol subject blocks; the queue/resume/contact-sheet
plumbing lives in fal_generate.py.

High symbols (h1-h5) are traditional Japanese yokai MASKS — a mask is a
symbol by cultural definition, reads instantly at 160px, and rhymes with
the planned kanji-on-washi lows. Each mask is generated alone against a
solid deep indigo backdrop; the uniform washi-paper roundel + foxfire
halo are composited in code (post-process), not baked into the gen — set
cohesion is what makes them feel like a slot atlas instead of five
unrelated paintings.

Cast palette (locked 2026-06-26):
  h1  ao-oni        — deep indigo lacquer + cyan foxfire
  h2  kitsune-men   — white porcelain + red brushwork
  h3  daitengu      — deep crimson red lacquer + long nose
  h4  ko-omote      — pale silver-white + cool blue tint
  h5  bake-neko     — charcoal-green into ink-black + ember-orange eyes

Output: art/generated/symbols-2026-06-26/<sym>/<variant>/<sym>_<variant>_NN.png
Contact: art/generated/symbols-2026-06-26/<sym>/_contact.jpg

Usage:
  $env:FAL_KEY = "id:secret"
  python art/symbol_gen.py h2     # generate just h2
  python art/symbol_gen.py all    # generate all defined symbols
"""
import os, sys, hashlib
# Force UTF-8 stdout so Japanese / accented chars in symbol names don't
# crash the Windows console (cp1252 can't encode ō / 火 / etc.).
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
from fal_generate import gen_batch, build_contact_sheet

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_ROOT = os.path.join(REPO, "art", "generated", "symbols-2026-06-26")

# ============================================================================
# Style prefix — de-IP'd (STYLE_GUIDE.md §1, locked 2026-06-26)
# ============================================================================

PROSE_PREFIX = (
    "painterly dark-fantasy anime emblem, Edo-period rural Japanese "
    "yokai folklore, moonlit night palette, ethereal cyan foxfire and "
    "faint sakura pink accents over deep indigo and ink-black, "
    "hand-drawn cel-shaded line art with bold black sumi-e contours"
)

# ============================================================================
# Mask-focus composition (tighter than the 2026-06-15 version)
# ============================================================================

PROSE_COMPOSITION = (
    "a single hand-crafted Japanese yokai theater mask presented "
    "straight-on in flat frontal view, centered, isolated against a "
    "solid deep indigo backdrop, the mask is the only subject — no "
    "body, no person behind it, painterly anime illustration with "
    "bold black ink contours, clean cel-shaded fills with 2 to 3 "
    "tones per surface, the mask occupies roughly 65 to 75 percent "
    "of the canvas, restrained museum-artifact framing"
)

PROSE_NEG = (
    "no person, no body, no character behind the mask, no shoulders, "
    "no neck, no hair, no clothing, no hands, no fingers, "
    "no text, no watermark, no signature, no kanji, no logo, "
    "no scenery, no cherry trees, no cherry blossom petals, no torii, "
    "no temple, no mountains, no landscape, no painterly background, "
    "no purple, no lavender, no photorealism, no 3d render, no plastic, "
    "no multiple masks, no mask wall, no second subject"
)

# ============================================================================
# Per-symbol subject blocks — kept short; let the model fill the gaps
# ============================================================================

SYMBOLS = {
    "h1": {
        "name": "h1 — Ao-oni mask",
        "prose": (
            "a hand-carved Japanese ao-oni mask of deep indigo "
            "lacquered wood, weathered patina, two short curved black "
            "horns at the brow, an open mouth showing two upper fangs, "
            "eyes carved as narrow dark slits or hollow voids with no "
            "painted whites and no visible sclera, traditional Noh and "
            "kagura theater mask eye treatment, subtle cyan foxfire glow"
        ),
    },
    "h2": {
        "name": "h2 — Kitsune-men fox mask",
        "prose": (
            "a Japanese kitsune-men fox mask of pure white porcelain, "
            "long pointed fox snout, sharply pointed white fox ears at "
            "the top, narrow slit almond eye holes, classic red curling "
            "brushwork markings flowing along the snout and across each "
            "cheek, small red mark on the forehead, soft cyan moonlight "
            "along the upper edge"
        ),
    },
    "h3": {
        "name": "h3 — Daitengu mask",
        "prose": (
            "a Japanese daitengu mountain-spirit mask, deep crimson red "
            "lacquered finish, a long protruding straight nose pointing "
            "forward, fierce scowling brow, glaring narrow eyes, bold "
            "sumi-e ink contours"
        ),
    },
    "h4": {
        "name": "h4 — Ko-omote Noh female mask",
        "prose": (
            "a Japanese Noh ko-omote female mask, smooth pale "
            "porcelain white with a subtle cool blue-grey undertone, "
            "calmly closed eyes, small soft closed lips painted faint "
            "sakura pink, delicate thin arched eyebrows, serene "
            "unblemished smooth face, blank smooth forehead with no "
            "markings, no moon on the forehead, no painted symbols, "
            "no decorations on the face"
        ),
    },
    "h5": {
        "name": "h5 — Sinister bake-neko mask",
        "prose": (
            "a Japanese sinister bake-neko cat-spirit mask, deep "
            "charcoal-green lacquer fading into ink-black, two angular "
            "pointed cat ears at the top reading almost like small "
            "horns, narrow slit ember-orange glowing eyes as the only "
            "warm color in the frame, snarling open mouth baring two "
            "short pointed fangs, two stylized forked-tail curls "
            "flanking the upper corners like flame, no whiskers"
        ),
    },

    # ---- Lows (l1-l5) ----------------------------------------------------
    # Lows are NOT AI-generated — pipeline reversed 2026-06-26 (see
    # PROMPT_GUIDE.md §4g): the kanji glyphs are rendered via Yuji Syuku
    # font over a single picked washi background. Only `washi` below goes
    # through the gen path.
    "l1": {"name": "l1 — 火 fire kanji  (font-comp)",   "prose": "FONT_COMP"},
    "l2": {"name": "l2 — 水 water kanji (font-comp)",   "prose": "FONT_COMP"},
    "l3": {"name": "l3 — 木 wood kanji  (font-comp)",   "prose": "FONT_COMP"},
    "l4": {"name": "l4 — 金 metal kanji (font-comp)",   "prose": "FONT_COMP"},
    "l5": {"name": "l5 — 土 earth kanji (font-comp)",   "prose": "FONT_COMP"},

    # ---- Washi backdrop -------------------------------------------------
    # One generated washi paper background that BOTH the high-symbol roundel
    # composite AND the low-symbol kanji composite use. Pure paper, no text.
    "washi": {
        "name": "washi — aged ivory paper backdrop",
        "prose": (
            "an aged ivory mulberry-bark washi paper texture, torn rough "
            "edges on all four sides of the paper, subtle sakura petal "
            "embossing visible in the paper grain, faint warm cream-to-"
            "grey gradient across the paper surface, the paper sits on "
            "a deep indigo backdrop with a soft shadow underneath, "
            "pristine blank paper with absolutely no markings"
        ),
        "composition": (
            "the washi paper centered on the canvas, square paper "
            "filling roughly 80 percent of the frame, photographed "
            "straight-on flat lay from directly above, isolated against "
            "a solid deep indigo background, painterly anime "
            "illustration register with subtle ink contours, no text "
            "of any kind, no kanji, no glyphs, no symbols, no writing, "
            "blank pristine paper"
        ),
        "negatives": (
            "no text, no kanji, no chinese characters, no japanese "
            "characters, no glyphs, no writing, no calligraphy, no "
            "markings, no painted decorations on the paper, no people, "
            "no person, no figure, no body, no creatures, no animals, "
            "no fox, no scenery, no mountains, no temple, no torii, "
            "no painterly background scene, no second subject, no "
            "multiple papers, no stacked papers, no purple, no lavender"
        ),
    },

    # ---- Object specials (w / s / m / x) --------------------------------
    "w": {
        "name": "w — Kitsune spirit orb (wild)",
        "prose": (
            "a single ethereal kitsune spirit orb, a glowing translucent "
            "cyan foxfire sphere of soft inner light, swirling internal "
            "flame currents visible inside the orb, the orb glows "
            "brightly from within with a soft halo aura around it, "
            "faint wisps of cyan flame curling off the surface"
        ),
        "composition": (
            "a single floating spirit orb, perfectly centered, isolated "
            "against a solid deep indigo backdrop, the orb fills "
            "roughly 50 to 60 percent of the canvas, painterly anime "
            "illustration with cel-shaded inner gradient, no scenery, "
            "no fox, no person behind it, no temple, no torii, no hand "
            "holding it, just the floating glowing orb"
        ),
    },
    "s": {
        "name": "s — Temple bell / bonsho (scatter)",
        "prose": (
            "a single traditional Japanese bonshō temple bell, dark "
            "weathered bronze patina with hints of verdigris, ornate "
            "ridged ribbed exterior, the bell hanging from a thick "
            "frayed rope at the top, a small wooden striker log "
            "suspended beside it on its own cord, faint cyan foxfire "
            "rim light catching the upper curve"
        ),
        "composition": (
            "a single hanging bell centered in the frame, isolated "
            "against a solid deep indigo backdrop, the bell fills "
            "roughly 55 to 65 percent of the canvas, painterly anime "
            "illustration with bold black ink contours and clean "
            "cel-shaded fills, no temple architecture, no shrine, no "
            "monks, no people, no torii"
        ),
    },
    "m": {
        "name": "m — Ofuda talisman (FS multiplier)",
        "prose": (
            "a single traditional Japanese ofuda paper talisman strip, "
            "vertical rectangular slip of pale aged washi paper, a "
            "column of bold black sumi-e kanji brushstrokes running "
            "down the center of the strip from top to bottom, the top "
            "of the strip torn and frayed, seal-gold corner trim on "
            "the four corners, faint cyan foxfire glow around the edges"
        ),
        "composition": (
            "a single ofuda strip centered vertically, isolated against "
            "a solid deep indigo backdrop, the strip fills roughly 70 "
            "to 80 percent of the canvas height, painterly anime "
            "illustration, no person holding it, no shrine behind it, "
            "no temple, no scenery, no hands, no second strip"
        ),
    },
    "x": {
        "name": "x — Kanabo demon club (3x3 exploder)",
        "prose": (
            "a single Japanese kanabo demon club, thick ink-black iron "
            "shaft, the head end studded with rows of crimson red "
            "metal spikes, leather-wrapped grip at the bottom of the "
            "handle, weathered patina, faint cyan foxfire rim light "
            "catching the upper edge of the spiked head"
        ),
        "composition": (
            "the kanabo lying diagonally across the frame from upper-"
            "right to lower-left, isolated against a solid deep indigo "
            "backdrop, the kanabo fills roughly 75 to 85 percent of "
            "the canvas diagonal, painterly anime illustration with "
            "bold black ink contours, no hand holding it, no demon, "
            "no person, no scenery, no temple"
        ),
    },
}


def _build_variants(sym: dict):
    """Build the FLUX + Seedream variant table for a symbol.

    Defaults to the mask-focus PROSE_COMPOSITION + PROSE_NEG; per-symbol
    `composition` and `negatives` fields override those (used by the
    non-mask object specials w/s/m/x and the washi backdrop).
    """
    subject = sym["prose"]
    composition = sym.get("composition", PROSE_COMPOSITION)
    negatives = sym.get("negatives", PROSE_NEG)
    full = f"{PROSE_PREFIX}, {subject}, {composition}, {negatives}"
    return [
        {
            "name": "B_flux-pro-ultra",
            "model": "fal-ai/flux-pro/v1.1-ultra",
            "body_base": {
                "prompt": full,
                "aspect_ratio": "1:1",
                "raw": False,
                "safety_tolerance": "5",
                "output_format": "png",
            },
        },
        {
            "name": "C_seedream-v4",
            "model": "fal-ai/bytedance/seedream/v4/text-to-image",
            "body_base": {
                "prompt": full,
                "image_size": {"width": 1024, "height": 1024},
            },
        },
    ]


def gen_symbol(sym_key: str):
    sym = SYMBOLS.get(sym_key)
    if sym is None:
        print(f"ERROR: unknown symbol '{sym_key}'"); return
    if sym["prose"] == "TODO":
        print(f"SKIP {sym_key}: subject not yet defined"); return
    if sym["prose"] == "FONT_COMP":
        print(f"SKIP {sym_key}: rendered via Yuji Syuku font in the "
              f"compose step, not generated"); return

    print(f"\n=== {sym['name']} ===")
    variants = _build_variants(sym)
    sym_dir = os.path.join(OUT_ROOT, sym_key)
    # Stable per-symbol seed family so reruns reproduce — must use a
    # deterministic hash; Python's built-in hash() is salted per-process.
    seed_base = int(hashlib.md5(sym_key.encode()).hexdigest()[:4], 16)
    gen_batch(variants, sym_dir, gens_per_variant=3, parallel=3,
              seed_base=seed_base, file_prefix=sym_key)
    build_contact_sheet(sym_dir)


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "h2"
    if target == "all":
        for k in SYMBOLS:
            if SYMBOLS[k]["prose"] != "TODO":
                gen_symbol(k)
    else:
        gen_symbol(target)
