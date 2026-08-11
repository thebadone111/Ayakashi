"""Bake avatar animation sheets from the green-screen Wan renders.

  idle  -> 24 frames, 4 cols x 6 rows  (subtle motion needs temporal density)
  cheer -> 16 frames, 4 cols x 4 rows

Green key: background color estimated per frame from patches inset from the
corners (letterbox rounding can leave 1-2 px black bars at the true corners),
alpha = smoothstep of RGB distance. Green is far from the whole character
palette (indigo/white/cyan/pink), so the dark kimono survives.

All frames share ONE union content bbox per clip (rectangular, small margin)
so the mesh sees a consistent frame. Output aspect matches the crop.

Run from repo root:  python art/bake_avatar_sheets.py
"""
import os
import numpy as np
import imageio
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WA = os.path.join(REPO, "art", "wan-animations", "avatar")
OUT = os.path.join(REPO, "web-sdk", "apps", "lines", "static", "assets", "sprites", "avatar")

JOBS = [
    # v2 idle: locked pose (breath/hair/foxfire only) — dense 40-frame bake so
    # 16 fps playback has no stop-motion stepping
    ("avatar_idle", f"{WA}/output-idle-gs-v2/avatar-idle-gs-v2_00001.mp4", 40, 4, 10),
    ("avatar_cheer", f"{WA}/output-cheer-gs/avatar-cheer-gs_00001.mp4", 24, 4, 6),
]
FRAME_W = 360  # per-frame width; height follows crop aspect
T0, T1 = 30.0, 80.0  # green is far from everything — wide, confident ramp


def sample_frames(path, count, start_frac=0.10):
    """Skip the clip's opening morph-in (Wan 'wakes' the still over the first
    ~10% — those frames key as semi-transparent ghosts)."""
    reader = imageio.get_reader(path)
    frames_all = [f for f in reader]
    n = len(frames_all)
    idxs = np.linspace(int(n * start_frac), n - 1, count).astype(int)
    return [frames_all[i] for i in idxs]


def key_frame(rgb):
    h, w, _ = rgb.shape
    p = max(10, h // 30)
    ix, iy = int(w * 0.12), int(h * 0.12)  # inset past any letterbox bar
    patches = np.concatenate([
        rgb[iy:iy + p, ix:ix + p].reshape(-1, 3),
        rgb[iy:iy + p, w - ix - p:w - ix].reshape(-1, 3),
        rgb[h - iy - p:h - iy, ix:ix + p].reshape(-1, 3),
        rgb[h - iy - p:h - iy, w - ix - p:w - ix].reshape(-1, 3),
    ]).astype(np.float32)
    bg = np.median(patches, axis=0)
    dist = np.linalg.norm(rgb.astype(np.float32) - bg, axis=2)
    alpha = np.clip((dist - T0) / (T1 - T0), 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha)
    # despill: pull green channel down toward the max of r/b where alpha is soft
    r, g, bch = rgb[:, :, 0].astype(np.float32), rgb[:, :, 1].astype(np.float32), rgb[:, :, 2].astype(np.float32)
    spill = np.clip(g - np.maximum(r, bch), 0, None) * (1 - alpha * 0.5)
    g2 = np.clip(g - spill, 0, 255)
    out = np.dstack([r.astype(np.uint8), g2.astype(np.uint8), rgb[:, :, 2], (alpha * 255).astype(np.uint8)])
    return out


def bake(name, path, count, cols, rows):
    frames = [key_frame(f) for f in sample_frames(path, count)]
    h, w, _ = frames[0].shape
    ys, xs = [], []
    for f in frames:
        m = f[:, :, 3] > 40
        if m.any():
            yy, xx = np.where(m)
            ys += [yy.min(), yy.max()]
            xs += [xx.min(), xx.max()]
    y0, y1 = max(0, min(ys) - int(h * 0.02)), min(h, max(ys) + int(h * 0.02))
    x0, x1 = max(0, min(xs) - int(w * 0.02)), min(w, max(xs) + int(w * 0.02))
    cw, ch = x1 - x0, y1 - y0
    fh = int(FRAME_W * ch / cw)
    sheet = Image.new("RGBA", (cols * FRAME_W, rows * fh), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        img = Image.fromarray(f, "RGBA").crop((x0, y0, x1, y1)).resize((FRAME_W, fh), Image.LANCZOS)
        sheet.paste(img, ((i % cols) * FRAME_W, (i // cols) * fh))
    dest = os.path.join(OUT, f"{name}.webp")
    sheet.save(dest, "WEBP", quality=85, method=6)
    print(f"{name}: {count} frames {FRAME_W}x{fh} -> {dest} ({os.path.getsize(dest)//1024} KB)")


if __name__ == "__main__":
    for name, path, count, cols, rows in JOBS:
        if not os.path.exists(path):
            print(f"{name}: MISSING {path}")
            continue
        bake(name, path, count, cols, rows)
    print("done")
