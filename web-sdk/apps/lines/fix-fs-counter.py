"""Frame_FSCounter2: the art's flames/ornaments run off the canvas edge, so the
sprite shows hard slice lines ("clipping"). Feather the alpha near all four
edges so anything reaching the border fades out smoothly instead.

Run: ../../../math-sdk/env/Scripts/python.exe fix-fs-counter.py
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
path = os.path.join(HERE, "static", "assets", "sprites", "reelsFrame", "Frame_FSCounter2.webp")

im = Image.open(path).convert("RGBA")
arr = np.asarray(im).astype(np.float32)
h, w = arr.shape[:2]

feather = int(min(w, h) * 0.025)  # ~57px on 2304 — subtle, just kills the slice line
ramp_x = np.minimum(np.arange(w), np.arange(w)[::-1]) / feather
ramp_y = np.minimum(np.arange(h), np.arange(h)[::-1]) / feather
mask = np.clip(np.minimum.outer(ramp_y, ramp_x), 0.0, 1.0)
# smoothstep for a softer falloff than linear
mask = mask * mask * (3 - 2 * mask)

arr[..., 3] *= mask
Image.fromarray(arr.astype(np.uint8)).save(path, "WEBP", quality=90, method=6)
print(f"feathered {feather}px edges -> {os.path.getsize(path)//1024}KB")
