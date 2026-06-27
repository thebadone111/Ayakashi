#!/usr/bin/env python3
"""
Seedance 2.0 idle animation experiment — 4 prompt variants for the avatar.

Outputs MP4s to:
  art/generated/avatar-idle-seedance-2026-06-27/

No sprite sheets — review the MP4s first, pick the best,
remove the background, then we wire it into AvatarActor.

Usage (from repo root, virtualenv active):
  python art/seedance_idle_experiment.py
"""
import os, sys, json, time, requests
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# ---------------------------------------------------------------------------
# Auth + endpoints
# ---------------------------------------------------------------------------
KEY        = os.environ.get("FAL_KEY", "5682095b-d1df-4149-a96e-eca959dd9207:12559632f7d5a20d27e95f147dbb150f")
H_AUTH     = {"Authorization": f"Key {KEY}"}
H_JSON     = {**H_AUTH, "Content-Type": "application/json"}
H_DL       = {"User-Agent": "Mozilla/5.0"}
QUEUE_BASE = "https://queue.fal.run"
STORAGE    = "https://rest.alpha.fal.ai/storage/upload/initiate"
MODEL      = "bytedance/seedance-2.0/image-to-video"

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AVATAR_SRC = os.path.join(ROOT, "web-sdk/apps/lines/static/assets/sprites/avatar/avatar.webp")
OUT_DIR    = os.path.join(ROOT, "art/generated/avatar-idle-seedance-2026-06-27")
os.makedirs(OUT_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Prompt variants
#
# All are a single continuous locked-frame portrait — Seedance 2.0 animates
# FROM the input image so there are no real "cuts", but structuring the beats
# gives the model clear motion choreography to follow.
# ---------------------------------------------------------------------------
VARIANTS = {

    # A — pure stillness: breath + hair drift + foxfire pulse
    "idle_a": {
        "duration": "8",
        "prompt": (
            "A regal, mature kitsune fox-spirit woman stands centered in frame, perfectly composed. "
            "She breathes slowly — her chest barely rises and falls. "
            "Her long silver-white hair drifts upward weightlessly as if lifted by an invisible "
            "spiritual current. The cyan foxfire flames behind her pulse and curl in slow lazy arcs, "
            "casting soft blue-green light across her face. "
            "Her expression is serene and completely unreadable. Her dark kimono barely stirs. "
            "Camera completely locked — static portrait frame throughout. "
            "No sudden movement. Ancient, patient, undisturbed power. "
            "Style: cinematic anime, high quality, soft atmospheric lighting, painterly, ethereal."
        ),
    },

    # B — regal survey: composed head turn then return
    "idle_b": {
        "duration": "10",
        "prompt": (
            "Subject: A composed, mature kitsune woman. Ornate dark kimono with gold embroidery. "
            "Long silver-white hair. Cyan foxfire flames framing her. "
            "Beat 1 — completely still, facing camera, silver hair resting, foxfire glowing softly. "
            "Beat 2 — her head turns a few degrees to the right with unhurried, deliberate grace — "
            "a quiet survey. She holds the turn briefly. "
            "Beat 3 — she returns slowly to face forward. Her expression remains calm and unreadable. "
            "Beat 4 — the foxfire brightens gently as she settles back to stillness. "
            "Camera: completely locked static portrait frame throughout. No camera movement. "
            "Style: high-end cinematic anime, rich atmospheric lighting, mysterious, painterly."
        ),
    },

    # C — spiritual wind: hair lifts in a long arc, foxfire blooms, settles back
    "idle_c": {
        "duration": "8",
        "prompt": (
            "Subject: A regal kitsune fox-spirit woman. Dark kimono. Long flowing silver-white hair. "
            "Cyan foxfire flames surrounding her. Completely still and composed expression. "
            "Beat 1 — she stands motionless, hair resting, eyes forward. "
            "Beat 2 — a slow spiritual wind passes through: her silver hair rises and drifts upward "
            "in a long elegant arc, billowing gently. "
            "Beat 3 — the foxfire blooms outward with the wind, casting luminous cyan light across her. "
            "She does not react — no change in expression, no movement of her body. "
            "Beat 4 — the wind passes. Her hair settles slowly downward. The foxfire recedes. "
            "Camera: static locked portrait frame. Zero camera movement. "
            "Style: cinematic anime, 4K quality, ethereal atmosphere, spiritual, luminous."
        ),
    },

    # D — slow blink + breath + foxfire swell: all beats chained in one take
    "idle_d": {
        "duration": "10",
        "prompt": (
            "A continuous cinematic portrait of a mature, regal kitsune woman. "
            "She embodies stillness — not rigid, but alive and unhurried. "
            "Beat 1 — she stands perfectly still, facing camera, composed bearing. "
            "Beat 2 — her eyes slowly close and open in one long, composed blink. "
            "Beat 3 — she draws a slow breath; her posture lifts almost imperceptibly, "
            "her chin rises a fraction with quiet confidence. "
            "Beat 4 — the cyan foxfire behind her swells outward, lighting her face with "
            "soft blue-green luminance, then recedes slowly. "
            "Beat 5 — her long silver-white hair drifts as if stirred by the foxfire energy, "
            "then settles softly back. "
            "Throughout: camera completely static, locked portrait frame. "
            "Style: cinematic anime, high-end, rich atmospheric lighting, painterly, spiritual."
        ),
    },
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def upload(path: str) -> str:
    name = os.path.basename(path)
    ct = "image/webp" if path.endswith(".webp") else "image/png"
    init = requests.post(STORAGE, headers=H_JSON,
                         json={"file_name": name, "content_type": ct}, timeout=30)
    if init.status_code >= 400:
        raise RuntimeError(f"upload init {init.status_code}: {init.text[:300]}")
    body = init.json()
    with open(path, "rb") as fh:
        put = requests.put(body["upload_url"], data=fh.read(),
                           headers={"Content-Type": ct}, timeout=180)
    if put.status_code >= 400:
        raise RuntimeError(f"upload PUT {put.status_code}: {put.text[:300]}")
    return body["file_url"]


def submit(name: str, cfg: dict, image_url: str) -> dict:
    body = {
        "image_url":      image_url,
        "prompt":         cfg["prompt"],
        "duration":       cfg["duration"],
        "aspect_ratio":   "9:16",
        "resolution":     "720p",
        "generate_audio": False,
    }
    r = requests.post(f"{QUEUE_BASE}/{MODEL}", headers=H_JSON, json=body, timeout=30)
    if r.status_code >= 400:
        raise RuntimeError(f"[{name}] submit {r.status_code}: {r.text[:300]}")
    j = r.json()
    print(f"  {name}  --  {cfg['duration']}s  --  req {j.get('request_id','?')[:8]}")
    return {"name": name, **j}


def wait(job: dict, timeout: int = 600) -> str:
    name = job["name"]
    t0 = time.time()
    last_log = t0
    while time.time() - t0 < timeout:
        time.sleep(6)
        try:
            s = requests.get(job["status_url"], headers=H_AUTH, timeout=15).json()
        except Exception:
            continue
        st = s.get("status", "?")
        if time.time() - last_log >= 30:
            print(f"  [{name}] {st}  {int(time.time()-t0)}s")
            last_log = time.time()
        if st == "COMPLETED":
            break
        if st in ("FAILED", "ERROR", "CANCELLED"):
            raise RuntimeError(f"[{name}] {st}: {json.dumps(s)[:300]}")
    else:
        raise RuntimeError(f"[{name}] timeout after {timeout}s")
    res = requests.get(job["response_url"], headers=H_AUTH, timeout=30).json()
    vid = res.get("video") or {}
    url = vid.get("url") if isinstance(vid, dict) else None
    if not url:
        raise RuntimeError(f"[{name}] no video url in response: {json.dumps(res)[:300]}")
    return url


def download(name: str, url: str) -> str:
    path = os.path.join(OUT_DIR, f"{name}.mp4")
    print(f"  [{name}] downloading...", end=" ", flush=True)
    data = requests.get(url, headers=H_DL, timeout=300).content
    with open(path, "wb") as fh:
        fh.write(data)
    print(f"{len(data)//1024} KB -> {path}")
    return path


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print(f"Avatar source: {AVATAR_SRC}")
    print("Uploading...")
    image_url = upload(AVATAR_SRC)
    print(f"  Uploaded: {image_url}\n")

    print(f"Submitting {len(VARIANTS)} variants to Seedance 2.0 ({MODEL})...")
    jobs = []
    for name, cfg in VARIANTS.items():
        try:
            jobs.append(submit(name, cfg, image_url))
        except Exception as e:
            print(f"  ERROR submitting {name}: {e}")

    print(f"\nWaiting for {len(jobs)} jobs...\n")

    def run_job(job):
        name = job["name"]
        url = wait(job)
        return download(name, url)

    results = {}
    with ThreadPoolExecutor(max_workers=4) as ex:
        future_map = {ex.submit(run_job, j): j["name"] for j in jobs}
        for future in as_completed(future_map):
            name = future_map[future]
            try:
                path = future.result()
                results[name] = path
            except Exception as e:
                print(f"  [{name}] ERROR: {e}")

    print("\n" + "=" * 60)
    print(f"Done. MP4s in: {OUT_DIR}\n")
    for name in VARIANTS:
        status = "OK" if name in results else "FAILED"
        print(f"  {name}  {status}")
    print()


if __name__ == "__main__":
    main()
