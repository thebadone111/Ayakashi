"""Cloud-FLUX FX assets: brush strokes (P4) + flipbook attempt (P5).

Brush strokes are reliable single images. The flipbook grid is a TEST (FLUX
grids are unreliable) — inspected before committing to P5.

Run: RUNCOMFY_API_KEY=... RUNCOMFY_DEPLOYMENT_ID=8ef39157-... python art/gen-fx-cloud.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from runcomfy_generate import generate

DEST = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated\fx"

JOBS = [
    # P4 brush strokes (white on black, become alpha masks/banners)
    dict(name="brush-wide", w=1280, h=448, steps=24,
         prompt="a single bold horizontal dry-brush calligraphy stroke sweeping left to right, "
                "rough split-bristle sumi-e ink texture, tapered ragged ends, pure thick white "
                "ink on pure solid black background, high contrast, centered, VFX mask asset, no text"),
    dict(name="brush-slash", w=1024, h=1024, steps=24,
         prompt="a single aggressive diagonal katana slash brush stroke lower-left to upper-right, "
                "sharp tapered tips, dry bristle ink texture, pure white on pure solid black "
                "background, high contrast, centered, VFX mask asset, no text"),
    # P5 flipbook attempt
    dict(name="foxfire-sheet", w=1024, h=1024, steps=28,
         prompt="a sprite sheet of exactly 8 frames in a clean 4x2 grid with thin gaps, each cell "
                "one frame of a blue-white ghostly flame igniting, flaring, then dissipating into "
                "wisps, pure black background, white-blue flame, hand-drawn anime VFX, identical "
                "framing per cell, no text"),
]

if __name__ == "__main__":
    total = 0
    for job in JOBS:
        d = os.path.join(DEST, job["name"])
        if os.path.isdir(d) and any(f.endswith(".png") for f in os.listdir(d)):
            print(f"[{job['name']}] already done - skip", flush=True); continue
        total += len(generate(job["prompt"], width=job["w"], height=job["h"], batch=2,
                              steps=job["steps"], dest=d, label=job["name"], timeout=900))
    print(f"\nFX-CLOUD DONE: {total} images", flush=True)
