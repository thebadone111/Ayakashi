"""Slice the symbolsStatic atlas into individual symbol images for the HTML
Pay Table modal (PayTableContent.svelte imports these via Vite so they are
fingerprinted + CDN-safe). Output names use the CONFIG symbol key (lowercased).

Run: ../../../math-sdk/env/Scripts/python.exe build-paytable-symbols.py
"""
import json, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ATLAS_DIR = os.path.join(HERE, "static", "assets", "sprites", "symbolsStatic")
OUT = os.path.join(HERE, "src", "components", "paytable", "img")
os.makedirs(OUT, exist_ok=True)

# config symbol -> atlas frame key (mirrors SYMBOL_INFO_MAP in game/constants.ts)
SYMBOL_TO_FRAME = {
    "h1": "h1.webp", "h2": "h2.webp", "h3": "h3.webp", "h4": "h4.webp",
    "l1": "l1.webp", "l2": "l2.webp", "l3": "l3.webp", "l4": "l4.webp", "l5": "l5.webp",
    "w": "w.png",    # Kitsune Spirit Orb (wild)
    "s": "s.png",    # Temple Bell (scatter)
    "m": "x.png",    # Ofuda Talisman (free-spin multiplier)
    "x": "x2.png",   # Oni Kanabo (3x3 exploder)
}

frames = json.load(open(os.path.join(ATLAS_DIR, "symbolsStatic.json")))["frames"]
atlas = Image.open(os.path.join(ATLAS_DIR, "symbolsStatic.png")).convert("RGBA")

for name, frame_key in SYMBOL_TO_FRAME.items():
    fr = frames[frame_key]["frame"]
    crop = atlas.crop((fr["x"], fr["y"], fr["x"] + fr["w"], fr["y"] + fr["h"]))
    dest = os.path.join(OUT, f"{name}.webp")
    crop.save(dest, "WEBP", quality=92, method=6)
    print(f"  {name:3s} <- {frame_key:10s} {fr['w']}x{fr['h']}  {os.path.getsize(dest)//1024}KB")

print(f"\n{len(SYMBOL_TO_FRAME)} symbols written to {OUT}")
