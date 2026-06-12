"""Flatten frame_bg1 further: Max says symbols are still hard to read against
the streaky panel. Compress local contrast hard (streaks become whispers),
darken slightly, keep a hint of wood-grain so it doesn't read as flat fill.

Run: ../../../math-sdk/env/Scripts/python.exe flatten-panel.py
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
path = os.path.join(HERE, "static", "assets", "sprites", "reelsFrame", "frame_bg1.webp")

im = Image.open(path).convert("RGB")
arr = np.asarray(im).astype(np.float32)

mean = arr.reshape(-1, 3).mean(axis=0)            # panel's average colour
flat = mean[None, None, :] + (arr - mean) * 0.38  # compress contrast to 38%
flat *= 0.82                                       # darken so symbols pop

out = Image.fromarray(np.clip(flat, 0, 255).astype(np.uint8))
out.save(path, "WEBP", quality=90, method=6)
print(f"flattened -> {os.path.getsize(path)//1024}KB  (panel mean {mean.astype(int)})")
