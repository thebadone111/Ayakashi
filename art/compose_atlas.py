"""Compose the final Ayakashi 14-symbol atlas from picked sources.

Inputs:
  art/generated/symbols-2026-06-26/_picked/h1.png … h5.png   (yokai masks)
  art/generated/symbols-2026-06-26/_picked/washi.png         (paper backdrop)
  art/generated/symbols-2026-06-26/_picked/{w,s,m,x}.png     (object emblems)
  art/fonts/YujiSyuku-Regular.ttf                            (brush kanji)

Outputs:
  art/generated/symbols-2026-06-26/_atlas/{h1-5, l1-5, w, s, m, x}.png
  art/generated/symbols-2026-06-26/_atlas/_grid.jpg           (3-row preview)

Composition by symbol kind:
  highs (h1-h5):   deep indigo bg + cyan foxfire halo glow + washi roundel
                    + the yokai mask on top
  lows  (l1-l5):   deep indigo bg + washi paper square + a single classical-
                    element kanji (火 水 木 金 土) rendered through Yuji
                    Syuku in seal gold, multiply-blended into the paper
  wild w / scatter s / multiplier m / exploder x:
                    pass through with backgrounds knocked out via simple
                    distance-from-indigo cut (per memory/bg-removal-manual:
                    "trivially easy" carve-out for uniform-bg sources;
                    Max can hand-touch the foxfire halo edges if needed)

All 14 tiles output at 1024×1024 RGB so they pack into a single atlas.
"""
import os
import sys
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
from PIL import Image, ImageDraw, ImageFont
import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.join(REPO, "art", "generated", "symbols-2026-06-26")
PICKED = os.path.join(ROOT, "_picked")
ATLAS = os.path.join(ROOT, "_atlas")
FONT_PATH = os.path.join(REPO, "art", "fonts", "YujiSyuku-Regular.ttf")

os.makedirs(ATLAS, exist_ok=True)

# Palette anchors from STYLE_GUIDE.md §3
SIZE = 1024
INDIGO = (26, 31, 58)          # deep indigo bg
CYAN = (127, 217, 255)         # foxfire core
GOLD = (199, 144, 43)          # seal gold

# Layout
HALO_RADIUS = 480              # cyan glow falloff
ROUNDEL_RADIUS = 400           # washi disc radius
MASK_FILL = 0.78               # mask covers 78% of canvas width
KANJI_SIZE = 620               # kanji em size on the lows


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def picked_source(sym: str) -> str:
    """Prefer Max's hand-cut <sym>-nobg.png; fall back to the raw <sym>.png.

    Auto-cut was removed 2026-06-27 — per memory/bg-removal-manual, Max
    cuts backgrounds himself unless trivially easy. The auto distance-
    from-indigo cut chewed up dark shafts (kanabo) and missed translucent
    halos (h1 foxfire), so this script now trusts the alpha that's there.
    """
    nobg = os.path.join(PICKED, f"{sym}-nobg.png")
    raw = os.path.join(PICKED, f"{sym}.png")
    return nobg if os.path.exists(nobg) else raw


def make_indigo_canvas() -> Image.Image:
    return Image.new("RGBA", (SIZE, SIZE), INDIGO + (255,))


def make_foxfire_halo() -> Image.Image:
    """Radial cyan glow centered. Squared falloff for a softer edge."""
    yy, xx = np.mgrid[:SIZE, :SIZE]
    cx, cy = SIZE / 2, SIZE / 2
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    a = np.clip(1.0 - r / HALO_RADIUS, 0, 1) ** 2
    a = (a * 255 * 0.65).astype(np.uint8)
    arr = np.zeros((SIZE, SIZE, 4), dtype=np.uint8)
    arr[..., 0], arr[..., 1], arr[..., 2] = CYAN
    arr[..., 3] = a
    return Image.fromarray(arr, "RGBA")


