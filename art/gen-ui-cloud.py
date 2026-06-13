"""Cloud-FLUX betting-UI assets (U1).

Bespoke Ayakashi UI pieces: the hero spin-button medallion, a reusable lacquer
button plate, and a wide ticker plate for the balance/win/bet labels. All on
pure black for clean alpha-cutting (rembg/luminance), tinted per-state in-engine.

Run: RUNCOMFY_API_KEY=... RUNCOMFY_DEPLOYMENT_ID=8ef39157-1983-46a9-b750-017363846751 \
     python art/gen-ui-cloud.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from runcomfy_generate import generate

DEST = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated\ui"

JOBS = [
    # HERO spin button — ornate circular medallion, the centrepiece of the bar
    dict(name="spin-medallion", w=1024, h=1024, steps=30,
         prompt="a single ornate circular game button medallion, deep red and black urushi "
                "lacquer disc with a glowing gold filigree rim of swirling foxfire and kitsune "
                "flames, a subtle embossed spiral mon crest in the centre, polished enamel with "
                "warm rim light, Japanese yokai craftsmanship, isolated perfectly centered on a "
                "pure solid black background, fills the frame, ultra detailed game UI asset, "
                "symmetrical, no text, no characters"),
    # reusable standard button plate (alpha-cut, scaled/9-sliced per button)
    dict(name="btn-plate", w=512, h=512, steps=28,
         prompt="a single rounded-square game button plate, dark crimson and black urushi "
                "lacquer with a thin glowing gold border rim, polished enamel surface with soft "
                "top rim light, subtle ink-cloud texture, Japanese yokai UI craftsmanship, "
                "isolated perfectly centered on a pure solid black background, fills the frame, "
                "ultra detailed game UI asset, symmetrical, no text, no icons"),
    # wide ticker plate behind balance / win / bet readouts
    dict(name="ticker", w=1024, h=384, steps=28,
         prompt="a single long horizontal rounded plaque, dark lacquered black wood with a thin "
                "gold hairline border and small gold corner ornaments, recessed inset panel for a "
                "readout, polished urushi enamel, Japanese yokai UI craftsmanship, isolated "
                "perfectly centered on a pure solid black background, fills the frame, ultra "
                "detailed game UI asset, symmetrical, no text"),
]

if __name__ == "__main__":
    total = 0
    for job in JOBS:
        d = os.path.join(DEST, job["name"])
        if os.path.isdir(d) and any(f.endswith(".png") for f in os.listdir(d)):
            print(f"[{job['name']}] already done - skip", flush=True); continue
        total += len(generate(job["prompt"], width=job["w"], height=job["h"], batch=2,
                              steps=job["steps"], dest=d, label=job["name"], timeout=900))
    print(f"\nUI-CLOUD DONE: {total} images", flush=True)
