"""Turn the generated square-window frame art into the game reel frame.

Unlike symbols (keep interior darks), a FRAME must have BOTH the outer black
and the enclosed center window keyed to transparent, leaving only the colored
border. So: global brightness key (frame is bright, bg+window are black).
Then measure the transparent window to print new FRAME_RATIOS for constants.ts.

Run: ../../../math-sdk/env/Scripts/python.exe process-reel-frame.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated\frames-hq\reel-frame\reel-frame_1059957015_0.png"
OUT = os.path.join(HERE, "static", "assets", "sprites", "reelsFrame", "reel_frame.webp")

im = Image.open(SRC).convert("RGB")
arr = np.asarray(im).astype(np.float32)
value = arr.max(axis=2)  # brightness; frame is bright, black bg/window ~0
alpha = np.clip((value - 28) / (70 - 28), 0, 1) * 255
alpha = alpha.astype(np.uint8)

rgba = im.convert("RGBA")
a_img = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(1.0))
rgba.putalpha(a_img)

# crop to the frame's outer extent
bbox = rgba.getbbox()
frame = rgba.crop(bbox)
FW, FH = frame.size

# measure the central transparent window: span of low-alpha around the centre
fa = np.asarray(frame)[..., 3]
cy, cx = FH // 2, FW // 2
row = fa[cy, :] < 32
col = fa[:, cx] < 32

def span(mask, c):
    lo = c
    while lo > 0 and mask[lo - 1]:
        lo -= 1
    hi = c
    while hi < len(mask) - 1 and mask[hi + 1]:
        hi += 1
    return lo, hi

x0, x1 = span(row, cx); y0, y1 = span(col, cy)
win_w, win_h = x1 - x0 + 1, y1 - y0 + 1
fw, fh = win_w / FW, win_h / FH
print(f"frame art: {FW}x{FH}")
print(f"window: {win_w}x{win_h}  ->  {fw*100:.1f}% x {fh*100:.1f}% of frame")
print(f"FRAME_RATIOS = {{ width: {1/fw:.4f}, height: {1/fh:.4f} }}")

frame.save(OUT, "WEBP", quality=92, method=6)
print(f"saved {OUT}  ({os.path.getsize(OUT)//1024}KB)")
