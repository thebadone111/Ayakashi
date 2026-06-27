"""Background-layer generator — FLUX 1.1 Pro Ultra + Seedream v4.

The Ayakashi scene is composited at runtime from four stacked layers:

  bg_bg      base painterly nightscape (sky, moon, distant torii, ridge)
  bg_mist    low ground fog drifting across the lower third
  bg_effect  scattered cyan foxfire bokeh, ambient magic particles
  bg_fg      cherry branch framing in from the upper corners

Output: art/generated/bg-2026-06-26/<layer>/<variant>/<layer>_<variant>_NN.png
Contact: art/generated/bg-2026-06-26/<layer>/_contact.jpg

PROMPT_GUIDE.md §4b: backgrounds are the ONE category where the ink-wash
sumi-e brush modifier is encouraged. Subject and atmosphere can both
breathe. The fg/effect/mist layers are designed to be cut/keyed at runtime
(Max manually — memory/bg-removal-manual), so they're rendered on pure
black so the eventual cut is trivial.

Usage:
  $env:FAL_KEY = "id:secret"
  python art/bg_gen.py bg_bg     # one layer
  python art/bg_gen.py all       # all four layers, sequential
"""
import os, sys, hashlib
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
from fal_generate import gen_batch, build_contact_sheet

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_ROOT = os.path.join(REPO, "art", "generated", "bg-2026-06-26")

# ============================================================================
# Style prefix — de-IP'd (STYLE_GUIDE.md §1)
# ============================================================================

PROSE_PREFIX = (
    "painterly dark-fantasy anime background layer, Edo-period rural "
    "Japanese yokai folklore, moonlit night palette, ethereal cyan "
    "foxfire and faint sakura pink accents over deep indigo and "
    "ink-black, soft sumi-e ink-wash brushwork with visible paper grain"
)

