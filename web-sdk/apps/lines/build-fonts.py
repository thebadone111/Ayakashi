"""Regenerate the four bitmap fonts in a kanji-brush style (Yuji Syuku),
replacing the reference mining fonts. Same face names, filenames and rough
metrics, so no code changes anywhere.

  gold     105px  win amounts / labels      gold gradient + maroon outline
  silver    97px  UI labels / bet amounts   silver gradient + ink outline
  purple   177px  freespin counter digits   violet gradient + plum outline
  goldblur 376px  glow underlay digits      gold, heavy gaussian blur

Glyphs missing from Yuji Syuku (rare currency marks) fall back to DejaVuSans.

Run from web-sdk/apps/lines:
    ../../../math-sdk/env/Scripts/python.exe build-fonts.py
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "static", "assets", "fonts")
BRUSH_TTF = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\fonts\YujiSyuku-Regular.ttf"
import matplotlib
FALLBACK_TTF = os.path.join(os.path.dirname(matplotlib.__file__), "mpl-data", "fonts", "ttf", "DejaVuSans.ttf")

TEXT_CHARS = (" !\"#$%&'()*+,-./0123456789:;=?@"
              "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
              "¥×ł£₩₫€₱₹₺₽")
DIGIT_CHARS = " 0123456789X×"

brush_cmap = {cp for t in TTFont(BRUSH_TTF)["cmap"].tables for cp in t.cmap}  # codepoints

def gradient_column(h, stops):
    """Vertical RGB gradient through (pos 0..1, (r,g,b)) stops."""
    col = np.zeros((h, 3), np.float32)
    for i in range(h):
        p = i / max(h - 1, 1)
        for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
            if p0 <= p <= p1:
                f = (p - p0) / (p1 - p0 or 1)
                col[i] = [c0[j] + (c1[j] - c0[j]) * f for j in range(3)]
                break
    return col

STYLES = {
    "gold": {
        "stops": [(0.0, (252, 238, 178)), (0.45, (236, 188, 80)), (0.75, (190, 120, 28)), (1.0, (130, 78, 16))],
        "outline": (58, 22, 8),
    },
    "silver": {
        "stops": [(0.0, (255, 255, 255)), (0.5, (208, 218, 230)), (1.0, (110, 122, 140))],
        "outline": (24, 30, 42),
    },
    "purple": {
        "stops": [(0.0, (240, 206, 255)), (0.5, (178, 96, 240)), (1.0, (96, 28, 150))],
        "outline": (40, 8, 66),
    },
}

def pick_font(ch, size):
    path = BRUSH_TTF if ord(ch) in brush_cmap else FALLBACK_TTF
    return ImageFont.truetype(path, size)

def render_glyph(ch, size, stops, outline, blur=0):
    sw = max(2, round(size * 0.045)) if outline else 0
    pad = sw + (blur * 3) + 4
    font = pick_font(ch, size)
    probe = ImageDraw.Draw(Image.new("L", (1, 1)))
    adv = probe.textlength(ch, font=font)
    W, H = int(size * 2.2 + pad * 2), int(size * 1.9 + pad * 2)

    rgba = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(rgba)
    if outline:
        oc = (*outline, 255)
        d.text((pad, pad), ch, font=font, fill=oc, stroke_width=sw, stroke_fill=oc)

    # gradient-filled body composited through the fill mask
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).text((pad, pad), ch, font=font, fill=255)
    m = np.asarray(mask, np.float32) / 255.0
    bbox_m = mask.getbbox()
    body = np.zeros((H, W, 4), np.float32)
    if bbox_m:
        top, bot = bbox_m[1], bbox_m[3]
        col = gradient_column(bot - top, stops)
        grad = np.zeros((H, W, 3), np.float32)
        grad[top:bot, :] = col[:, None, :]
        body[..., :3] = grad
        body[..., 3] = m * 255
    body_img = Image.fromarray(body.astype(np.uint8))
    rgba.alpha_composite(body_img)

    if blur:
        rgba = rgba.filter(ImageFilter.GaussianBlur(blur))

    bbox = rgba.getbbox()
    if bbox is None:  # space
        return None, 0, 0, round(adv)
    glyph = rgba.crop(bbox)
    return glyph, bbox[0] - pad, bbox[1] - pad, round(adv)

def build(face, xml_name, page_name, folder, chars, size, style_key, blur=0):
    style = STYLES[style_key]
    ascent, descent = pick_font("A", size).getmetrics()
    line_h, base = ascent + descent, ascent

    glyphs = {}
    for ch in chars:
        img, xoff, yoff, adv = render_glyph(ch, size, style["stops"],
                                            None if blur else style["outline"], blur)
        glyphs[ch] = (img, xoff, yoff, adv)

    # shelf-pack into an atlas, max row width 2048
    max_w, x, y, row_h, places = 2048, 0, 0, 0, {}
    for ch, (img, *_rest) in glyphs.items():
        w, h = (img.size if img else (1, 1))
        if x + w + 2 > max_w:
            x, y, row_h = 0, y + row_h + 2, 0
        places[ch] = (x, y)
        x += w + 2
        row_h = max(row_h, h)
    atlas_w = max_w if y > 0 else x
    atlas_h = y + row_h + 2

    atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    rows = []
    for ch, (img, xoff, yoff, adv) in glyphs.items():
        px, py = places[ch]
        w, h = (img.size if img else (1, 1))
        if img:
            atlas.alpha_composite(img, (px, py))
        rows.append(
            f'    <char id="{ord(ch)}" x="{px}" y="{py}" width="{w}" height="{h}" '
            f'xoffset="{xoff}" yoffset="{yoff}" xadvance="{adv}" page="0" chnl="15"/>'
        )

    out_dir = os.path.join(FONTS, folder)
    atlas.save(os.path.join(out_dir, page_name), "WEBP", lossless=True)
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n<font>\n'
        f'  <info face="{face}" size="{size}" bold="0" italic="0" charset="" unicode="" '
        f'stretchH="{size}" smooth="1" aa="1" padding="0,0,0,0" spacing="1,0" outline="0"/>\n'
        f'  <common lineHeight="{line_h}" base="{base}" scaleW="{atlas_w}" scaleH="{atlas_h}" pages="1" packed="0"/>\n'
        '  <pages>\n'
        f'    <page id="0" file="{page_name}"/>\n'
        '  </pages>\n'
        f'  <chars count="{len(rows)}">\n' + "\n".join(rows) + "\n  </chars>\n</font>\n"
    )
    with open(os.path.join(out_dir, xml_name), "w", encoding="utf-8") as fh:
        fh.write(xml)
    kb = os.path.getsize(os.path.join(out_dir, page_name)) // 1024
    print(f"{face:9s} {len(rows):3d} glyphs  atlas {atlas_w}x{atlas_h}  {kb}KB")

build("gold", "mm_gold.xml", "mm_gold.webp", "goldFont", TEXT_CHARS, 105, "gold")
build("silver", "mm_silver.xml", "mm_silver.webp", "silverFont", TEXT_CHARS, 97, "silver")
build("purple", "mm_purple.xml", "mm_purple.webp", "purpleFont", DIGIT_CHARS, 177, "purple")
build("goldblur", "miningfont_gold_blur.xml", "miningfont_gold_blur.webp", "goldBlur",
      DIGIT_CHARS, 376, "gold", blur=14)
