"""Process the RunComfy betting-UI plates (U1) into game-ready alpha webps.

The medallion and button plate have intentional BLACK interiors, so a simple
"not-black" key would punch holes in them — use rembg (whole-silhouette salient
mask) instead, then crop to the object bbox and save webp into the bespoke UI
sprite folder. Keys consumed by the UI: bet (medallion), base_button, base_ticker.

Run: ../../../math-sdk/env/Scripts/python.exe process-ui.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter
from rembg import remove

HERE = os.path.dirname(os.path.abspath(__file__))
GEN = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated\ui"
OUTDIR = os.path.join(HERE, "static", "assets", "sprites", "uiSlotsAssetsBespoke")

PICKS = [
    # (src png, out name, pad fraction of bbox to keep a little breathing room)
    (os.path.join(GEN, "spin-medallion", "spin-medallion_1094946248_1.png"), "spin_medallion.webp", 0.02),
    (os.path.join(GEN, "btn-plate", "btn-plate_1095377539_1.png"), "base_button.webp", 0.02),
    (os.path.join(GEN, "ticker", "ticker_1095427453_1.png"), "base_ticker.webp", 0.0),
]


def process(src, out, pad):
    im = Image.open(src).convert("RGBA")
    cut = remove(im)  # rembg -> RGBA with object alpha
    a = np.asarray(cut)[..., 3]
    # harden the mask: anything rembg gave >40 alpha is "object"; feather edge
    mask = (a > 40).astype(np.uint8) * 255
    m = Image.fromarray(mask).filter(ImageFilter.GaussianBlur(1.2))
    rgba = im.copy()
    rgba.putalpha(m)
    bbox = rgba.getbbox()
    if bbox:
        x0, y0, x1, y1 = bbox
        w, h = x1 - x0, y1 - y0
        px, py = int(w * pad), int(h * pad)
        x0 = max(0, x0 - px); y0 = max(0, y0 - py)
        x1 = min(rgba.width, x1 + px); y1 = min(rgba.height, y1 + py)
        rgba = rgba.crop((x0, y0, x1, y1))
    dst = os.path.join(OUTDIR, out)
    rgba.save(dst, "WEBP", quality=92, method=6)
    print(f"saved {out}  {rgba.size[0]}x{rgba.size[1]}  ({os.path.getsize(dst)//1024}KB)", flush=True)


if __name__ == "__main__":
    os.makedirs(OUTDIR, exist_ok=True)
    for src, out, pad in PICKS:
        if not os.path.exists(src):
            print(f"MISSING {src}"); continue
        process(src, out, pad)
    print("UI PROCESS DONE", flush=True)
