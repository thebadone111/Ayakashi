"""Extra fal.ai models for bg_bg comparison — Ideogram v3 + Recraft v3.

Reuses bg_gen.py's bg_bg prompt assembly so the additional candidates slot
into the existing 2026-06-26 directory as D_ and E_ subfolders and appear
on the next contact-sheet rebuild.

Output: art/generated/bg-2026-06-26/bg_bg/{D_ideogram-v3, E_recraft-v3}/

Usage:
  $env:FAL_KEY = "id:secret"
  python art/bg_more.py
"""
import os, sys
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
from fal_generate import gen_batch, build_contact_sheet
from bg_gen import LAYERS, PROSE_PREFIX

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, "art", "generated", "bg-2026-06-26", "bg_bg")

layer = LAYERS["bg_bg"]

# Recraft v3 has a 1000-character prompt cap, so we use a compact version
# that hits the same beats as bg_gen.py's bg_bg without the full neg block.
RECRAFT_PROMPT = (
    "painterly dark-fantasy anime nightscape, Edo-period rural Japanese "
    "yokai folklore, moonlit night, ethereal cyan foxfire and faint sakura "
    "pink accents over deep indigo and ink-black, cel-shaded with bold ink "
    "contours, a luminous full silver moon upper-right with a cyan foxfire "
    "halo, distant misty mountain ridges silhouetted, a single weathered "
    "wooden torii gate silhouetted in the mid-distance, a single bare dark "
    "cherry tree branch with pink sakura blossoms reaching in from the "
    "upper-left corner as natural framing, drifting pink petals, low silver "
    "mist in the lower third, soft cyan foxfire bokeh particles, wide "
    "cinematic landscape composition, rule of thirds, atmospheric depth, "
    "no characters, no people, no daylight, no vermillion, no purple, "
    "no photorealism, no 3d render"
)
assert len(RECRAFT_PROMPT) < 1000, f"Recraft prompt too long: {len(RECRAFT_PROMPT)}"

VARIANTS = [
    {
        "name": "E_recraft-v3",
        "model": "fal-ai/recraft/v3/text-to-image",
        "body_base": {
            "prompt": RECRAFT_PROMPT,
            "image_size": "landscape_16_9",
            "style": "digital_illustration",
        },
    },
]


if __name__ == "__main__":
    gen_batch(VARIANTS, OUT, gens_per_variant=3, parallel=3,
              seed_base=26060, file_prefix="bg_bg")
    build_contact_sheet(OUT)
