"""Bake v2 production sprite sheets from the 2026-07-05 720px Wan renders.

Sources: art/wan-animations/_renders-720-20260705/<label>/<label>_00001.mp4
  - symbols  h1 h2 h3 h4 l1 l2 l3 l4 l5 w s m x  (flat green bg)
  - avatar-idle / avatar-cheer                    (flat green bg)
  - fx-inkburst                                   (black bg)

Pipeline per clip:
  1. Sample N frames evenly spaced, skipping the first 10% (Wan morph-in).
  2. Chroma key: bg color = median of 4 patches inset 12% from the corners,
     alpha = smoothstep((dist - 30) / (80 - 30)) in RGB distance. Green
     despill on the soft edge (no-op on black backgrounds).
  3. One union content bbox across all sampled frames (alpha > 40);
     symbols/fx squarified +4% margin, avatar rectangular +2% margin.
  4. Corner-glow containment: rounded-square alpha falloff over the outer
     6% of each baked cell so auras never clip as a hard square edge.
  5. Pack into RGBA WebP q90 sheets (every sheet asserted <= 4096px).
  6. Write web-sdk/apps/lines/src/game/winSheets.manifest.json with grid
     metadata + per-symbol drawScale so the flipbook renders at the same
     on-screen content size as the static atlas art.

Renders land gradually: missing clips are skipped with a warning and the
previous manifest entry (if any) is preserved, so the script is re-runnable.

Run from repo root:   python art/bake_sheets_v2.py
Self-test (scratch):  python art/bake_sheets_v2.py --test [clip ...]
  --test writes sheets to the scratchpad dir, skips the manifest, and can
  optionally override source paths positionally as  label=path  pairs.
"""
import json
import os
import sys

import imageio
import numpy as np
from PIL import Image
from scipy import ndimage

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RENDERS = os.path.join(REPO, "art", "wan-animations", "_renders-720-20260705")
STATIC = os.path.join(REPO, "web-sdk", "apps", "lines", "static", "assets", "sprites")
ATLAS = os.path.join(REPO, "art", "generated", "symbols-2026-06-26", "_atlas")
MANIFEST = os.path.join(REPO, "web-sdk", "apps", "lines", "src", "game", "winSheets.manifest.json")
TEST_OUT = os.path.join(
    r"C:\Users\tiger\AppData\Local\Temp\claude",
    "C--Users-tiger-Desktop-Stake-game-1-Ayakashi",
    "70841c27-0172-4b4b-9707-da5aeaff0524", "scratchpad", "bake_v2_test",
)

SYMBOLS = ["h1", "h2", "h3", "h4", "l1", "l2", "l3", "l4", "l5", "w", "s", "m", "x"]

# keying ramp (RGB distance to estimated backdrop color)
T0, T1 = 30.0, 80.0
ALPHA_CONTENT = 40          # bbox threshold on baked frames
EDGE_FALLOFF = 0.04         # rounded-square containment band (fraction of cell)
MAX_TEX = 4096
SKIP_HEAD = 0.10            # skip the Wan morph-in ghosts
FALLBACK_DRAWSCALE = 1.15


def render_path(label):
    return os.path.join(RENDERS, label, f"{label}_00001.mp4")


def count_frames(path):
    reader = imageio.get_reader(path)
    try:
        n = reader.count_frames()
        if np.isfinite(n) and n > 0:
            return int(n)
    except Exception:
        pass
    n = 0
    for _ in reader:
        n += 1
    return n


def sample_frames(path, count, end_frac=1.0):
    """N frames evenly spaced over [10%, end_frac], single pass, low RAM.
    end_frac < 1 trims a clip's tail (e.g. the ink burst's smoke dissipation)."""
    n = count_frames(path)
    last = int(min(n - 1, n * end_frac))
    idxs = np.linspace(int(n * SKIP_HEAD), last, count).astype(int)
    wanted = {}
    for pos, i in enumerate(idxs):
        wanted.setdefault(int(i), []).append(pos)
    out = [None] * count
    reader = imageio.get_reader(path)
    for i, f in enumerate(reader):
        if i in wanted:
            arr = np.asarray(f)[:, :, :3]
            for pos in wanted[i]:
                out[pos] = arr
        if i >= idxs[-1]:
            break
    if any(f is None for f in out):
        raise RuntimeError(f"failed to sample {count} frames from {path} (n={n})")
    return out


