"""Normalize symbol apparent sizes in the symbolsStatic atlas.

The frames are uniform 200x200 but the SUBJECT inside each varies 74-86% of
the frame, so symbols look mismatched on the board. Fix: for each frame, crop
to the content's alpha bbox, rescale so its MAX dimension hits a uniform target,
recentre in the 200x200 cell, and paste back at the SAME atlas rect — so the
JSON stays valid and no code changes.

Tall/thin symbols (fans) stay tall but reach the same max extent as square ones,
evening out visual size. Run:
  ../../../math-sdk/env/Scripts/python.exe normalize-symbols.py
"""
import json
import numpy as np
from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DIR = os.path.join(HERE, "static", "assets", "sprites", "symbolsStatic")
PNG = os.path.join(DIR, "symbolsStatic.png")

TARGET = 0.90  # max content dimension as fraction of the 200px cell

atlas = Image.open(PNG).convert("RGBA")
frames = json.load(open(os.path.join(DIR, "symbolsStatic.json")))["frames"]

for k, v in frames.items():
    f = v["frame"]
    cell = atlas.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]))
    arr = np.asarray(cell)
    ys, xs = np.where(arr[..., 3] > 24)
    if len(xs) == 0:
        continue
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    content = cell.crop((x0, y0, x1 + 1, y1 + 1))
    cw, ch = content.size
    # scale so the larger dimension == TARGET * cell
    scale = (TARGET * f["w"]) / max(cw, ch)
    nw, nh = max(1, round(cw * scale)), max(1, round(ch * scale))
    content = content.resize((nw, nh), Image.LANCZOS)
    # blank the cell, paste recentred
    blank = Image.new("RGBA", (f["w"], f["h"]), (0, 0, 0, 0))
    blank.alpha_composite(content, ((f["w"] - nw) // 2, (f["h"] - nh) // 2))
    atlas.paste(blank, (f["x"], f["y"]))
    print(f"{k:10s} {cw}x{ch} -> {nw}x{nh}  (max {max(nw,nh)}/{f['w']})")

atlas.save(PNG)
atlas.save(os.path.join(DIR, "symbolsStatic.webp"), "WEBP", quality=92, method=6)
print("repacked atlas (json unchanged)")