# Per-layer composition + negative blocks (backgrounds vary more than
# symbols, so each layer has its own).
LAYERS = {
    "bg_bg": {
        "name": "bg_bg — moonlit nightscape with cherry branch (v2)",
        "prose": (
            "a quiet moonlit Edo-period Japanese landscape at night, "
            "a single luminous full silver moon in the upper-right of "
            "the frame with a soft cyan foxfire halo around it, "
            "distant misty mountain ridges silhouetted along the "
            "horizon, a single weathered wooden torii gate silhouetted "
            "in the mid-distance, "
            # branch framing baked in so we don't need a separate bg_fg
            "a single bare dark cherry tree branch with delicate pink "
            "sakura blossom clusters reaching in from the upper-left "
            "corner as natural foreground framing, a few drifting pink "
            "petals across the frame, "
            "low silver mist drifting in the lower third, soft scattered "
            "cyan foxfire bokeh particles floating in the night air, "
            "deep indigo sky fading into ink-black at the top, "
            "atmospheric depth, no characters, no people, no central "
            "subject"
        ),
        "composition": (
            "wide cinematic landscape composition, rule of thirds, moon "
            "upper-right, cherry branch frames upper-left, torii "
            "silhouette in middle distance, mist in lower third, deep "
            "negative space in the centre, soft bokeh, painterly "
            "gouache illustration, ink-wash brush texture in the sky "
            "and mountains, the cherry branch reads as a hand-drawn "
            "foreground element"
        ),
        "negatives": (
            "no text, no kanji, no watermark, no signature, no characters, "
            "no people, no figures, no central subject, no vermillion, no "
            "red lacquer, no purple, no lavender, no daylight, no sunlight, "
            "no bright daylight, no lush green, no summer, no fluorescent, "
            "no photorealism, no 3d render, no plastic look, no shrine "
            "interior, no temple architecture close up"
        ),
        "aspect": "16:9",
        "size": {"width": 1920, "height": 1080},
    },

    "bg_fg": {
        "name": "bg_fg — cherry branch framing (alpha layer)",
        "prose": (
            "a single bare dark cherry tree branch with sparse delicate "
            "pink sakura blossom clusters, the branch reaches in from "
            "the upper-right corner of the frame across to the upper-"
            "left, occupying only the top quarter of the frame, leaves "
            "and blossoms detailed in painterly cel-shaded ink-line "
            "work, a few cherry petals drifting downward, dark "
            "silhouetted branch wood with small pink blossoms"
        ),
        "composition": (
            "the cherry branch frames only the top edge of the frame, "
            "the centre and bottom of the frame are pure black empty "
            "space ready to be alpha-keyed at composite time, "
            "wide 16 by 9 landscape canvas, painterly anime illustration"
        ),
        "negatives": (
            "no text, no kanji, no watermark, no characters, no people, "
            "no mountains, no buildings, no torii, no moon, no sky, no "
            "scenery behind the branch, no painted background, no full "
            "tree trunk, no second branch, no busy composition, no "
            "vermillion, no purple"
        ),
        "aspect": "16:9",
        "size": {"width": 1920, "height": 1080},
    },

    "bg_effect": {
        "name": "bg_effect — foxfire bokeh particles (additive layer)",
        "prose": (
            "scattered ethereal cyan foxfire bokeh particles drifting "
            "through the night air, soft round glowing cyan dots of "
            "varying sizes from small bright sparks to large soft "
            "halos, magical ambient atmosphere, particles distributed "
            "loosely across the entire frame, brightest dots in the "
            "middle distance fading toward the edges"
        ),
        "composition": (
            "pure black background, only the glowing cyan particles "
            "visible, ready to be additive-blended over the base scene "
            "at runtime, wide 16 by 9 landscape canvas, painterly "
            "soft-glow illustration, no scenery, no characters"
        ),
        "negatives": (
            "no text, no characters, no people, no scenery, no mountains, "
            "no torii, no moon, no branches, no leaves, no solid shapes, "
            "no creatures, no person, no figure, no second color besides "
            "cyan, no warm tones, no orange, no red"
        ),
        "aspect": "16:9",
        "size": {"width": 1920, "height": 1080},
    },

    # ---- Sakura petal stills (square 1024) — fed to Wan I2V for animation -----
    # Three distinct designs so the game can spawn random variation. Each is
    # one cleanly-shaped petal on pure black so the alpha cut is trivial. The
    # Wan I2V pass adds the rotation/drift motion; engine just translates
    # downward, no procedural rotation needed.
    "petal_v1": {
        "name": "petal_v1 — single sakura petal, broad symmetric",
        "prose": (
            "a single isolated sakura cherry blossom petal, broad "
            "symmetric heart-pinch shape with a small notch at the wider "
            "end, soft pink colour with a slightly darker pink centre "
            "vein and a paler pink edge, hand-painted cel-shaded "
            "anime illustration, subtle ink contour outline, three-"
            "quarter view tilted slightly"
        ),
        "composition": (
            "the petal centered in the frame, pure black background, "
            "petal fills roughly 60 percent of the canvas, no other "
            "objects, no text, no scenery, no multiple petals, single "
            "isolated subject ready for alpha cut and Wan I2V animation"
        ),
        "negatives": (
            "no text, no kanji, no watermark, no signature, no person, "
            "no character, no flower, no branch, no scenery, no second "
            "petal, no multiple petals, no purple, no red, no white "
            "background, no painted background"
        ),
        "aspect": "1:1",
        "size": {"width": 1024, "height": 1024},
    },

    "petal_v2": {
        "name": "petal_v2 — single sakura petal, slender curled",
        "prose": (
            "a single isolated sakura cherry blossom petal, slender "
            "curled shape suggesting it is mid-fall and twisting, one "
            "edge slightly curling toward the viewer, soft pink colour "
            "with a paler pink edge gradient, hand-painted cel-shaded "
            "anime illustration, subtle ink contour outline, perspective "
            "view from the side"
        ),
        "composition": (
            "the petal centered in the frame, pure black background, "
            "petal fills roughly 55 percent of the canvas, no other "
            "objects, no text, no scenery, single isolated subject "
            "ready for alpha cut and Wan I2V animation"
        ),
        "negatives": (
            "no text, no kanji, no watermark, no signature, no person, "
            "no character, no flower, no branch, no scenery, no second "
            "petal, no multiple petals, no purple, no red, no white "
            "background, no painted background"
        ),
        "aspect": "1:1",
        "size": {"width": 1024, "height": 1024},
    },

    "petal_v3": {
        "name": "petal_v3 — single sakura petal, flat top-down",
        "prose": (
            "a single isolated sakura cherry blossom petal, flat top-"
            "down view showing the full petal shape clearly, broad "
            "ovate body with a soft notch at the tip, soft pink colour "
            "with a tiny darker pink dot near the base, hand-painted "
            "cel-shaded anime illustration, subtle ink contour outline"
        ),
        "composition": (
            "the petal centered in the frame, pure black background, "
            "petal fills roughly 60 percent of the canvas, no other "
            "objects, no text, no scenery, single isolated subject "
            "ready for alpha cut and Wan I2V animation"
        ),
        "negatives": (
            "no text, no kanji, no watermark, no signature, no person, "
            "no character, no flower, no branch, no scenery, no second "
            "petal, no multiple petals, no purple, no red, no white "
            "background, no painted background"
        ),
        "aspect": "1:1",
        "size": {"width": 1024, "height": 1024},
    },

    "bg_mist": {
        "name": "bg_mist — low ground fog (screen-blend layer)",
        "prose": (
            "low translucent silver-white ground mist fog drifting "
            "horizontally across the lower third of the frame, soft "
            "wispy translucent fog rendered in sumi-e ink-wash "
            "brushwork, painterly soft-edge fog, the mist sits low "
            "near the ground with empty space above it"
        ),
        "composition": (
            "pure black background, only the silver mist visible, ready "
            "to be screen-blended over the base scene at runtime, wide "
            "16 by 9 landscape canvas, mist fills the lower third and "
            "fades into nothing above"
        ),
        "negatives": (
            "no text, no characters, no people, no scenery, no mountains, "
            "no torii, no moon, no branches, no solid shapes, no "
            "creatures, no second color besides silver and white, no "
            "warm tones, no orange, no red, no cyan glow"
        ),
        "aspect": "16:9",
        "size": {"width": 1920, "height": 1080},
    },
}


def _build_variants(layer: dict):
    full = (
        f"{PROSE_PREFIX}, {layer['prose']}, {layer['composition']}, "
        f"{layer['negatives']}"
    )
    return [
        {
            "name": "B_flux-pro-ultra",
            "model": "fal-ai/flux-pro/v1.1-ultra",
            "body_base": {
                "prompt": full,
                "aspect_ratio": layer["aspect"],
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
                "image_size": layer["size"],
            },
        },
    ]


def gen_layer(layer_key: str):
    layer = LAYERS.get(layer_key)
    if layer is None:
        print(f"ERROR: unknown layer '{layer_key}'"); return
    print(f"\n=== {layer['name']} ===")
    variants = _build_variants(layer)
    layer_dir = os.path.join(OUT_ROOT, layer_key)
    seed_base = int(hashlib.md5(layer_key.encode()).hexdigest()[:4], 16)
    gen_batch(variants, layer_dir, gens_per_variant=3, parallel=3,
              seed_base=seed_base, file_prefix=layer_key)
    build_contact_sheet(layer_dir)


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "bg_bg"
    if target == "all":
        for k in LAYERS:
            gen_layer(k)
    else:
        gen_layer(target)
