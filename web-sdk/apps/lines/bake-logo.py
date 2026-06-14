"""Bake the Ayakashi logo to a transparent PNG/webp using the real brush fonts.

PIXI rasterises SVG via <img>, which CANNOT apply web @font-face — so SVG-text
logos silently fall back. Baking with PIL guarantees the NinjaKage brush face.

Title  : NinjaKage (dramatic sword-brush), gold with dark outline + drop shadow
Kanji  : 妖かし in full Yuji Syuku (has kanji glyphs), gold
Tagline: DARK · YOKAI · SLOTS in NinjaKage, dim gold

Run: ../../../math-sdk/env/Scripts/python.exe bake-logo.py  (or system python)
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
# Working font sources live in art/fonts/ (NOT static/ — static ships verbatim in
# the build, and these include personal-use demo faces that must not be shipped).
ART_FONTS = os.path.abspath(os.path.join(HERE, "../../../art/fonts"))
NINJA = os.path.join(ART_FONTS, "brush/ninjakage/NinjaKageDemo-Regular.otf")
YUJI = os.path.join(ART_FONTS, "YujiSyuku-Regular.ttf")
OUT = os.path.join(HERE, "static/assets/sprites/logo/ayakashi_logo.webp")

S = 2  # supersample
W, H = 690 * S, 300 * S
GOLD = (255, 209, 64)
GOLD_DIM = (200, 150, 30)
DARK = (40, 6, 6)
CRIMSON = (150, 0, 0)

img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)


def centered(text, font, cy, fill, stroke=0, stroke_fill=DARK, ls=0):
    # measure (with optional letter-spacing)
    if ls:
        widths = [d.textlength(ch, font=font) for ch in text]
        total = sum(widths) + ls * (len(text) - 1)
        x = (W - total) / 2
        bb = font.getbbox("Ay")
        h = bb[3] - bb[1]
        for ch, w in zip(text, widths):
            d.text((x, cy - h / 2), ch, font=font, fill=fill,
                   stroke_width=stroke, stroke_fill=stroke_fill)
            x += w + ls
        return
    bb = d.textbbox((0, 0), text, font=font, stroke_width=stroke)
    w = bb[2] - bb[0]; h = bb[3] - bb[1]
    d.text((W / 2 - w / 2 - bb[0], cy - h / 2 - bb[1]), text, font=font, fill=fill,
           stroke_width=stroke, stroke_fill=stroke_fill)


# auto-fit the title to the available width so AYAKASHI never overflows
TARGET_W = (W - 90 * S)
TITLE = "AYAKASHI"
size = 130 * S
probe = ImageFont.truetype(NINJA, size)
w = d.textlength(TITLE, font=probe)
size = int(size * TARGET_W / w)
title_f = ImageFont.truetype(NINJA, size)
kanji_f = ImageFont.truetype(YUJI, 42 * S)
tag_f = ImageFont.truetype(NINJA, 20 * S)

# --- drop shadow for the title (blurred dark copy) ---
shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
bb = sd.textbbox((0, 0), "AYAKASHI", font=title_f, stroke_width=2 * S)
tw = bb[2] - bb[0]; th = bb[3] - bb[1]
sd.text((W / 2 - tw / 2 - bb[0] + 5 * S, 108 * S - th / 2 - bb[1] + 6 * S), "AYAKASHI",
        font=title_f, fill=(0, 0, 0, 220), stroke_width=2 * S, stroke_fill=(0, 0, 0, 220))
shadow = shadow.filter(ImageFilter.GaussianBlur(5 * S))
img = Image.alpha_composite(img, shadow)
d = ImageDraw.Draw(img)

# --- title: dark crimson outline + gold fill ---
centered("AYAKASHI", title_f, 108 * S, GOLD, stroke=3 * S, stroke_fill=CRIMSON)

# --- divider diamonds ---
cy = 188 * S
for dx, col, r in [(-150, CRIMSON, 8), (-60, GOLD_DIM, 9), (60, GOLD_DIM, 9), (150, CRIMSON, 8)]:
    cx = W / 2 + dx * S
    d.polygon([(cx, cy - r * S), (cx + r * S, cy), (cx, cy + r * S), (cx - r * S, cy)], fill=col)
d.line([(40 * S, cy), (W / 2 - 175 * S, cy)], fill=(107, 0, 0), width=2)
d.line([(W / 2 + 175 * S, cy), (W - 40 * S, cy)], fill=(107, 0, 0), width=2)

# --- kanji subtitle ---
centered("妖 か し", kanji_f, 230 * S, (212, 160, 23), ls=10 * S)

# --- tagline ---
centered("DARK   YOKAI   SLOTS", tag_f, 275 * S, (150, 20, 20))

img = img.resize((690, 300), Image.LANCZOS)
img.save(OUT, "WEBP", quality=95, method=6)
print(f"saved {OUT}  ({os.path.getsize(OUT)//1024}KB)")
