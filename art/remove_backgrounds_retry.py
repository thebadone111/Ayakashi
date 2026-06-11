"""
Ayakashi — Background Removal Retry Script
Tries multiple models on the files that failed first time.
Saves to finals/bg_removed/ overwriting the bad results.

Run:
    python remove_backgrounds_retry.py
"""

import os
import sys
from pathlib import Path

try:
    from rembg import remove, new_session
    from PIL import Image, ImageFilter
except ImportError:
    os.system(f"{sys.executable} -m pip install rembg onnxruntime Pillow")
    from rembg import remove, new_session
    from PIL import Image, ImageFilter

SCRIPT_DIR = Path(__file__).parent
INPUT_DIR  = SCRIPT_DIR / "finals"
OUTPUT_DIR = SCRIPT_DIR / "finals" / "bg_removed"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Files that failed first time
RETRY_FILES = [
    "bg_fg.png"
]

# Models to try in order — birefnet-general is best for dark/complex edges
# Script saves a separate file per model so you can compare
MODELS = [
    "birefnet-general",       # newest, best edge detection
    "birefnet-general-lite",  # faster version
    "u2net",                  # classic general purpose
]

for model_name in MODELS:
    print(f"\n── Model: {model_name} ──────────────────────────────")
    try:
        session = new_session(model_name)
    except Exception as e:
        print(f"  Could not load {model_name}: {e}")
        continue

    for filename in RETRY_FILES:
        src = INPUT_DIR / filename
        if not src.exists():
            print(f"  SKIP  {filename}  (not found)")
            continue

        # Save with model name suffix so you can compare
        stem = Path(filename).stem
        dst = OUTPUT_DIR / f"{stem}__{model_name}.png"

        print(f"  {filename}...", end=" ", flush=True)
        try:
            img = Image.open(src).convert("RGB")
            result = remove(img, session=session)
            result.save(dst, format="PNG")
            print(f"done  →  {dst.name}")
        except Exception as e:
            print(f"ERROR: {e}")

print("\nDone. Compare the __birefnet-general / __birefnet-general-lite / __u2net")
print("versions side by side and pick the best one per file.")
print("Rename your winner back to the original filename (e.g. h22.png) in bg_removed/")
