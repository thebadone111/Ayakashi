"""Convert generated white-on-black particle art into alpha sprites.

Luminance -> alpha, autocrop, downscale, premultiplied-white RGB so
ParticlePool's runtime tint colours them per effect.

Usage (after reviewing candidates in art/generated/<job>/ and picking one):
    ../../../math-sdk/env/Scripts/python.exe process-particles.py

Edit PICKS below: job-dir -> (chosen filename, output name, max size px).
"""
import os
import numpy as np
from PIL import Image

GEN = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "static", "assets", "sprites", "particles")

# job-dir: (filename, out-name, max-px)  — filename chosen after visual review
PICKS = {
    "ink-splatter":  ("ink-splatter__00004_.png", "ink_splat", 256),  # most radial energy
    "sakura-petal":  ("sakura-petal__00001_.png", "petal", 128),
    "paper-shred":   ("paper-shred__00001_.png", "paper", 128),
    "ember-flake":   ("ember-flake__00001_.png", "ember", 128),
    "smoke-wisp":    ("smoke-wisp__00001_.png", "smoke", 192),
}

os.makedirs(OUT, exist_ok=True)
for job, (fn, out_name, max_px) in PICKS.items():
    path = os.path.join(GEN, job, fn)
    if not os.path.exists(path):
        print(f"SKIP {job}: {fn} not found")
        continue
    im = Image.open(path).convert("RGB")
    arr = np.asarray(im).astype(np.float32)
    lum = (0.299 * arr[..., 0] + 0.587 * arr[..., 1] + 0.114 * arr[..., 2])
    # auto-polarity: FLUX sometimes delivers black-on-white (ink prior is
    # strong) — sample the corners; if the background is bright, invert.
    h_, w_ = lum.shape
    corners = np.mean([lum[:20, :20].mean(), lum[:20, -20:].mean(),
                       lum[-20:, :20].mean(), lum[-20:, -20:].mean()])
    if corners > 128:
        lum = 255 - lum
    # gentle knee so faint glow survives but the black floor clips to 0
    alpha = np.clip((lum - 12) / (255 - 12), 0, 1) ** 0.9 * 255

    rgba = np.zeros((*lum.shape, 4), np.uint8)
    rgba[..., 0] = rgba[..., 1] = rgba[..., 2] = 255  # white body, tinted at runtime
    rgba[..., 3] = alpha.astype(np.uint8)
    sprite = Image.fromarray(rgba)

    bbox = sprite.getbbox()
    if bbox:
        sprite = sprite.crop(bbox)
    sprite.thumbnail((max_px, max_px), Image.LANCZOS)
    dest = os.path.join(OUT, f"{out_name}.webp")
    sprite.save(dest, "WEBP", lossless=False, quality=92)
    print(f"{job:14s} -> {out_name}.webp  {sprite.size}  {os.path.getsize(dest)//1024}KB")
