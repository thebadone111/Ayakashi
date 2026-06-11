"""Convert oversized standalone-sprite PNGs to WebP to cut load time.

Only touches `type: 'sprite'` assets (single image, referenced directly in
assets.ts) — NOT atlas/spritesheet images, whose .json meta.image still points
at the .png. Run from web-sdk/apps/lines:

    ../../../math-sdk/env/Scripts/python.exe optimize-assets.py [--write] [--delete-png]

Without --write it's a dry run (reports projected savings only).
"""
import os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SPR = os.path.join(HERE, "static", "assets", "sprites")

# standalone single-image sprites (type: 'sprite') — safe to swap png->webp
TARGETS = [
    "reelsFrame/reel_frame.png",
    "reelsFrame/frame_bg1.png",
    "reelsFrame/Frame_FSCounter2.png",
    "background/bg_bg.png",
    "background/bg_fg.png",
    "background/bg_effect.png",
    "background/bg_mist.png",
    "avatar/avatar.png",
    "payFrame/payFrame.png",
]

QUALITY = 90
write = "--write" in sys.argv
delete_png = "--delete-png" in sys.argv

total_before = total_after = 0
for rel in TARGETS:
    png = os.path.join(SPR, rel)
    if not os.path.exists(png):
        print(f"  MISSING {rel}")
        continue
    im = Image.open(png)
    before = os.path.getsize(png)
    webp = os.path.splitext(png)[0] + ".webp"
    # method=6 = slowest/best compression; quality 90 keeps gradients clean
    im.save(webp, "WEBP", quality=QUALITY, method=6)
    after = os.path.getsize(webp)
    total_before += before
    total_after += after
    print(f"  {rel:42s} {im.size!s:12s} {before//1024:5d}KB -> {after//1024:5d}KB  ({100*after//before:3d}%)")
    if not write:
        os.remove(webp)
    elif delete_png:
        os.remove(png)

print(f"\nTOTAL: {total_before//1024}KB -> {total_after//1024}KB"
      f"  (saved {(total_before-total_after)//1024}KB, {100*(total_before-total_after)//max(total_before,1)}%)")
if not write:
    print("(dry run — pass --write to emit .webp, --delete-png to also remove the source PNGs)")
