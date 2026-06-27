"""Avatar driver — cuttable kitsune avatar across the 2-model mix
(FLUX 1.1 Pro Ultra + Seedream v4, locked 2026-06-26 after NoobAI dropped).

Thin wrapper on top of fal_generate.gen_batch — this script only defines
the prompt and the variant table; the queue/resume/contact-sheet plumbing
lives in fal_generate.py.

Composition is CUTTABLE: solid deep indigo backdrop, no painted scene
behind her. Max removes the background manually (memory/bg-removal-manual),
so the job is to deliver an easy cut, not a final composite.

Output: art/generated/avatar-2026-06-26/<variant>/<variant>_NN.png
Contact: art/generated/avatar-2026-06-26/_contact.jpg

Usage:
  $env:FAL_KEY = "id:secret"
  python art/avatar_ab.py
"""
import os
from fal_generate import gen_batch, build_contact_sheet

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_ROOT = os.path.join(REPO, "art", "generated", "avatar-2026-06-26")

# ============================================================================
# Prompt — de-IP'd style prefix + V4b subject/pose + CUTTABLE composition
# ============================================================================

PROSE_PROMPT = (
    # --- Style prefix (STYLE_GUIDE.md §1, locked 2026-06-26) ---
    "painterly dark-fantasy anime, Edo-period rural Japanese yokai "
    "folklore, moonlit night palette, ethereal cyan foxfire and faint "
    "sakura pink accents over deep indigo and ink-black, hand-drawn "
    "cel-shaded line art with bold black sumi-e contours, "

    # --- Framing ---
    "dramatic cinematic full-body portrait, the entire figure visible "
    "from head to feet, no cropping, character standing with her feet "
    "on the ground, "

    # --- Subject (V4b kitsune avatar) ---
    "a majestic nine-tailed kitsune fox spirit in the form of a "
    "graceful mature young woman, long flowing silver-white hair, "
    "white fox ears on top of her head, ethereal cyan foxfire flame "
    "tails growing from her lower back and arcing gracefully behind "
    "and around her body, each tail individually visible and anchored "
    "at the same point, calm cyan eyes, a dignified expression, smooth "
    "pale forehead, an elegant feminine figure with a defined slim "
    "waist accentuated by her obi belt, gentle hourglass silhouette, "
    "dressed in a flowing floor-length dark indigo ceremonial kimono "
    "with delicate sakura embroidery along the hem and sleeves, "
    "traditional obi belt, the kimono collar resting open at the "
    "chest revealing her collarbone, simple geta sandals visible at "
    "the bottom of the frame, "

    # --- Pose V4b ---
    "she stands in a calm relaxed pose with her right hand raised and "
    "extended toward the moon, a single small cyan foxfire spark "
    "floating just above her fingertips as if she is offering it to "
    "the night sky, her left hand resting gently at her side, her "
    "tails fanned in a gentle arc behind her, head tilted up softly "
    "toward the moon, eye-level framing, "

    # --- CUTTABLE composition (the load-bearing change) ---
    "isolated subject against a simple solid deep indigo backdrop, "
    "the painterly atmosphere is concentrated ON HER not around her, "
    "soft moonlight catching her hair and tails, the background "
    "falling clean into shadow for easy compositing, no painted scene "
    "behind her, no cherry trees, no cherry blossom petals around her, "
    "no mountains, no torii, no temple, no scenery, no ground details, "

    # --- Negatives ---
    "no text, no watermark, no signature, no cropping of legs or feet, "
    "no red lacquer, no vermillion, no purple, no lavender, no "
    "photorealism, no 3d render, no plastic look, no busy background, "
    "no painted environment, no multiple subjects"
)

# ============================================================================
# Variants — 2-model mix
# ============================================================================

VARIANTS = [
    {
        "name": "B_flux-pro-ultra",
        "model": "fal-ai/flux-pro/v1.1-ultra",
        "body_base": {
            "prompt": PROSE_PROMPT,
            "aspect_ratio": "9:16",
            "raw": False,
            "safety_tolerance": "5",
            "output_format": "png",
        },
    },
    {
        "name": "C_seedream-v4",
        "model": "fal-ai/bytedance/seedream/v4/text-to-image",
        "body_base": {
            "prompt": PROSE_PROMPT,
            "image_size": {"width": 1536, "height": 2688},
        },
    },
]


if __name__ == "__main__":
    gen_batch(VARIANTS, OUT_ROOT, gens_per_variant=3, parallel=3, seed_base=26000)
    build_contact_sheet(OUT_ROOT)
