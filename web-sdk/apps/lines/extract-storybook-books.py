"""
Regenerate Storybook test data from the real Ayakashi math output.

Streams library/publish_files/books_{base,bonus}.jsonl.zst (no full decompress)
and picks representative books per category, then writes:

    src/stories/data/base_books.ts    — array of base-game books
    src/stories/data/base_events.ts   — one sample event per event type
    src/stories/data/bonus_books.ts   — array of bonus-buy books
    src/stories/data/bonus_events.ts  — one sample event per event type

Run from anywhere with the backend venv:

    cd C:\\Users\\tiger\\Desktop\\Stake\\game-1\\Ayakashi
    env\\Scripts\\python.exe web-sdk\\apps\\lines\\extract-storybook-books.py
"""

import io
import json
import os
import sys

try:
    import zstandard
except ImportError:
    sys.exit("zstandard module missing — run with the backend venv (env\\Scripts\\python.exe)")

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLISH = os.path.normpath(
    os.path.join(HERE, "..", "..", "..", "games", "0_0_lines", "library", "publish_files")
)
OUT_DIR = os.path.join(HERE, "src", "stories", "data")

MAX_SCAN = 200_000  # books to scan per mode before giving up on a category


def stream_books(path):
    with open(path, "rb") as fh:
        reader = zstandard.ZstdDecompressor().stream_reader(fh)
        for line in io.TextIOWrapper(reader, encoding="utf-8"):
            line = line.strip()
            if line:
                yield json.loads(line)


def types_of(book):
    return {e["type"] for e in book["events"]}


def board_has_symbol(book, name):
    for e in book["events"]:
        if e["type"] == "reveal":
            if any(s.get("name") == name for reel in e["board"] for s in reel):
                return True
    return False


def pick_base(path):
    want = {
        # ordinary books first — the random story should mostly feel like real play
        "zero": None,          # no win, shortest
        "zero_2": None,        # another loss
        "zero_3": None,        # and another (losses are ~62% of real spins)
        "plain_win": None,     # small win, no tumble drama
        "plain_win_2": None,   # another modest win
        "win_tumble": None,    # small win with a tumble cascade
        # showcase books — one of each feature
        "exploder": None,      # X (Oni Kanabo) on board + tumble
        "freespin": None,      # free spin trigger
        "fs_multiplier": None, # Ofuda fsMultiplier event
        "bigwin": None,        # setWin winLevel >= 6
        "wincap": None,        # 2000x cap
    }
    for count, book in enumerate(stream_books(path), 1):
        if count > MAX_SCAN or all(v is not None for v in want.values()):
            break
        ev = book["events"]
        ts = types_of(book)
        n = len(ev)
        mult = book["payoutMultiplier"]

        if want["zero"] is None and mult == 0 and n <= 4:
            want["zero"] = book
        elif want["zero_2"] is None and mult == 0 and n <= 4:
            want["zero_2"] = book
        elif want["zero_3"] is None and mult == 0 and n <= 4:
            want["zero_3"] = book
        if want["plain_win"] is None and 0 < mult <= 2 and "tumbleBoard" not in ts and "freeSpinTrigger" not in ts and n <= 8:
            want["plain_win"] = book
        elif want["plain_win_2"] is None and 0 < mult <= 2 and "tumbleBoard" not in ts and "freeSpinTrigger" not in ts and n <= 8:
            want["plain_win_2"] = book
        if (
            want["win_tumble"] is None
            and "tumbleBoard" in ts
            and "freeSpinTrigger" not in ts
            and 0 < mult < 10
            and n <= 14
        ):
            want["win_tumble"] = book
        if (
            want["exploder"] is None
            and "tumbleBoard" in ts
            and "freeSpinTrigger" not in ts
            and n <= 25
            and board_has_symbol(book, "X")
        ):
            want["exploder"] = book
        if want["freespin"] is None and "freeSpinTrigger" in ts and n <= 80:
            want["freespin"] = book
        if want["fs_multiplier"] is None and "fsMultiplier" in ts and n <= 100:
            want["fs_multiplier"] = book
        if want["bigwin"] is None and any(
            e["type"] == "setWin" and e.get("winLevel", 0) >= 6 for e in ev
        ):
            want["bigwin"] = book
        if want["wincap"] is None and "wincap" in ts:
            want["wincap"] = book
    return want


def pick_bonus(path):
    want = {
        "bonus_short": None,   # shortest bonus round
        "bonus_retrigger": None,
        "bonus_bigwin": None,
    }
    shortest = None
    for count, book in enumerate(stream_books(path), 1):
        if count > MAX_SCAN or (
            all(v is not None for v in want.values())
        ):
            break
        ev = book["events"]
        ts = types_of(book)
        n = len(ev)

        if shortest is None or n < len(shortest["events"]):
            shortest = book
            want["bonus_short"] = book
        if want["bonus_retrigger"] is None and "freeSpinRetrigger" in ts and n <= 150:
            want["bonus_retrigger"] = book
        if want["bonus_bigwin"] is None and any(
            e["type"] == "setWin" and e.get("winLevel", 0) >= 6 for e in ev
        ):
            want["bonus_bigwin"] = book
    return want


def sample_events(books):
    """First occurrence of every event type across the picked books."""
    samples = {}
    for book in books:
        for e in book["events"]:
            samples.setdefault(e["type"], e)
    return samples


def write_ts(path, data):
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("// AUTO-GENERATED from games/0_0_lines/library/publish_files — do not hand-edit.\n")
        fh.write("// Regenerate with: env\\Scripts\\python.exe web-sdk\\apps\\lines\\extract-storybook-books.py\n")
        fh.write("export default ")
        json.dump(data, fh, indent=1)
        fh.write(";\n")
    print("wrote", os.path.relpath(path, HERE))


def main():
    base_path = os.path.join(PUBLISH, "books_base.jsonl.zst")
    bonus_path = os.path.join(PUBLISH, "books_bonus.jsonl.zst")
    for p in (base_path, bonus_path):
        if not os.path.exists(p):
            sys.exit(f"not found: {p}")

    print("scanning base books…")
    base = pick_base(base_path)
    for k, v in base.items():
        print(f"  {k:14s}", "OK  id=%s events=%d mult=%s" % (v["id"], len(v["events"]), v["payoutMultiplier"]) if v else "NOT FOUND")

    print("scanning bonus books…")
    bonus = pick_bonus(bonus_path)
    for k, v in bonus.items():
        print(f"  {k:14s}", "OK  id=%s events=%d mult=%s" % (v["id"], len(v["events"]), v["payoutMultiplier"]) if v else "NOT FOUND")

    base_books = [v for v in base.values() if v]
    bonus_books = [v for v in bonus.values() if v]

    write_ts(os.path.join(OUT_DIR, "base_books.ts"), base_books)
    write_ts(os.path.join(OUT_DIR, "base_events.ts"), sample_events(base_books))
    write_ts(os.path.join(OUT_DIR, "bonus_books.ts"), bonus_books)
    write_ts(os.path.join(OUT_DIR, "bonus_events.ts"), sample_events(bonus_books))
    print("done — restart Storybook to pick up the new data.")


if __name__ == "__main__":
    main()
