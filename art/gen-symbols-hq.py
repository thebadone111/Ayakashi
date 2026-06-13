"""Regenerate all 14 Ayakashi symbols at high quality on RunComfy cloud FLUX,
with ONE shared style spec so they're cohesive and uniform in visual mass
(fixes "flask/jade too big, bamboo too faint"). batch=2 candidates per symbol.

Every symbol is a BOLD CENTERED EMBLEM with a thick gold rim, ~80% frame fill,
glossy lacquer finish — so they read as a matched set on the reels.

Run:
  RUNCOMFY_API_KEY=... python art/gen-symbols-hq.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from runcomfy_generate import generate

DEST = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated\symbols-hq"

# shared style — enforces uniform framing / mass / finish across all 14
STYLE = (", centered single icon, isolated on pure solid black background, "
         "icon fills about 80 percent of the square frame with even margins, "
         "bold chunky silhouette, thick glossy gold outline, dark anime yokai "
         "slot-game symbol, rich jewel-tone palette, dramatic rim lighting, "
         "painterly with crisp clean edges, lacquered finish, ultra detailed, "
         "high contrast, no text, no watermark")

# atlas key -> subject. Kept recognizable yokai theme; all bold emblems of
# similar visual weight (no thin/sparse subjects like the old bamboo).
SYMBOLS = {
    # highs — ornate creatures / masks (premium)
    "h1": "an ornate Japanese oni demon mask, deep red lacquer with gold horns and fangs",
    "h2": "a nine-tailed kitsune fox head emblem, white fur with glowing blue spirit flames",
    "h3": "a tengu mask, crimson face with a long nose and gold filigree, black feathers",
    "h4": "a coiled Japanese ryujin dragon head, jade-green scales with gold whiskers",
    "h5": "a tanuki yokai emblem, rich brown fur holding a green leaf, bronze accents",
    # lows — bold objects
    "l1": "two crossed katana swords with ornate gold hilts and a circular tsuba",
    "l2": "a cluster of three glowing green magatama comma-shaped jade jewels",
    "l3": "a Japanese sake flask tokkuri with a cup, blue-and-white porcelain, gold rim",
    "l4": "a glowing orange paper lantern chochin with kanji-style gold brackets",
    "l5": "an open Japanese war fan gunbai with gold ribs and a red sun disc",
    # specials
    "w":  "a swirling spirit orb of blue-white kitsune foxfire energy, glowing sphere",
    "s":  "a large bronze temple bell bonsho with a thick rope, ornate cast relief",
    "x":  "a single ofuda paper talisman with a glowing golden kanji seal, burning edges",
    "x2": "an oni iron kanabo war club covered in brutal spikes with molten red cracks",
}

if __name__ == "__main__":
    total = 0
    for key, subject in SYMBOLS.items():
        d = os.path.join(DEST, key)
        if os.path.isdir(d) and any(f.endswith(".png") for f in os.listdir(d)):
            print(f"[{key}] already done - skip", flush=True)
            continue
        prompt = subject + STYLE
        files = generate(prompt, width=1024, height=1024, batch=2, steps=24,
                         dest=d, label=key, timeout=900)
        total += len(files)
    print(f"\nSYMBOLS-HQ DONE: {total} new images", flush=True)