def key_frame(rgb):
    """RGBA uint8: corner-patch chroma key + green despill."""
    h, w, _ = rgb.shape
    p = max(10, h // 30)
    ix, iy = int(w * 0.12), int(h * 0.12)  # inset past letterbox bars / vignette
    patches = np.concatenate([
        rgb[iy:iy + p, ix:ix + p].reshape(-1, 3),
        rgb[iy:iy + p, w - ix - p:w - ix].reshape(-1, 3),
        rgb[h - iy - p:h - iy, ix:ix + p].reshape(-1, 3),
        rgb[h - iy - p:h - iy, w - ix - p:w - ix].reshape(-1, 3),
    ]).astype(np.float32)
    bg = np.median(patches, axis=0)
    dist = np.linalg.norm(rgb.astype(np.float32) - bg, axis=2)
    alpha = np.clip((dist - T0) / (T1 - T0), 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha)  # smoothstep
    # despill: pull green down toward max(r, b) where alpha is soft.
    # On black backgrounds g - max(r,b) is ~0 for spill-free pixels: harmless.
    r = rgb[:, :, 0].astype(np.float32)
    g = rgb[:, :, 1].astype(np.float32)
    b = rgb[:, :, 2].astype(np.float32)
    spill = np.clip(g - np.maximum(r, b), 0, None) * (1 - alpha * 0.5)
    g2 = np.clip(g - spill, 0, 255).astype(np.uint8)
    return np.dstack([rgb[:, :, 0], g2, rgb[:, :, 2], (alpha * 255).astype(np.uint8)])


def drop_stray_islands(frames, min_frac=0.04):
    """Kill detached alpha islands (keyed foxfire/spark remnants floating off
    the subject). Label connected solid-alpha regions ACROSS all frames at
    once (a wisp attached to the subject in any frame is kept in every frame),
    then zero any component smaller than min_frac of the largest. Symbols are
    single centered objects, so this is safe; not used on the avatar."""
    solid = np.stack([f[:, :, 3] > 128 for f in frames])  # (n,h,w)
    flat = solid.any(axis=0)                               # union mask
    lbl, n = ndimage.label(flat)
    if n <= 1:
        return frames
    sizes = ndimage.sum(np.ones_like(lbl), lbl, index=range(1, n + 1))
    keep = {i + 1 for i, s in enumerate(sizes) if s >= sizes.max() * min_frac}
    keepmask = np.isin(lbl, list(keep))
    out = []
    for f in frames:
        g = f.copy()
        g[:, :, 3] = np.where(keepmask, g[:, :, 3], 0)
        out.append(g)
    return out


def union_bbox(frames, thresh=ALPHA_CONTENT):
    ys, xs = [], []
    for f in frames:
        m = f[:, :, 3] > thresh
        if m.any():
            yy, xx = np.where(m)
            ys += [int(yy.min()), int(yy.max())]
            xs += [int(xx.min()), int(xx.max())]
    h, w, _ = frames[0].shape
    if not ys:
        return 0, 0, w, h
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def square_crop_box(frames, margin=0.04):
    x0, y0, x1, y1 = union_bbox(frames)
    cy, cx = (y0 + y1) / 2.0, (x0 + x1) / 2.0
    side = int(max(y1 - y0, x1 - x0) * (1 + margin))
    half = side / 2.0
    return int(cx - half), int(cy - half), int(cx - half) + side, int(cy - half) + side


def rect_crop_box(frames, margin=0.02):
    x0, y0, x1, y1 = union_bbox(frames)
    h, w, _ = frames[0].shape
    mx, my = int(w * margin), int(h * margin)
    return max(0, x0 - mx), max(0, y0 - my), min(w, x1 + mx), min(h, y1 + my)


def crop_to_canvas(frame, box):
    """Crop (box may exceed the frame) onto a transparent canvas."""
    x0, y0, x1, y1 = box
    h, w, _ = frame.shape
    canvas = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
    img = Image.fromarray(frame, "RGBA")
    crop = img.crop((max(0, x0), max(0, y0), min(w, x1), min(h, y1)))
    canvas.paste(crop, (max(0, -x0), max(0, -y0)))
    return canvas


_falloff_cache = {}


def edge_falloff_mask(size):
    """Rounded-square containment: 1.0 inside, smoothstep to 0 at the very
    edge, only touching the outer EDGE_FALLOFF band of each axis."""
    if size in _falloff_cache:
        return _falloff_cache[size]
    w, h = size

    def ramp(n):
        t = np.minimum(np.arange(n), np.arange(n)[::-1]).astype(np.float32)
        t = np.clip(t / max(1.0, n * EDGE_FALLOFF), 0, 1)
        return t * t * (3 - 2 * t)
    mask = ramp(h)[:, None] * ramp(w)[None, :]  # product -> rounded corners
    _falloff_cache[size] = mask
    return mask


def apply_falloff(cell_img):
    arr = np.array(cell_img, dtype=np.float32)
    mask = edge_falloff_mask(cell_img.size)
    arr[:, :, 3] *= mask
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def pack_sheet(cells, cols, rows, cw, ch):
    assert len(cells) == cols * rows, f"{len(cells)} cells for {cols}x{rows} grid"
    sheet = Image.new("RGBA", (cols * cw, rows * ch), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        sheet.paste(c, ((i % cols) * cw, (i // cols) * ch))
    assert sheet.width <= MAX_TEX and sheet.height <= MAX_TEX, (
        f"sheet {sheet.size} exceeds {MAX_TEX}px GPU texture limit")
    return sheet


def content_fraction(arr, thresh):
    """max(content bbox side) / max(image side) for an RGBA array."""
    m = arr[:, :, 3] > thresh
    if not m.any():
        return None
    yy, xx = np.where(m)
    bw, bh = int(xx.max() - xx.min() + 1), int(yy.max() - yy.min() + 1)
    return max(bw, bh) / max(arr.shape[0], arr.shape[1])


def static_content_fraction(sym):
    p = os.path.join(ATLAS, f"{sym}-nobg.png")
    if not os.path.exists(p):
        return None
    arr = np.array(Image.open(p).convert("RGBA"))
    return content_fraction(arr, 10)


def bake_clip(path, n_frames, cols, rows, cell_w, square, margin, cell_h=None, falloff=True, end_frac=1.0):
    """Returns (sheet, cells) — cells are the baked per-frame images.

    falloff: rounded-square alpha containment. ON for symbols/fx (full-frame
    auras that would otherwise clip as a hard square). OFF for the avatar —
    she's a keyed silhouette on green with no square glow, so fading her
    raised arm / tail tips at the cell edge would only damage her.
    """
    frames = [key_frame(f) for f in sample_frames(path, n_frames, end_frac)]
    if falloff:  # symbols/fx are single centered objects — drop keyed stray specks
        frames = drop_stray_islands(frames)
    box = square_crop_box(frames, margin) if square else rect_crop_box(frames, margin)
    bw, bh = box[2] - box[0], box[3] - box[1]
    if cell_h is None:
        cell_h = cell_w if square else max(1, int(round(cell_w * bh / bw)))
    cells = []
    for f in frames:
        c = crop_to_canvas(f, box).resize((cell_w, cell_h), Image.LANCZOS)
        cells.append(apply_falloff(c) if falloff else c)
    sheet = pack_sheet(cells, cols, rows, cell_w, cell_h)
    return sheet, cells, box


def save_sheet(sheet, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    sheet.save(dest, "WEBP", quality=90, method=6)
    return os.path.getsize(dest) // 1024


def main():
    test = "--test" in sys.argv
    overrides = dict(a.split("=", 1) for a in sys.argv[1:] if "=" in a)
    only = [a for a in sys.argv[1:] if a != "--test" and "=" not in a]

    if test:
        sym_out = os.path.join(TEST_OUT, "symbols")
        av_out = os.path.join(TEST_OUT, "avatar")
        fx_out = os.path.join(TEST_OUT, "particles")
    else:
        sym_out = os.path.join(STATIC, "symbols")
        av_out = os.path.join(STATIC, "avatar")
        fx_out = os.path.join(STATIC, "particles")

    # previous manifest (preserve entries for clips that haven't rendered yet)
    prev = {}
    if os.path.exists(MANIFEST):
        try:
            with open(MANIFEST, "r", encoding="utf-8") as fh:
                prev = json.load(fh)
        except Exception as e:
            print(f"WARN: could not parse existing manifest ({e}); starting fresh")
    manifest = {"symbols": dict(prev.get("symbols", {}))}
    warnings = []

    def src(label):
        return overrides.get(label, render_path(label))

    def selected(label):
        return not only or label in only

    # ---- symbols: 24 frames, 6x4 @ 320 square -------------------------------
    for sym in SYMBOLS:
        key = sym.upper()
        if not selected(sym):
            continue
        path = src(sym)
        if not os.path.exists(path):
            warnings.append(f"{sym}: MISSING render {path} — skipped")
            if key not in manifest["symbols"]:
                manifest["symbols"][key] = {
                    "key": f"win{key}", "cols": 6, "rows": 4, "frames": 24,
                    "drawScale": FALLBACK_DRAWSCALE,
                }
                warnings.append(f"{sym}: no previous manifest entry — wrote fallback drawScale {FALLBACK_DRAWSCALE}")
            continue
        sheet, cells, box = bake_clip(path, 24, 6, 4, 320, square=True, margin=0.10)
        kb = save_sheet(sheet, os.path.join(sym_out, f"{sym}_win.webp"))
        # drawScale: match flipbook frame-0 content size to the static atlas art
        r_s = static_content_fraction(sym)
        r_f = content_fraction(np.array(cells[0]), ALPHA_CONTENT)
        if r_s and r_f:
            draw_scale = round(r_s / r_f, 3)
        else:
            draw_scale = manifest["symbols"].get(key, {}).get("drawScale", FALLBACK_DRAWSCALE)
            warnings.append(f"{sym}: could not measure drawScale (static={r_s}, flip={r_f}) — using {draw_scale}")
        manifest["symbols"][key] = {
            "key": f"win{key}", "cols": 6, "rows": 4, "frames": 24, "drawScale": draw_scale,
        }
        print(f"{sym}: 24f crop={box} sheet={sheet.size[0]}x{sheet.size[1]} {kb}KB drawScale={draw_scale}")

    # ---- avatar --------------------------------------------------------------
    for label, name, n, cols, rows, mkey in [
        ("avatar-idle", "avatar_idle", 40, 8, 5, "avatarIdle"),
        ("avatar-cheer", "avatar_cheer", 24, 6, 4, "avatarCheer"),
    ]:
        entry_key = "avatarIdleSheet" if mkey == "avatarIdle" else "avatarCheerSheet"
        manifest[mkey] = prev.get(mkey, {"key": entry_key, "cols": cols, "rows": rows, "frames": n})
        if not selected(label):
            continue
        path = src(label)
        if not os.path.exists(path):
            warnings.append(f"{label}: MISSING render {path} — skipped")
            continue
        sheet, _, box = bake_clip(path, n, cols, rows, 400, square=False, margin=0.02, falloff=False)
        kb = save_sheet(sheet, os.path.join(av_out, f"{name}.webp"))
        manifest[mkey] = {"key": entry_key, "cols": cols, "rows": rows, "frames": n}
        print(f"{label}: {n}f crop={box} sheet={sheet.size[0]}x{sheet.size[1]} {kb}KB")

    # ---- fx-inkburst: 16 frames, 4x4 @ 320 (black bg) -------------------------
    manifest["inkBurst"] = prev.get(
        "inkBurst", {"key": "fxInkBurst", "cols": 4, "rows": 4, "frames": 16})
    if selected("fx-inkburst"):
        path = src("fx-inkburst")
        if not os.path.exists(path):
            warnings.append(f"fx-inkburst: MISSING render {path} — skipped")
        else:
            # trim the tail — the ink dissipation devolves to smoke; keep the splash
            sheet, _, box = bake_clip(path, 16, 4, 4, 320, square=True, margin=0.06, end_frac=0.55)
            kb = save_sheet(sheet, os.path.join(fx_out, "fx_ink_burst.webp"))
            manifest["inkBurst"] = {"key": "fxInkBurst", "cols": 4, "rows": 4, "frames": 16}
            print(f"fx-inkburst: 16f crop={box} sheet={sheet.size[0]}x{sheet.size[1]} {kb}KB")

    if test:
        print("test mode: manifest NOT written")
    else:
        os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
        with open(MANIFEST, "w", encoding="utf-8") as fh:
            json.dump(manifest, fh, indent=2)
            fh.write("\n")
        print(f"manifest -> {MANIFEST}")

    for w in warnings:
        print(f"WARN: {w}")
    print("done")


if __name__ == "__main__":
    main()
