"""RunComfy serverless FLUX driver — cloud generation for HIGH-QUALITY work.

Use this instead of the local 8GB ComfyUI when you need full-precision FLUX,
high resolution, big batches, or sakuga frame sheets — the local card can't.

Cloud A6000-48GB, full FLUX (flux/ae.sft), no VRAM hangs/timeouts.

Flow: POST overrides -> poll status -> download node-mapped image URLs.
The deployment wraps the community RunComfy/FLUX graph; override node IDs:
  6  CLIPTextEncode.text     (prompt)
  5  EmptyLatentImage        (width, height, batch_size)
  17 BasicScheduler          (steps, denoise, scheduler)
  25 RandomNoise             (noise_seed)
  9  SaveImage               (filename_prefix)

Auth + deployment from env (set before running):
  RUNCOMFY_API_KEY, RUNCOMFY_DEPLOYMENT_ID

CONFIG block per run, then: python runcomfy_generate.py
"""
import json, os, sys, time, uuid
import requests

# RunComfy's CDN 403s the default urllib UA — send a browser UA for downloads.
DL_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"}

API = "https://api.runcomfy.net/prod/v2"
KEY = os.environ.get("RUNCOMFY_API_KEY", "")
DEP = os.environ.get("RUNCOMFY_DEPLOYMENT_ID", "8d7512f4-a277-4b03-a035-e26e9cbf248d")
HEADERS = {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

# ── CONFIG — edit per run (or import generate() from another script) ───────────
PROMPT = ("An ornate Japanese oni demon mask, red lacquer with gold horns, isolated "
          "centered on pure black background, dark anime yokai slot icon, ultra detailed")
WIDTH, HEIGHT, BATCH, STEPS = 1024, 1024, 1, 24
DEST = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated\runcomfy"


def generate(prompt, width=1024, height=1024, batch=1, steps=24, seed=None,
             dest=DEST, label="img", poll_every=8, timeout=600):
    """Submit one inference, wait, download images. Returns list of saved paths."""
    if not KEY:
        print("ERROR: set RUNCOMFY_API_KEY env var"); sys.exit(1)
    seed = seed if seed is not None else int(time.time() * 1000) % (2**31)
    overrides = {
        "6":  {"inputs": {"text": prompt}},
        "5":  {"inputs": {"width": width, "height": height, "batch_size": batch}},
        "17": {"inputs": {"steps": steps, "denoise": 1, "scheduler": "simple"}},
        "25": {"inputs": {"noise_seed": seed}},
    }
    r = requests.post(f"{API}/deployments/{DEP}/inference", headers=HEADERS,
                      json={"overrides": overrides}, timeout=30).json()
    req = r.get("request_id")
    if not req:
        print(f"  SUBMIT ERROR [{label}]: {json.dumps(r)[:400]}"); return []
    print(f"[{label}] seed={seed} req={req[:8]} ...", flush=True)

    t0 = time.time()
    status = "?"
    while time.time() - t0 < timeout:
        time.sleep(poll_every)
        try:
            s = requests.get(f"{API}/deployments/{DEP}/requests/{req}/status",
                             headers=HEADERS, timeout=15).json()
        except Exception:
            continue
        status = s.get("status", "?")
        if status in ("completed", "succeeded", "success"):
            break
        if status in ("failed", "error", "cancelled"):
            print(f"  FAILED [{label}]: {json.dumps(s)[:400]}"); return []
    else:
        print(f"  TIMEOUT [{label}] (last status {status})"); return []

    res = requests.get(f"{API}/deployments/{DEP}/requests/{req}/result",
                       headers=HEADERS, timeout=30).json()
    os.makedirs(dest, exist_ok=True)
    saved = []
    for node in res.get("outputs", {}).values():
        for i, img in enumerate(node.get("images", [])):
            url = img.get("url")
            if not url:
                continue
            fn = os.path.join(dest, f"{label}_{seed}_{i}.png")
            img_bytes = requests.get(url, headers=DL_HEADERS, timeout=120).content
            with open(fn, "wb") as fh:
                fh.write(img_bytes)
            saved.append(fn)
            print(f"  saved {fn} ({os.path.getsize(fn)//1024}KB)", flush=True)
    return saved


if __name__ == "__main__":
    generate(PROMPT, WIDTH, HEIGHT, BATCH, STEPS, label="oni_test")
