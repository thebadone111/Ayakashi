"""Bake petal-animation mp4s into 16-frame WebP sprite sheets.

Takes all mp4s in art/generated/petals-anim-v2-2026-06-27/mp4/ and produces
one WebP per file, packed 4×4 at 256×256 per frame (1024×1024 sheet, target
~80-200 KB at quality 82). Ready to load as a PixiJS AnimatedSprite.

Output:
  art/generated/petals-anim-v2-2026-06-27/sheets/<name>.webp
  art/generated/petals-anim-v2-2026-06-27/sheets/<name>.png   (reference)

Usage:
  python art/petal_bake.py
"""
import os, subprocess, sys, glob
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
from PIL import Image
import numpy as np
import imageio_ffmpeg as iio

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(REPO, "art", "generated", "petals-anim-v2-2026-06-27", "mp4")
OUT_DIR = os.path.join(REPO, "art", "generated", "petals-anim-v2-2026-06-27", "sheets")
os.makedirs(OUT_DIR, exist_ok=True)
FFMPEG = iio.get_ffmpeg_exe()

FRAMES = 16
COLS = 4
ROWS = FRAMES // COLS
FRAME_SIZE = 256  # per cell — square for petals
SHEET_W = COLS * FRAME_SIZE   # 1024
SHEET_H = ROWS * FRAME_SIZE   # 1024

# Luminance-to-alpha threshold. Wan/Hailuo I2V output is mp4 (RGB only); when
# pasted onto a sheet, the dark video backdrop sits as opaque black around each
# petal — visible as a black box at runtime. We re-key per pixel: pixels
# brighter than KEY_FLOOR keep their colour and become opaque, pixels darker
# than KEY_FLOOR fade to transparent. Used `max(R,G,B)` rather than perceptual
# luminance so coloured petals don't lose saturation in the alpha ramp.
KEY_FLOOR = 25     # below this max-channel value → fully transparent
KEY_CEIL  = 110    # above → fully opaque (rest is a linear ramp)


def get_duration(mp4):
    out = subprocess.run([FFMPEG, "-i", mp4, "-hide_banner"],
                         capture_output=True, text=True).stderr
    for line in out.splitlines():
        if "Duration:" in line:
            t = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = t.split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
    return 5.0


def bake_one(mp4):
    name = os.path.splitext(os.path.basename(mp4))[0]
    tmp = os.path.join(OUT_DIR, f".tmp_{name}")
    os.makedirs(tmp, exist_ok=True)
    dur = get_duration(mp4)
    for i in range(FRAMES):
        ts = (i + 0.5) * dur / FRAMES
        subprocess.run(
            [FFMPEG, "-y", "-loglevel", "error", "-ss", f"{ts:.3f}",
             "-i", mp4, "-frames:v", "1", "-q:v", "2",
             os.path.join(tmp, f"f_{i:02d}.png")], check=True)

    sheet = Image.new("RGBA", (SHEET_W, SHEET_H), (0, 0, 0, 0))
    for i in range(FRAMES):
        f = Image.open(os.path.join(tmp, f"f_{i:02d}.png")).convert("RGBA")
        f = f.resize((FRAME_SIZE, FRAME_SIZE), Image.LANCZOS)
        # Luminance-to-alpha keying: max-channel ramp from KEY_FLOOR..KEY_CEIL.
        # Kills the opaque black mp4 backdrop without desaturating the petal.
        arr = np.array(f)
        maxc = arr[..., :3].max(axis=-1).astype(np.int32)
        alpha = np.clip(
            ((maxc - KEY_FLOOR) * 255) // max(1, (KEY_CEIL - KEY_FLOOR)),
            0, 255
        ).astype(np.uint8)
        arr[..., 3] = alpha
        f = Image.fromarray(arr, "RGBA")
        c, r = i % COLS, i // COLS
        sheet.paste(f, (c * FRAME_SIZE, r * FRAME_SIZE))

    png = os.path.join(OUT_DIR, f"{name}.png")
    webp = os.path.join(OUT_DIR, f"{name}.webp")
    sheet.save(png, "PNG", optimize=True)
    sheet.save(webp, "WEBP", quality=82, method=6)

    # cleanup
    for f in os.listdir(tmp):
        os.remove(os.path.join(tmp, f))
    os.rmdir(tmp)
    print(f"{name}: PNG {os.path.getsize(png)//1024} KB / WEBP "
          f"{os.path.getsize(webp)//1024} KB")
    return webp


if __name__ == "__main__":
    mp4s = sorted(glob.glob(os.path.join(SRC_DIR, "*.mp4")))
    if not mp4s:
        print(f"ERROR: no mp4s in {SRC_DIR}"); sys.exit(1)
    print(f"Baking {len(mp4s)} sheets -> {OUT_DIR}\n")
    for mp4 in mp4s:
        bake_one(mp4)
    print("\nDONE.")
