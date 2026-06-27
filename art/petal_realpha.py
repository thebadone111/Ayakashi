"""Re-key alpha on the 5 picked petal sprite sheets, in place.

Wan/Hailuo I2V outputs are mp4 (no alpha). When baked into 4x4 sprite sheets,
each cell carries the dark video backdrop as opaque black — visible as a
black box around every drifting petal at runtime.

This pass loads the picked sheets in static/assets, runs a max-channel
luminance ramp (KEY_FLOOR..KEY_CEIL) on every pixel, and writes the result
back as RGBA WebP. The previously-opaque black backdrop becomes transparent
while the petal colour stays saturated.

Usage:
  python art/petal_realpha.py
"""
import os, sys, glob
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

import numpy as np
from PIL import Image

KEY_FLOOR = 25
KEY_CEIL  = 110

# Two locations: web-sdk shipping copies AND the _picked source copies.
TARGETS = [
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "web-sdk/apps/lines/static/assets/sprites/particles/petals",
    ),
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "art/generated/petals-anim-v2-2026-06-27/_picked",
    ),
]


def realpha(path: str) -> int:
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    maxc = arr[..., :3].max(axis=-1).astype(np.int32)
    alpha = np.clip(
        ((maxc - KEY_FLOOR) * 255) // max(1, (KEY_CEIL - KEY_FLOOR)),
        0, 255
    ).astype(np.uint8)
    arr[..., 3] = alpha
    out = Image.fromarray(arr, "RGBA")
    out.save(path, format="WEBP", quality=88, method=6)
    return os.path.getsize(path)


if __name__ == "__main__":
    n = 0
    for root in TARGETS:
        if not os.path.isdir(root):
            continue
        for f in sorted(glob.glob(os.path.join(root, "petal_*.webp"))):
            size = realpha(f)
            n += 1
            print(f"  {os.path.basename(f)}  →  {size // 1024} KB")
    print(f"\nrealpha'd {n} sheet(s).")
