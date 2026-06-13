"""Convert the cloud-FLUX white-on-black brush stroke into an alpha sprite for
the WinCelebration title banner (P4). luminance->alpha, auto-polarity, crop.
Tinted at runtime by WinCelebration (brushTexture / 'brushWide' asset).

Run from web-sdk/apps/lines:
  ../../../math-sdk/env/Scripts/python.exe process-brush.py
"""
import os
import numpy as np
from PIL import Image

GEN = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated\fx"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "static", "assets", "sprites", "particles")

# job-dir: (filename, out-name)  — pick filled after review
PICKS = {
    "brush-wide": ("brush-wide_1076474229_1.png", "brush_wide"),
}

os.makedirs(OUT, exist_ok=True)
for job, (fn, out_name) in PICKS.items():
    path = os.path.join(GEN, job, fn)
    if not os.path.exists(path):
        print(f"SKIP {job}: {fn} missing"); continue
    im = Image.open(path).convert("RGB")
    arr = np.asarray(im).astype(np.float32)
    lum = 0.299 * arr[..., 0] + 0.587 * arr[..., 1] + 0.114 * arr[..., 2]
    corners = np.mean([lum[:20, :20].mean(), lum[:20, -20:].mean(),
                       lum[-20:, :20].mean(), lum[-20:, -20:].mean()])
    if corners > 128:
        lum = 255 - lum
    alpha = np.clip((lum - 12) / (255 - 12), 0, 1) ** 0.9 * 255
    rgba = np.zeros((*lum.shape, 4), np.uint8)
    rgba[..., 0] = rgba[..., 1] = rgba[..., 2] = 255
    rgba[..., 3] = alpha.astype(np.uint8)
    sprite = Image.fromarray(rgba)
    bbox = sprite.getbbox()
    if bbox:
        sprite = sprite.crop(bbox)
    sprite.thumbnail((1024, 1024), Image.LANCZOS)
    dest = os.path.join(OUT, f"{out_name}.webp")
    sprite.save(dest, "WEBP", quality=90, method=6)
    print(f"{job} -> {out_name}.webp  {sprite.size}  {os.path.getsize(dest)//1024}KB")
