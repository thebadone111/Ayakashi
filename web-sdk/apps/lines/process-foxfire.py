"""Slice the RunComfy foxfire sheet (candidate 0, clean 3x3, no cell borders)
into individual alpha flame textures for the FS-intro foxfire (P5/FS extras).

The flames are bright blue-white on PURE BLACK with no dark interior to keep, so
a simple luminance ("not black") key gives a clean cutout. Each cell is trimmed
to its flame's bbox. We then promote the best upright flame to foxfire.webp.

Run: ../../../math-sdk/env/Scripts/python.exe process-foxfire.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated\fx\foxfire-sheet\foxfire-sheet_1077055226_0.png"
OUTDIR = os.path.join(HERE, "static", "assets", "sprites", "particles", "foxfire")
ROWS, COLS = 3, 3


def key_alpha(rgb):
    arr = np.asarray(rgb).astype(np.float32)
    value = arr.max(axis=2)  # bright flame on black bg
    a = np.clip((value - 18) / (60 - 18), 0, 1) * 255
    return a.astype(np.uint8)


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    im = Image.open(SRC).convert("RGB")
    W, H = im.size
    cw, ch = W // COLS, H // ROWS
    idx = 0
    for r in range(ROWS):
        for c in range(COLS):
            cell = im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
            a = key_alpha(cell)
            rgba = cell.convert("RGBA")
            am = Image.fromarray(a).filter(ImageFilter.GaussianBlur(0.8))
            rgba.putalpha(am)
            bbox = rgba.getbbox()
            if bbox:
                rgba = rgba.crop(bbox)
            dst = os.path.join(OUTDIR, f"foxfire_{idx}.webp")
            rgba.save(dst, "WEBP", quality=92, method=6)
            print(f"saved foxfire_{idx}.webp  {rgba.size[0]}x{rgba.size[1]}", flush=True)
            idx += 1
    print("FOXFIRE SLICE DONE", flush=True)


if __name__ == "__main__":
    main()
