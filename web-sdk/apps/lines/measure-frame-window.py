"""Measure the reel frame's actual transparent window so BoardFrame can map it
exactly onto the board rect instead of assuming a centered 86%/82% window.

Prints the window bbox as fractions of the art canvas + the scale/offset the
component needs.

Run: ../../../math-sdk/env/Scripts/python.exe measure-frame-window.py
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
RF = os.path.join(HERE, "static", "assets", "sprites", "reelsFrame")

im = Image.open(os.path.join(RF, "reel_frame.webp")).convert("RGBA")
a = np.asarray(im)[..., 3]
h, w = a.shape
print(f"art: {w}x{h}")

# The window = the large fully-transparent region in the middle.
# Scan the center row/column for the transparent span.
cy, cx = h // 2, w // 2
row = a[cy, :] < 16
col = a[:, cx] < 16

def center_span(mask, center):
    lo = center
    while lo > 0 and mask[lo - 1]:
        lo -= 1
    hi = center
    while hi < len(mask) - 1 and mask[hi + 1]:
        hi += 1
    return lo, hi

x0, x1 = center_span(row, cx)
y0, y1 = center_span(col, cy)
win_w, win_h = x1 - x0 + 1, y1 - y0 + 1
print(f"window bbox: x {x0}..{x1} ({win_w}px)  y {y0}..{y1} ({win_h}px)")
print(f"window fraction of art: w={win_w/w:.4f}  h={win_h/h:.4f}")
print(f"window center vs art center: dx={(x0+x1)/2 - w/2:+.1f}px ({((x0+x1)/2 - w/2)/w:+.4f})  "
      f"dy={(y0+y1)/2 - h/2:+.1f}px ({((y0+y1)/2 - h/2)/h:+.4f})")

# Border thicknesses (art pixels)
print(f"borders: left={x0} right={w-1-x1} top={y0} bottom={h-1-y1}")
