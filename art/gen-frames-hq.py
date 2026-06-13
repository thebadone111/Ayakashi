"""Regenerate the reel frame + free-spins frame at HQ on RunComfy cloud FLUX.

These are ornate HOLLOW frames: a thick decorative border around an EMPTY
center (the board shows through). FLUX tends to fill centers, so the prompt
hammers "empty/hollow/picture-frame" hard; processing then cuts the dark
center to a transparent window (build step, separate).

batch=2 candidates each, square 1024 so the ~square 5x5 window fits.

Run: RUNCOMFY_API_KEY=... python art/gen-frames-hq.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from runcomfy_generate import generate

DEST = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated\frames-hq"

COMMON = (", thick decorative border framing a large EMPTY SQUARE opening, the "
          "central square hole is solid black and completely empty, square "
          "rectangular window not round, ornate border only along the four "
          "straight edges and corners, centered and symmetrical, dark anime "
          "yokai slot-game UI frame, ultra detailed, clean crisp edges, on pure "
          "black background, no text, no characters, nothing inside the square")

FRAMES = {
    "reel-frame": ("An ornate empty Japanese reel-frame border, thick red and black "
                   "lacquer with gold filigree and small oni and foxfire motifs at the "
                   "four corners, glossy lacquered finish, rich jewel tones" + COMMON),
    "fs-frame":   ("An ornate empty Japanese reel-frame border glowing with blue-white "
                   "kitsune foxfire, deep indigo and gold lacquer with spirit-flame motifs "
                   "at the corners, ethereal free-spins bonus styling" + COMMON),
}

if __name__ == "__main__":
    total = 0
    for key, prompt in FRAMES.items():
        d = os.path.join(DEST, key)
        if os.path.isdir(d) and any(f.endswith(".png") for f in os.listdir(d)):
            print(f"[{key}] already done - skip", flush=True); continue
        files = generate(prompt, width=1024, height=1024, batch=2, steps=26,
                         dest=d, label=key, timeout=900)
        total += len(files)
    print(f"\nFRAMES-HQ DONE: {total} new images", flush=True)
