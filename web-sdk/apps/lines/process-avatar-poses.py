"""Place the chosen avatar pose variants into the sprite folder as webp.

img2img output is already full-colour on a dark bg matching the base avatar,
so no alpha work — just convert the pick to webp at the avatar's native size.
Edit PICKS after reviewing candidates.

Run: ../../../math-sdk/env/Scripts/python.exe process-avatar-poses.py
"""
import os
from PIL import Image

GEN = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "static", "assets", "sprites", "avatar")

# job-dir: (chosen filename, out-name)
PICKS = {
    "avatar-cheer": ("avatar-cheer__00001_.png", "avatar_cheer"),
    "avatar-wink":  ("avatar-wink__00001_.png", "avatar_wink"),
}

for job, (fn, out_name) in PICKS.items():
    path = os.path.join(GEN, job, fn)
    if not os.path.exists(path):
        print(f"SKIP {job}: {fn} missing")
        continue
    im = Image.open(path).convert("RGBA")
    dest = os.path.join(OUT, f"{out_name}.webp")
    im.save(dest, "WEBP", quality=90, method=6)
    print(f"{job:14s} -> {out_name}.webp  {im.size}  {os.path.getsize(dest)//1024}KB")
