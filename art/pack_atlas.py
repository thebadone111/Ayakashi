"""
Pack art/generated/symbols-2026-06-26/_atlas/*.png into a single sprite-sheet
consumable by Pixi via the existing symbolsStatic.json contract.

Layout: 4 columns x 4 rows of CELL_SIZE square tiles -> 2048x2048 sheet at
CELL_SIZE=512. Safe on every mobile GPU (>= 4096 max texture size everywhere)
with ~2.6x oversample over the 80 px render size.

Drop-in: the JSON frame keys match the SYMBOL_INFO_MAP entries in
web-sdk/apps/lines/src/game/constants.ts (h1.webp..h5.webp, l1..l5, w.png,
s.png, x.png, x2.png). The atlas source PNGs use the new mask naming
(h1..h5, l1..l5, w, s, m, x); we rename m -> x.png and x -> x2.png so the
frontend constants don't need to move.

Re-run whenever the atlas source PNGs change (e.g. after Max hand-cuts the
indigo backdrop to alpha).
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ART_ROOT = Path(__file__).parent
SRC_DIR = ART_ROOT / "generated/symbols-2026-06-26/_atlas"
OUT_DIR = ART_ROOT.parent / "web-sdk/apps/lines/static/assets/sprites/symbolsStatic"
SHEET_NAME = "symbolsStatic.webp"
JSON_NAME = "symbolsStatic.json"

CELL_SIZE = 512
COLS = 4
ROWS = 4
GUTTER = 2  # 1 px transparent gutter to stop bleed at the cell edge

# Source filename -> frame key in symbolsStatic.json
# Frame keys MUST match SYMBOL_INFO_MAP asset keys.
TILE_MAP = [
    ("h1.png", "h1.webp"),
    ("h2.png", "h2.webp"),
    ("h3.png", "h3.webp"),
    ("h4.png", "h4.webp"),
    ("h5.png", "h5.webp"),
    ("l1.png", "l1.webp"),
    ("l2.png", "l2.webp"),
    ("l3.png", "l3.webp"),
    ("l4.png", "l4.webp"),
    ("l5.png", "l5.webp"),
    ("w.png",  "w.png"),
    ("s.png",  "s.png"),
    ("x.png",  "x2.png"),   # oni kanabo exploder
    ("m.png",  "x.png"),    # ofuda multiplier
]


def picked_source(name: str) -> Path:
    """Prefer the hand-cut `<name>-nobg.png` when present, else the raw PNG."""
    stem = Path(name).stem
    cut = SRC_DIR / f"{stem}-nobg.png"
    if cut.exists():
        return cut
    return SRC_DIR / name


def pack() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sheet_w = COLS * CELL_SIZE + (COLS + 1) * GUTTER
    sheet_h = ROWS * CELL_SIZE + (ROWS + 1) * GUTTER
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

    frames: dict[str, dict] = {}
    for i, (src_name, frame_key) in enumerate(TILE_MAP):
        src = picked_source(src_name)
        if not src.exists():
            raise FileNotFoundError(f"Atlas tile missing: {src}")
        col = i % COLS
        row = i // COLS
        x = GUTTER + col * (CELL_SIZE + GUTTER)
        y = GUTTER + row * (CELL_SIZE + GUTTER)

        tile = Image.open(src)
        # Keep transparency if present (Max's hand-cut washi roundel will be
        # RGBA); upstream RGB tiles (indigo backdrop baked in) paste cleanly
        # onto the RGBA sheet too.
        if tile.mode != "RGBA":
            tile = tile.convert("RGBA")
        if tile.size != (CELL_SIZE, CELL_SIZE):
            tile = tile.resize((CELL_SIZE, CELL_SIZE), Image.Resampling.LANCZOS)

        sheet.paste(tile, (x, y), tile)

        frames[frame_key] = {
            "frame":            {"x": x, "y": y, "w": CELL_SIZE, "h": CELL_SIZE},
            "rotated":          False,
            "trimmed":          False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": CELL_SIZE, "h": CELL_SIZE},
            "sourceSize":       {"w": CELL_SIZE, "h": CELL_SIZE},
            "pivot":            {"x": 0.5, "y": 0.5},
        }

    sheet_path = OUT_DIR / SHEET_NAME
    sheet.save(sheet_path, format="WEBP", quality=92, method=6)

    atlas = {
        "frames": frames,
        "meta": {
            "app":     "art/pack_atlas.py",
            "version": "1.0",
            "image":   SHEET_NAME,
            "format":  "RGBA8888",
            "size":    {"w": sheet_w, "h": sheet_h},
            "scale":   "1",
        },
    }
    (OUT_DIR / JSON_NAME).write_text(json.dumps(atlas, indent=2))

    print(f"packed {len(TILE_MAP)} tiles -> {sheet_path}")
    print(f"sheet  {sheet_w}x{sheet_h}  {sheet_path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    pack()
