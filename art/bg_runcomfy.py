"""RunComfy-FLUX bg_bg companion — produces 3 candidates that slot into the
existing 2-model bg_bg directory so the contact sheet picks them up as a
third column.

The fal.ai bg_bg side is run via `bg_gen.py bg_bg`. This script reuses the
exact same prompt assembly (so the 3-way comparison is fair) and saves into
art/generated/bg-2026-06-26/bg_bg/A_runcomfy-flux/.

RunComfy deployment: 8ef39157-1983-46a9-b750-017363846751 (ayakashi-fx,
A6000-48GB, FLUX schnell, 20 steps). Cold start ~5-7 min on first call.

Usage:
  $env:RUNCOMFY_API_KEY = "..."
  python art/bg_runcomfy.py
"""
import os, sys, time
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
from concurrent.futures import ThreadPoolExecutor, as_completed

# Reuse the canonical prompt + variant assembly from bg_gen.py so the
# three models compare on identical text.
from bg_gen import LAYERS, PROSE_PREFIX
from runcomfy_generate import generate as rc_generate

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, "art", "generated", "bg-2026-06-26",
                   "bg_bg", "A_runcomfy-flux")
os.makedirs(OUT, exist_ok=True)

# Default to the live ayakashi-fx deployment
os.environ.setdefault("RUNCOMFY_DEPLOYMENT_ID",
                      "8ef39157-1983-46a9-b750-017363846751")

GENS = 3
SEED_BASE = 26060


def _full_prompt():
    layer = LAYERS["bg_bg"]
    return (f"{PROSE_PREFIX}, {layer['prose']}, {layer['composition']}, "
            f"{layer['negatives']}")


def _one(i: int):
    seed = SEED_BASE + i * 13
    label = f"bg_bg_A_runcomfy-flux_{i:02d}"
    fn = os.path.join(OUT, f"{label}.png")
    if os.path.exists(fn) and os.path.getsize(fn) > 50_000:
        print(f"  SKIP {label} (already saved)")
        return fn
    paths = rc_generate(
        _full_prompt(),
        width=1920, height=1088,   # FLUX schnell prefers multiples of 64
        batch=1, steps=20, seed=seed,
        dest=OUT, label=label,
        timeout=900,               # 15 min ceiling for cold start
    )
    return paths[0] if paths else None


def main():
    if not os.environ.get("RUNCOMFY_API_KEY"):
        print("ERROR: set RUNCOMFY_API_KEY env var"); sys.exit(1)
    print(f"prompt → {_full_prompt()[:200]}...\n")
    t0 = time.time()
    # Deployment has max_instances=1, queue_size=2 — so 3 concurrent
    # requests = 1 active + 2 queued. Cold start once, serve all three.
    with ThreadPoolExecutor(max_workers=3) as ex:
        futs = [ex.submit(_one, i) for i in range(1, GENS + 1)]
        results = [f.result() for f in as_completed(futs)]
    ok = sum(1 for r in results if r)
    print(f"\nDONE in {int(time.time()-t0)}s — {ok}/{GENS} saved")


if __name__ == "__main__":
    main()
