"""Generate Ayakashi win/FS FX assets on RunComfy cloud FLUX.

Batch:
  1. brush_banner  — wide sumi-e brush stroke (white on black) -> win-celebration
                     banner ('brushWide'); tinted + alpha-keyed at runtime.
  2. foxfire_sheet — 3x3 grid of kitsune foxfire flame wisps (blue/white on
                     black) -> flipbook frames for FS intro + celebration extras.

Run:  RUNCOMFY_API_KEY=<key> python art/gen-winfx-cloud.py
Skip-if-done: re-running only generates assets whose output is missing (the
first call cold-starts the deployment ~5-7 min, so a re-run resumes cheaply).
"""
import glob
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from runcomfy_generate import generate  # noqa: E402

DEST = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated\fx"

JOBS = [
    {
        "label": "brush_banner",
        "width": 1280, "height": 448, "batch": 2, "steps": 30,
        "prompt": (
            "A single wide horizontal sumi-e calligraphy brush stroke painted in "
            "luminous pure white ink on a solid pure black background, one bold "
            "confident left-to-right sweep spanning the full width, broad and "
            "solid through the middle so it reads as a banner bar, organic "
            "tapered ends, rough dry-brush bristle texture and a few ink-splatter "
            "droplets along the edges, very high contrast white on black, "
            "centered, traditional Japanese ink wash painting, monochrome, no "
            "color, no text, no characters, isolated asset on pure black"
        ),
    },
    {
        "label": "foxfire_sheet",
        "width": 1024, "height": 1024, "batch": 2, "steps": 30,
        "prompt": (
            "A 3x3 grid sprite sheet of kitsune foxfire flame wisps on a solid "
            "pure black background, nine evenly spaced cells each showing a single "
            "ghostly blue-white spirit flame at a different moment of a flickering "
            "burst, glowing cyan and white fire with wispy tails, painterly anime "
            "VFX, Demon Slayer style spirit fire, high contrast glow on pure "
            "black, no color outside blue-white, no text, no characters, evenly "
            "tiled grid"
        ),
    },
]


def done(label):
    return bool(glob.glob(os.path.join(DEST, f"{label}_*.png")))


if __name__ == "__main__":
    os.makedirs(DEST, exist_ok=True)
    for job in JOBS:
        if done(job["label"]):
            print(f"[skip] {job['label']} already generated", flush=True)
            continue
        print(f"[gen] {job['label']} {job['width']}x{job['height']} x{job['batch']}", flush=True)
        generate(
            job["prompt"], job["width"], job["height"], job["batch"], job["steps"],
            dest=DEST, label=job["label"], timeout=600,
        )
    print("ALL DONE", flush=True)
