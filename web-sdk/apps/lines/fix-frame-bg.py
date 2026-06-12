"""Fix frame_bg1: crop off the panel's own trim/shadow/wall (the stray reddish
lines leaking past the reel frame border) and mute the red scratch streaks
that fight the symbols. Also sanity-check alpha on the frame sprites.

Run: ../../../math-sdk/env/Scripts/python.exe fix-frame-bg.py
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
RF = os.path.join(HERE, "static", "assets", "sprites", "reelsFrame")

# ── 1. alpha sanity check on the overlay frames ───────────────────────────────
for name in ("reel_frame.webp", "Frame_FSCounter2.webp"):
    im = Image.open(os.path.join(RF, name))
    print(f"{name}: size={im.size} mode={im.mode}", end="")
    if im.mode == "RGBA":
        a = np.asarray(im)[..., 3]
        print(f"  alpha min={a.min()} max={a.max()}  transparent%={100*(a<16).mean():.1f}")
    else:
        print("  *** NO ALPHA CHANNEL — frame would black-box the board! ***")

# ── 2. process frame_bg1 ──────────────────────────────────────────────────────
src = os.path.join(RF, "frame_bg1.webp")
im = Image.open(src).convert("RGB")
w, h = im.size
print(f"\nframe_bg1: {im.size}")

# Crop to the inner wood surface, inside the panel's own bronze trim.
# Measured off the art: panel trim sits at ~6%/2% margins; go safely inside it.
crop = im.crop((int(w * 0.085), int(h * 0.055), int(w * 0.915), int(h * 0.885)))
print(f"cropped: {crop.size}")

# Mute red scratches: where R clearly dominates G/B, pull toward the panel's
# dark neutral and desaturate, so streaks become subtle monochrome texture.
arr = np.asarray(crop).astype(np.float32)
r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
redness = r - np.maximum(g, b)                      # how red-dominant
strength = np.clip((redness - 18.0) / 60.0, 0.0, 1.0) * 0.65  # 0..0.65
gray = 0.299 * r + 0.587 * g + 0.114 * b
for i, ch in enumerate((r, g, b)):
    desat = gray * 0.82                              # desaturate + dim a touch
    arr[..., i] = ch * (1 - strength) + desat * strength

out = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
out.save(os.path.join(RF, "frame_bg1.webp"), "WEBP", quality=90, method=6)
print(f"saved frame_bg1.webp  {os.path.getsize(os.path.join(RF, 'frame_bg1.webp'))//1024}KB")
