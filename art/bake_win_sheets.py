"""Bake symbol win-animation sprite sheets from the picked Wan I2V renders.

For each symbol:
  1. Sample 16 evenly-spaced frames from the picked (forward) mp4.
  2. Chroma-key the flat studio backdrop: per frame, estimate the backdrop
     color from the 4 corner patches, alpha = smoothstep of RGB distance.
  3. Crop all frames to the union content bbox (squarified, small margin)
     so the subject fills the frame like the static atlas art.
  4. Pack 4x4 @ 256 px -> WebP q85 into the app's static sprites.

Playback (SymbolSprite.svelte) runs the 16 frames in ping-pong, so the
clip returns to its resting/still frame even for one-way renders.

Run from repo root:  python art/bake_win_sheets.py
"""
import os
import numpy as np
import imageio
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WA = os.path.join(REPO, "art", "wan-animations")
OUT = os.path.join(REPO, "web-sdk", "apps", "lines", "static", "assets", "sprites", "symbols")
os.makedirs(OUT, exist_ok=True)

# symbol -> picked render (2026-07-04 review)
PICKS = {
    "h1": f"{WA}/h1-ao-oni/output/Render-rife-upscaled_00001.mp4",
    "h2": f"{WA}/h2-kitsune-men/output-rerun-20260704/h2_00001.mp4",
    "h3": f"{WA}/h3-daitengu/output/Render-rife-upscaled_00002.mp4",
    "h4": f"{WA}/h4-ko-omote/output-rerun-20260704/h4-rerun_00001.mp4",
    "l1": f"{WA}/l1-fire/output/l1_00001.mp4",
    "l2": f"{WA}/l2-water/output-rerun/l2-rerun_00001.mp4",
    "l3": f"{WA}/l3-wood/output-rerun/l3-rerun_00001.mp4",
    "l4": f"{WA}/l4-gold/output/l4_00001.mp4",
    "l5": f"{WA}/l5-earth/output/l5_00001.mp4",
    "w":  f"{WA}/w-spirit-orb/output/w_00001.mp4",
    "s":  f"{WA}/s-temple-bell/output-rerun/s-rerun_00001.mp4",
    "m":  f"{WA}/m-ofuda/output/m_00001.mp4",
    "x":  f"{WA}/x-kanabo/output/x_00001.mp4",
}

FRAMES = 16
COLS = ROWS = 4
CELL = 256
# alpha ramp on RGB distance to the estimated backdrop color
T0, T1 = 20.0, 58.0


def sample_frames(path, count):
    reader = imageio.get_reader(path)
    n = reader.count_frames()
    if not np.isfinite(n) or n <= 0:  # some containers won't report
        frames_all = [f for f in reader]
        n = len(frames_all)
        idxs = np.linspace(0, n - 1, count).astype(int)
        return [frames_all[i] for i in idxs]
    idxs = set(np.linspace(0, n - 1, count).astype(int).tolist())
    out = []
    for i, f in enumerate(reader):
        if i in idxs:
            out.append(f)
    return out


def key_frame(rgb):
    """RGBA uint8 with the flat backdrop keyed out (corner-sampled)."""
    h, w, _ = rgb.shape
    p = max(8, h // 40)
    corners = np.concatenate([
        rgb[:p, :p].reshape(-1, 3), rgb[:p, -p:].reshape(-1, 3),
        rgb[-p:, :p].reshape(-1, 3), rgb[-p:, -p:].reshape(-1, 3),
    ]).astype(np.float32)
    bg = np.median(corners, axis=0)
    dist = np.linalg.norm(rgb.astype(np.float32) - bg, axis=2)
    alpha = np.clip((dist - T0) / (T1 - T0), 0, 1)
    # smoothstep for soft glow edges
    alpha = alpha * alpha * (3 - 2 * alpha)
    out = np.dstack([rgb, (alpha * 255).astype(np.uint8)])
    return out


def bake(sym, path):
    frames = [key_frame(f) for f in sample_frames(path, FRAMES)]
    # union content bbox over all frames (alpha > 40)
    ys, xs = [], []
    for f in frames:
        m = f[:, :, 3] > 40
        if m.any():
            yy, xx = np.where(m)
            ys += [yy.min(), yy.max()]
            xs += [xx.min(), xx.max()]
    h, w, _ = frames[0].shape
    y0, y1 = (min(ys), max(ys)) if ys else (0, h - 1)
    x0, x1 = (min(xs), max(xs)) if xs else (0, w - 1)
    # squarify around content centre + 4% margin
    cy, cx = (y0 + y1) / 2, (x0 + x1) / 2
    side = int(max(y1 - y0, x1 - x0) * 1.04)
    half = side // 2
    y0, y1 = int(cy - half), int(cy + half)
    x0, x1 = int(cx - half), int(cx + half)

    sheet = Image.new("RGBA", (COLS * CELL, ROWS * CELL), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        img = Image.fromarray(f, "RGBA")
        # crop can exceed the frame — paste onto transparent canvas
        canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        crop = img.crop((max(0, x0), max(0, y0), min(w, x1), min(h, y1)))
        canvas.paste(crop, (max(0, -x0), max(0, -y0)))
        canvas = canvas.resize((CELL, CELL), Image.LANCZOS)
        sheet.paste(canvas, ((i % COLS) * CELL, (i // COLS) * CELL))
    dest = os.path.join(OUT, f"{sym}_win.webp")
    sheet.save(dest, "WEBP", quality=85, method=6)
    print(f"{sym}: {os.path.basename(path)} -> {dest} ({os.path.getsize(dest)//1024} KB)")


if __name__ == "__main__":
    for sym, path in PICKS.items():
        if not os.path.exists(path):
            print(f"{sym}: MISSING {path}")
            continue
        bake(sym, path)
    print("done")
