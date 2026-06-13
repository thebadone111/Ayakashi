"""Build the symbolsStatic atlas from the HQ cloud-FLUX symbols.

Each pick is a subject on near-pure-black. Steps per symbol:
  1. cut the black background to alpha via flood-fill from the 4 corners
     (keeps interior darks; only border-connected black becomes transparent)
  2. autocrop to content bbox
  3. rescale so the MAX dimension = 90% of the 200px cell (uniform mass)
  4. recentre in 200x200, paste into the atlas at the SAME rect as the JSON
JSON is unchanged, so no code touches.

Run from web-sdk/apps/lines:
  ../../../math-sdk/env/Scripts/python.exe build-symbols-atlas.py
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated\symbols-hq"
DIR = os.path.join(HERE, "static", "assets", "sprites", "symbolsStatic")
TARGET = 0.90  # max content dim as fraction of the 200px cell
BG_THRESH = 22  # luminance below this (border-connected) = background

# atlas key -> chosen candidate filename (best of the 2). Filled after review.
PICKS = {
    "h1": "h1_1057880374_0.png",   # oni mask
    "h2": "h2_1057998060_1.png",   # kitsune (frameless, better than ringed _0)
    "h3": "h3_1058150069_0.png",   # tengu
    "h4": "h4_1058316117_0.png",   # dragon
    "h5": "h5_1060178321_0.png",    # tanuki (frameless regen)
    "l1": "l1_1058625018_0.png",   # katana
    "l2": "l2_1058750367_0.png",   # magatama
    "l3": "l3_1058875732_0.png",   # sake flask
    "l4": "l4_1058989565_0.png",   # lantern
    "l5": "l5_1059098974_0.png",   # war fan
    "w":  "w_1059190915_0.png",    # foxfire orb
    "s":  "s_1060073956_0.png",    # temple bell (frameless regen)
    "x":  "x_1059458192_0.png",     # ofuda plaque
    "x2": "x2_1059520966_0.png",   # kanabo
}


def cutout(img: Image.Image) -> Image.Image:
    """Black-background -> alpha via border flood fill (keeps interior darks)."""
    rgb = img.convert("RGB")
    w, h = rgb.size
    # work on a luminance image; flood-fill bg from the 4 corners
    lum = rgb.convert("L")
    filled = lum.copy()
    sentinel = 255  # mark background as pure white in the scratch image
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        # only seed if that corner is actually dark (it should be)
        if lum.getpixel(seed) < BG_THRESH + 30:
            ImageDraw.floodfill(filled, seed, sentinel, thresh=BG_THRESH)
    arr_f = np.asarray(filled)
    lum_a = np.asarray(lum)
    # background = pixels the flood turned to sentinel AND originally dark
    bg = (arr_f == sentinel) & (lum_a < BG_THRESH + 40)
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    out = rgb.convert("RGBA")
    a = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(1.2))  # soft edge
    out.putalpha(a)
    return out


def main():
    atlas = Image.open(os.path.join(DIR, "symbolsStatic.png")).convert("RGBA")
    frames = json.load(open(os.path.join(DIR, "symbolsStatic.json")))["frames"]
    for key, fn in PICKS.items():
        if not fn:
            print(f"{key}: no pick yet — SKIPPED (keeps old art)")
            continue
        src = os.path.join(SRC, key, fn)
        if not os.path.exists(src):
            print(f"{key}: MISSING {fn}")
            continue
        cut = cutout(Image.open(src))
        bbox = cut.getbbox()
        if bbox:
            cut = cut.crop(bbox)
        cw, ch = cut.size
        f = frames[key + (".webp" if key + ".webp" in frames else ".png")]["frame"]
        scale = (TARGET * f["w"]) / max(cw, ch)
        nw, nh = max(1, round(cw * scale)), max(1, round(ch * scale))
        cut = cut.resize((nw, nh), Image.LANCZOS)
        cell = Image.new("RGBA", (f["w"], f["h"]), (0, 0, 0, 0))
        cell.alpha_composite(cut, ((f["w"] - nw) // 2, (f["h"] - nh) // 2))
        atlas.paste(cell, (f["x"], f["y"]))
        print(f"{key:4s} {fn:24s} {cw}x{ch} -> {nw}x{nh}")
    atlas.save(os.path.join(DIR, "symbolsStatic.png"))
    atlas.save(os.path.join(DIR, "symbolsStatic.webp"), "WEBP", quality=92, method=6)
    print("atlas rebuilt (json unchanged)")


if __name__ == "__main__":
    main()
