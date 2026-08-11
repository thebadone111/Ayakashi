"""Build a 24-frame spinning-coin spritesheet from the generated yen coin,
replacing the reference SD2_Coin sheet (files now named ayakashi_coin.*) (same frame names, sourceSize 684 and
meta scale "2", so WinCoins/ParticleEmitter need no code changes).

Spin model: horizontal squash through cos(theta) = a coin turning about its
vertical axis. Back face = mirrored front. Near edge-on, a bronze ellipse
fakes the coin's thickness. Brightness eases down as the face turns away.

Run from web-sdk/apps/lines:
    ../../../math-sdk/env/Scripts/python.exe build-coin-sheet.py
"""
import json, math, os
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated\coins\jp_coin__00001_.png"
OUT_DIR = os.path.join(HERE, "static", "assets", "sprites", "coin")

FRAME = 684          # source frame size (matches old sheet sourceSize)
COIN_D = 620         # coin diameter inside the frame
N_FRAMES = 24
COLS, ROWS = 6, 4
EDGE_COLOR = (148, 110, 62)       # aged bronze rim/side
EDGE_DARK = (96, 70, 40)

# ── 1. face: circular-mask the black background away ──────────────────────────
src = Image.open(SRC).convert("RGB")
w, h = src.size
lum = np.asarray(src.convert("L"))
ys, xs = np.where(lum > 22)
cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
r = max(xs.max() - xs.min(), ys.max() - ys.min()) / 2 * 0.995
print(f"coin disc: center=({cx:.0f},{cy:.0f}) r={r:.0f} of {src.size}")

# antialiased circular alpha (4x supersampled mask)
mask = Image.new("L", (w * 2, h * 2), 0)
ImageDraw.Draw(mask).ellipse(
    [2 * (cx - r), 2 * (cy - r), 2 * (cx + r), 2 * (cy + r)], fill=255
)
mask = mask.resize((w, h), Image.LANCZOS)
face = src.convert("RGBA")
face.putalpha(mask)
face = face.crop((int(cx - r), int(cy - r), int(cx + r), int(cy + r))).resize(
    (COIN_D, COIN_D), Image.LANCZOS
)

# ── 2. render the 24 spin frames ───────────────────────────────────────────────
def render_frame(i: int) -> Image.Image:
    theta = 2 * math.pi * i / N_FRAMES
    sx = math.cos(theta)
    img = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))

    half_w = max(int(COIN_D * abs(sx) / 2), 3)
    # thickness ellipse behind the face — grows as the coin goes edge-on
    thick = int(COIN_D * 0.045 * (1 - abs(sx)) + 4)
    d = ImageDraw.Draw(img)
    d.ellipse(
        [FRAME // 2 - half_w - thick, FRAME // 2 - COIN_D // 2,
         FRAME // 2 + half_w + thick, FRAME // 2 + COIN_D // 2],
        fill=EDGE_DARK if sx < 0 else EDGE_COLOR,
    )

    if abs(sx) > 0.06:
        f = face.transpose(Image.FLIP_LEFT_RIGHT) if sx < 0 else face
        f = f.resize((half_w * 2, COIN_D), Image.LANCZOS)
        # light follows the face: full-on bright, edge-on dim
        f = ImageEnhance.Brightness(f).enhance(0.72 + 0.28 * abs(sx))
        img.alpha_composite(f, (FRAME // 2 - half_w, FRAME // 2 - COIN_D // 2))
    return img

frames = [render_frame(i) for i in range(N_FRAMES)]

# ── 3. pack grid sheet + json ──────────────────────────────────────────────────
sheet = Image.new("RGBA", (COLS * FRAME, ROWS * FRAME), (0, 0, 0, 0))
entries = {}
for i, fr in enumerate(frames):
    x, y = (i % COLS) * FRAME, (i // COLS) * FRAME
    sheet.alpha_composite(fr, (x, y))
    entries[f"{i + 1}.png"] = {
        "frame": {"x": x, "y": y, "w": FRAME, "h": FRAME},
        "rotated": False,
        "trimmed": False,
        "spriteSourceSize": {"x": 0, "y": 0, "w": FRAME, "h": FRAME},
        "sourceSize": {"w": FRAME, "h": FRAME},
    }

sheet.save(os.path.join(OUT_DIR, "ayakashi_coin.webp"), "WEBP", quality=90, method=6)
old_png = os.path.join(OUT_DIR, "ayakashi_coin.png")
if os.path.exists(old_png):
    os.remove(old_png)
data = {
    "frames": entries,
    "meta": {
        "app": "ayakashi build-coin-sheet.py",
        "version": "1.0",
        "image": "ayakashi_coin.webp",
        "format": "RGBA8888",
        "size": {"w": COLS * FRAME, "h": ROWS * FRAME},
        "scale": "2",
    },
}
with open(os.path.join(OUT_DIR, "ayakashi_coin.json"), "w") as fh:
    json.dump(data, fh, indent=1)

print(f"sheet: {COLS * FRAME}x{ROWS * FRAME}  "
      f"{os.path.getsize(os.path.join(OUT_DIR, 'ayakashi_coin.webp')) // 1024}KB webp, {N_FRAMES} frames")
