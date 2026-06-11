"""
Remove the baked-in dark background from the reel frame art.

Method: edge-connected flood fill. A pixel is "background-ish" if it is dark
and unsaturated; starting from the image borders, all connected background
pixels get alpha 0. The bright lacquer/gold border stops the fill, so the
intentionally-dark panel INSIDE the frame is preserved. The cut edge gets a
1px feather so it composites cleanly.

Reads from  art/finals/reel frame/
Writes to   web-sdk/apps/lines/static/assets/sprites/reelsFrame/  (game dir)

Run:
    cd C:\\Users\\tiger\\Desktop\\Stake\\game-1\\Ayakashi
    env\\Scripts\\python.exe web-sdk\\apps\\lines\\remove-frame-bg.py
"""

import os
import sys
from collections import deque

import numpy as np

try:
    from PIL import Image, ImageFilter
except ImportError:
    sys.exit("Pillow missing — run with the backend venv (env\\Scripts\\python.exe)")

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.normpath(os.path.join(HERE, "reel_frame"))
DST_DIR = os.path.join(HERE, "static", "assets", "sprites", "reelsFrame")

# file -> (brightness cap, saturation cap) for what counts as "background"
FILES = {
    "reel_frame.png": (85, 32),
    "frame_bg1.png": (80, 30),
    "frame_mult.png": (80, 30),
    "frame_tumble3.png": (80, 30),
    "Frame_FSCounter2.png": (70, 28),
}

FEATHER_PX = 1.2


def remove_background(src_path, dst_path, bright_cap, sat_cap):
    img = Image.open(src_path).convert("RGBA")
    arr = np.array(img)
    rgb = arr[..., :3].astype(np.int16)
    mx = rgb.max(axis=-1)
    mn = rgb.min(axis=-1)
    background_ish = (mx < bright_cap) & ((mx - mn) < sat_cap)

    h, w = background_ish.shape
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()

    # seed from every border pixel that looks like background
    for x in range(w):
        for y in (0, h - 1):
            if background_ish[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if background_ish[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((y, x))

    # BFS flood fill across background-ish pixels
    while queue:
        y, x = queue.popleft()
        if y > 0 and background_ish[y - 1, x] and not visited[y - 1, x]:
            visited[y - 1, x] = True
            queue.append((y - 1, x))
        if y < h - 1 and background_ish[y + 1, x] and not visited[y + 1, x]:
            visited[y + 1, x] = True
            queue.append((y + 1, x))
        if x > 0 and background_ish[y, x - 1] and not visited[y, x - 1]:
            visited[y, x - 1] = True
            queue.append((y, x - 1))
        if x < w - 1 and background_ish[y, x + 1] and not visited[y, x + 1]:
            visited[y, x + 1] = True
            queue.append((y, x + 1))

    removed = int(visited.sum())
    alpha = arr[..., 3].copy()
    alpha[visited] = 0

    # feather: min(sharp, blurred) keeps the interior solid and ramps the edge
    blurred = np.array(
        Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(FEATHER_PX))
    )
    arr[..., 3] = np.minimum(alpha, blurred)

    Image.fromarray(arr, "RGBA").save(dst_path, "PNG")
    pct = 100.0 * removed / (h * w)
    return removed, pct


def main():
    if not os.path.isdir(SRC_DIR):
        sys.exit(f"source folder not found: {SRC_DIR}")
    os.makedirs(DST_DIR, exist_ok=True)

    for name, (bright_cap, sat_cap) in FILES.items():
        src = os.path.join(SRC_DIR, name)
        if not os.path.exists(src):
            print(f"  {name:24s} SKIPPED (not found)")
            continue
        dst = os.path.join(DST_DIR, name)
        removed, pct = remove_background(src, dst, bright_cap, sat_cap)
        flag = "" if 1 <= pct <= 60 else "   <-- check this one visually"
        print(f"  {name:24s} removed {pct:5.1f}% of pixels -> {os.path.relpath(dst, HERE)}{flag}")

    print("\nDone. Originals in art/finals/reel frame/ are untouched.")
    print("If a frame lost detail, raise/lower its brightness cap in FILES and re-run.")


if __name__ == "__main__":
    main()
