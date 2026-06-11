#!/usr/bin/env python3
"""Regenerate src/game/config.ts from the math-sdk's generated front-end config.

The math engine writes the authoritative front-end config to
    math-sdk/games/<id>/library/configs/config_fe_<id>.json
(via src/write_data/write_configs.py). The Svelte app imports a TS module,
src/game/config.ts, that must mirror it. Keeping them in sync by hand is how
the 5x5 / 50-payline board drifted out of sync with the 5x3 / 20-line frontend,
so this script does the conversion deterministically.

Usage (from apps/lines/):
    python sync-config.py
    python sync-config.py --src /path/to/config_fe_0_0_lines.json

The only structural transform is `symbols`: the JSON stores it as a list of
single-key objects ([{"M": {...}}, ...]); config.ts needs a keyed object so
that `keyof typeof config.symbols` (see types.ts) yields the symbol-name union.
Null paytables (special symbols) drop the paytable key.
"""

import argparse
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
GAME_ID = "0_0_lines"
DEFAULT_SRC = os.path.normpath(
    os.path.join(
        HERE,
        "..", "..", "..",
        "math-sdk", "games", GAME_ID, "library", "configs",
        f"config_fe_{GAME_ID}.json",
    )
)
DEST = os.path.join(HERE, "src", "game", "config.ts")


def symbols_list_to_object(symbols):
    """[{"M": {paytable: None, special_properties: [...]}}, ...] -> {M: {...}}."""
    out = {}
    for entry in symbols:
        (name, body), = entry.items()
        clean = {}
        if body.get("paytable") is not None:
            clean["paytable"] = body["paytable"]
        if body.get("special_properties"):
            clean["special_properties"] = body["special_properties"]
        out[name] = clean
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=DEFAULT_SRC, help="path to config_fe_<id>.json")
    ap.add_argument("--dest", default=DEST, help="path to config.ts")
    args = ap.parse_args()

    with open(args.src, encoding="utf-8") as f:
        cfg = json.load(f)

    if isinstance(cfg.get("symbols"), list):
        cfg["symbols"] = symbols_list_to_object(cfg["symbols"])

    body = json.dumps(cfg, indent=2, ensure_ascii=False)
    # No `as const`: the original config.ts widened types (mutable arrays), and
    # the SDK consumes paddingReels/numRows as mutable. `keyof typeof config.x`
    # in types.ts still resolves correctly without it.
    ts = (
        "// AUTO-GENERATED from math-sdk config_fe_%s.json by sync-config.py.\n"
        "// Do not edit by hand; re-run `python sync-config.py` after changing the math.\n"
        "export default %s;\n" % (GAME_ID, body)
    )

    with open(args.dest, "w", encoding="utf-8", newline="\n") as f:
        f.write(ts)

    print(f"Wrote {args.dest}")
    print(f"  numReels={cfg['numReels']} numRows={cfg['numRows']}")
    print(f"  paylines={len(cfg['paylines'])} symbols={len(cfg['symbols'])}")
    print(f"  betModes={list(cfg['betModes'])} "
          f"max_win={cfg['betModes']['base'].get('max_win')}")


if __name__ == "__main__":
    main()
