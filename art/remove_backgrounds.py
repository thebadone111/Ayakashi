"""
Ayakashi — Background Removal Script
Processes all final symbols and saves transparent PNGs to finals/bg_removed/

Run from anywhere:
    python remove_backgrounds.py

Requires: pip install rembg onnxruntime Pillow
Model: isnet-anime — tuned for anime/illustrated art, best for slot symbols
"""

import os
import sys
from pathlib import Path

# ── Install dependencies if missing ──────────────────────────────────────────
try:
    from rembg import remove, new_session
    from PIL import Image
except ImportError:
    print("Installing dependencies...")
    os.system(f"{sys.executable} -m pip install rembg onnxruntime Pillow")
    from rembg import remove, new_session
    from PIL import Image

# ── Config ───────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent
INPUT_DIR    = SCRIPT_DIR / "finals"
OUTPUT_DIR   = SCRIPT_DIR / "finals" / "bg_removed"
MODEL        = "isnet-anime"   # best for illustrated/anime art

# Files to process — symbols and avatar only, not backgrounds
SYMBOL_FILES = [
    "h1.png", "h11.png", "h17.png", "h22.png", "h4.png",   # high value
    "l11.png", "l14.png", "l17.png", "l3.png",  "l7.png",  # low value
    "w1.png",                                                # wild
    "s1.png",                                                # scatter
    "x1.png",                                                # super/bonus
    "av__00004_.png",                                        # avatar/waifu
]

# ── Run ───────────────────────────────────────────────────────────────────────
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

print(f"Model:  {MODEL}")
print(f"Input:  {INPUT_DIR}")
print(f"Output: {OUTPUT_DIR}")
print(f"Files:  {len(SYMBOL_FILES)}\n")

print("Loading model (first run downloads ~170MB, subsequent runs are instant)...")
session = new_session(MODEL)
print("Model ready.\n")

for filename in SYMBOL_FILES:
    src = INPUT_DIR / filename
    dst = OUTPUT_DIR / filename  # same name, now RGBA PNG

    if not src.exists():
        print(f"  SKIP  {filename}  (not found)")
        continue

    print(f"  Processing  {filename}...", end=" ", flush=True)
    img = Image.open(src).convert("RGB")
    result = remove(img, session=session)   # returns RGBA PIL image
    result.save(dst, format="PNG")
    print(f"done  →  {dst.name}")

print(f"\nAll done. Check finals/bg_removed/ to review.")
