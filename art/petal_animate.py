"""Petal animation comparison — Wan 2.2 vs Hailuo 02 on 5 bg-removed petals.

Each picked petal's -nobg.png cut is animated by BOTH models; the 10 mp4s
land flat in one folder so they can be opened side by side for comparison.

Inputs:
  art/generated/bg-2026-06-26/_picked/petal_v{1..5}-nobg.png

Outputs:
  art/generated/petals-anim-v2-2026-06-27/mp4/
    petal_v1_wan.mp4      petal_v1_hailuo.mp4
    petal_v2_wan.mp4      petal_v2_hailuo.mp4
    ... etc

Models:
  Wan 2.2 a14b @ 720p — fal-ai/wan/v2.2-a14b/image-to-video         ($0.40/5s)
  Hailuo 02 standard  — fal-ai/minimax/hailuo-02/standard/image-to-video  ($0.27/6s)

Total spend: 5 × ($0.40 + $0.27) = ~$3.35.
Wall-clock: ~3-5 min with 6 parallel workers.

Usage:
  $env:FAL_KEY = "id:secret"
  python art/petal_animate.py
"""
import os
import sys
import time
import json

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

KEY = os.environ.get("FAL_KEY", "")
if not KEY:
    print("ERROR: set FAL_KEY env var"); sys.exit(1)

H_AUTH = {"Authorization": f"Key {KEY}"}
H_JSON = {**H_AUTH, "Content-Type": "application/json"}
H_DL = {"User-Agent": "Mozilla/5.0"}
QUEUE_BASE = "https://queue.fal.run"
STORAGE_INIT = "https://rest.alpha.fal.ai/storage/upload/initiate"

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PICKED = os.path.join(REPO, "art", "generated", "bg-2026-06-26", "_picked")
OUT = os.path.join(REPO, "art", "generated", "petals-anim-v2-2026-06-27", "mp4")
os.makedirs(OUT, exist_ok=True)

PETALS = ["petal_v1", "petal_v2", "petal_v3", "petal_v4", "petal_v5"]

# Motion prompt — same for both models so we compare apples to apples.
MOTION_PROMPT = (
    "the sakura cherry blossom petal drifts gently downward through "
    "calm night air while rotating slowly and continuously around its "
    "own center, smooth ethereal slow rotation, gentle floating motion, "
    "the petal is the only subject in the frame, no camera movement, "
    "no other objects, pure black background, the petal stays roughly "
    "centred in the frame throughout the animation"
)


def upload(path: str) -> str:
    name = os.path.basename(path)
    init = requests.post(STORAGE_INIT, headers=H_JSON,
                         json={"file_name": name, "content_type": "image/png"},
                         timeout=30)
    if init.status_code >= 400:
        raise RuntimeError(f"upload init {init.status_code}: {init.text[:300]}")
    body = init.json()
    with open(path, "rb") as fh:
        put = requests.put(body["upload_url"], data=fh.read(),
                           headers={"Content-Type": "image/png"}, timeout=180)
    if put.status_code >= 400:
        raise RuntimeError(f"upload PUT {put.status_code}: {put.text[:300]}")
    return body["file_url"]


def run_i2v(model: str, body: dict, *, label: str, timeout: int = 600):
    print(f"[{label}] submit {model.split('/')[-2]}...", flush=True)
    r = requests.post(f"{QUEUE_BASE}/{model}", headers=H_JSON, json=body, timeout=30)
    if r.status_code >= 400:
        raise RuntimeError(f"SUBMIT {r.status_code}: {r.text[:300]}")
    j = r.json()
    print(f"[{label}] req={j.get('request_id','?')[:8]}", flush=True)
    t0 = time.time()
    last_log = t0
    while time.time() - t0 < timeout:
        time.sleep(5)
        try:
            s = requests.get(j["status_url"], headers=H_AUTH, timeout=15).json()
        except Exception:
            continue
        st = s.get("status", "?")
        if time.time() - last_log >= 30:
            print(f"[{label}] still {st} at {int(time.time()-t0)}s", flush=True)
            last_log = time.time()
        if st == "COMPLETED":
            break
        if st in ("FAILED", "ERROR", "CANCELLED"):
            raise RuntimeError(f"STATUS {st}: {json.dumps(s)[:300]}")
    else:
        raise RuntimeError("timeout")
    res = requests.get(j["response_url"], headers=H_AUTH, timeout=30).json()
    vid = res.get("video") or {}
    url = vid.get("url") if isinstance(vid, dict) else None
    if not url:
        raise RuntimeError(f"no video url: {json.dumps(res)[:300]}")
    return url


def wan_one(petal: str, image_url: str):
    body = {
        "image_url": image_url,
        "prompt": MOTION_PROMPT,
        "resolution": "720p",
        "num_frames": 81,
        "frames_per_second": 16,
        "aspect_ratio": "1:1",
    }
    url = run_i2v("fal-ai/wan/v2.2-a14b/image-to-video", body,
                  label=f"{petal}_wan")
    mp4 = os.path.join(OUT, f"{petal}_wan.mp4")
    open(mp4, "wb").write(requests.get(url, headers=H_DL, timeout=300).content)
    print(f"[{petal}_wan] saved {os.path.getsize(mp4)//1024} KB")
    return mp4


def hailuo_one(petal: str, image_url: str):
    body = {
        "image_url": image_url,
        "prompt": MOTION_PROMPT,
        "duration": "6",
        "resolution": "768P",
        "prompt_optimizer": True,
    }
    url = run_i2v("fal-ai/minimax/hailuo-02/standard/image-to-video", body,
                  label=f"{petal}_hailuo")
    mp4 = os.path.join(OUT, f"{petal}_hailuo.mp4")
    open(mp4, "wb").write(requests.get(url, headers=H_DL, timeout=300).content)
    print(f"[{petal}_hailuo] saved {os.path.getsize(mp4)//1024} KB")
    return mp4


def do_petal(petal: str):
    src = os.path.join(PICKED, f"{petal}-nobg.png")
    if not os.path.exists(src):
        print(f"skip {petal}: {src} not found")
        return []
    image_url = upload(src)
    out = []
    try:
        out.append(wan_one(petal, image_url))
    except Exception as e:
        print(f"  [{petal}] WAN FAILED: {e}", flush=True)
    try:
        out.append(hailuo_one(petal, image_url))
    except Exception as e:
        print(f"  [{petal}] HAILUO FAILED: {e}", flush=True)
    return out


if __name__ == "__main__":
    print(f"Source dir: {PICKED}")
    print(f"Output dir: {OUT}\n")
    t0 = time.time()
    # 6 parallel workers — Wan and Hailuo for 5 petals = 10 jobs; pipeline
    # through fal.ai queue. Each model has its own backend so they don't
    # contend.
    with ThreadPoolExecutor(max_workers=6) as ex:
        futs = []
        for p in PETALS:
            futs.append(ex.submit(do_petal, p))
        for f in as_completed(futs):
            try:
                f.result()
            except Exception as e:
                print(f"  PETAL FAILED: {e}", flush=True)
    print(f"\nDONE in {int(time.time()-t0)}s. mp4s in {OUT}")
