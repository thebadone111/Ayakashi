"""Cloud-FLUX torii gate for the FS intro — painterly/atmospheric (v2).

v1 came out as flat 3D product renders that clash with the painterly game art.
This prompt aims for an illustrated, glowing, mist-wreathed gate that matches the
Ayakashi aesthetic. Front-on, symmetrical, isolated on pure black for alpha.

Run: RUNCOMFY_API_KEY=... RUNCOMFY_DEPLOYMENT_ID=8ef39157-1983-46a9-b750-017363846751 \
     python art/gen-torii.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from runcomfy_generate import generate

DEST = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated\ui\torii2"

PROMPT = (
    "a breathtaking ornate Japanese torii gate, painterly anime illustration style, "
    "deep vermilion red lacquer pillars with weathered gold-leaf caps and black iron "
    "fittings, intricate carved kitsune and cloud motifs, the gate glowing softly and "
    "wreathed in drifting blue foxfire wisps and pale mist, sacred shrine atmosphere, "
    "seen straight from the front, perfectly symmetrical, isolated and centered on a "
    "pure solid black background, fills the frame, dark Japanese yokai game art, "
    "Demon Slayer aesthetic, dramatic warm rim lighting and gentle bloom, museum quality "
    "illustration, ultra detailed, no text, no characters, no ground, no foreground"
)

if __name__ == "__main__":
    n = len(generate(PROMPT, width=1024, height=1024, batch=4, steps=32,
                     dest=DEST, label="torii2", timeout=900))
    print(f"\nTORII2 DONE: {n} images", flush=True)