def make_washi_roundel(washi_im: Image.Image, radius=ROUNDEL_RADIUS) -> Image.Image:
    """Crop the washi paper to a centered circular roundel."""
    washi = washi_im.copy().convert("RGBA")
    # Resize so the paper just covers the roundel
    target = int(radius * 2.2)
    washi.thumbnail((target, target), Image.LANCZOS)
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    canvas.paste(washi, ((SIZE - washi.width) // 2, (SIZE - washi.height) // 2))
    # Apply circular alpha mask
    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).ellipse(
        [SIZE / 2 - radius, SIZE / 2 - radius,
         SIZE / 2 + radius, SIZE / 2 + radius],
        fill=255,
    )
    # Combine with the washi's own alpha
    existing = canvas.getchannel("A")
    canvas.putalpha(Image.eval(Image.merge("L", (
        Image.eval(mask, lambda v: v),
    )), lambda v: v))  # noqa: simplified
    out = Image.composite(canvas, Image.new("RGBA", canvas.size), mask)
    return out


# ---------------------------------------------------------------------------
# Composers
# ---------------------------------------------------------------------------

def compose_high(mask_path: str, washi_im: Image.Image) -> Image.Image:
    canvas = make_indigo_canvas()
    canvas.alpha_composite(make_foxfire_halo())
    canvas.alpha_composite(make_washi_roundel(washi_im))
    mask_im = Image.open(mask_path).convert("RGBA")
    target_w = int(SIZE * MASK_FILL)
    ratio = target_w / mask_im.width
    new_h = int(mask_im.height * ratio)
    mask_im = mask_im.resize((target_w, new_h), Image.LANCZOS)
    canvas.alpha_composite(
        mask_im,
        ((SIZE - mask_im.width) // 2, (SIZE - mask_im.height) // 2),
    )
    return canvas


def compose_low(kanji: str, washi_im: Image.Image) -> Image.Image:
    canvas = make_indigo_canvas()
    canvas.alpha_composite(make_washi_roundel(washi_im, radius=ROUNDEL_RADIUS + 20))
    font = ImageFont.truetype(FONT_PATH, size=KANJI_SIZE)
    txt = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(txt)
    bbox = d.textbbox((0, 0), kanji, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (SIZE - tw) // 2 - bbox[0]
    ty = (SIZE - th) // 2 - bbox[1]
    d.text((tx, ty), kanji, font=font, fill=GOLD + (250,))
    canvas.alpha_composite(txt)
    return canvas


def compose_special(path: str) -> Image.Image:
    """Object emblem — resize and center over indigo. Source is expected
    to already have the background cut (Max hand-cuts; see picked_source)."""
    im = Image.open(path).convert("RGBA")
    im.thumbnail((SIZE, SIZE), Image.LANCZOS)
    canvas = make_indigo_canvas()
    canvas.alpha_composite(
        im,
        ((SIZE - im.width) // 2, (SIZE - im.height) // 2),
    )
    return canvas


# ---------------------------------------------------------------------------
# Atlas grid preview
# ---------------------------------------------------------------------------

def build_grid_preview():
    rows = [
        ["h1", "h2", "h3", "h4", "h5"],
        ["l1", "l2", "l3", "l4", "l5"],
        ["w",  "s",  "m",  "x",  None],
    ]
    tile = 360
    pad = 8
    label_h = 28
    grid_w = 5 * tile + 6 * pad
    grid_h = 3 * (tile + label_h + pad) + pad
    sheet = Image.new("RGB", (grid_w, grid_h), (12, 14, 22))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("arial.ttf", 18)
    except IOError:
        font = ImageFont.load_default()
    for r, row in enumerate(rows):
        for c, sym in enumerate(row):
            x = pad + c * (tile + pad)
            y = pad + r * (tile + label_h + pad)
            if sym is None:
                continue
            draw.text((x + 4, y + 4), sym, fill=(220, 220, 230), font=font)
            path = os.path.join(ATLAS, f"{sym}.png")
            if not os.path.exists(path):
                continue
            im = Image.open(path).convert("RGB")
            im.thumbnail((tile, tile), Image.LANCZOS)
            sheet.paste(im, (x + (tile - im.width) // 2,
                             y + label_h + (tile - im.height) // 2))
    out = os.path.join(ATLAS, "_grid.jpg")
    sheet.save(out, "JPEG", quality=92)
    print(f"grid preview → {out}  ({sheet.size})")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    washi_im = Image.open(picked_source("washi")).convert("RGBA")

    for sym in ("h1", "h2", "h3", "h4", "h5"):
        src = picked_source(sym)
        if not os.path.exists(src):
            print(f"skip {sym}: no picked source"); continue
        out = compose_high(src, washi_im).convert("RGB")
        dst = os.path.join(ATLAS, f"{sym}.png")
        out.save(dst, "PNG")
        print(f"high  {sym} <- {os.path.basename(src)}")

    for sym, kanji in (("l1", "火"), ("l2", "水"), ("l3", "木"),
                       ("l4", "金"), ("l5", "土")):
        out = compose_low(kanji, washi_im).convert("RGB")
        dst = os.path.join(ATLAS, f"{sym}.png")
        out.save(dst, "PNG")
        print(f"low   {sym} <- font  ({kanji})")

    for sym in ("w", "s", "m", "x"):
        src = picked_source(sym)
        if not os.path.exists(src):
            print(f"skip {sym}: no picked source"); continue
        out = compose_special(src).convert("RGB")
        dst = os.path.join(ATLAS, f"{sym}.png")
        out.save(dst, "PNG")
        print(f"spec  {sym} <- {os.path.basename(src)}")

    build_grid_preview()


if __name__ == "__main__":
    main()
