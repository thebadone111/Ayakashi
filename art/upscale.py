"""Upscale a picked avatar via fal.ai AuraSR (4x, anime-friendly).

Usage:
    $env:FAL_KEY = "id:secret"
    python art/upscale.py art/generated/seedream-pick-2026-06-15/V4b_01.png

Output: <same dir>/<stem>_4x.png

Why AuraSR:
- ~$0.001/compute-sec (a ~5MB png runs for a handful of seconds; <$0.05)
- Fixed 4x factor; for a 2304x1728 input that's 9216x6912 PNG
- Generally well-behaved on anime / illustration. If results soften facial
  detail too much, fall back to fal-ai/clarity-upscaler ($0.03/MP) which
  adds more detail at the cost of small style drift.

Wire pattern matches art/fal_generate.py (same queue API, just a different
endpoint and body schema).
"""
import os, sys, time, json
import requests

KEY = os.environ.get("FAL_KEY", "")
if not KEY:
    print("ERROR: set FAL_KEY env var (format 'id:secret')"); sys.exit(1)

H_AUTH = {"Authorization": f"Key {KEY}"}
H_JSON = {**H_AUTH, "Content-Type": "application/json"}
H_DL   = {"User-Agent": "Mozilla/5.0"}

QUEUE_BASE = "https://queue.fal.run"
STORAGE_INIT = "https://rest.alpha.fal.ai/storage/upload/initiate"
MODEL = "fal-ai/aura-sr"


def upload(path):
    """Upload a local file to fal storage, return the public URL."""
    name = os.path.basename(path)
    ctype = "image/png" if path.lower().endswith(".png") else "image/jpeg"
    init = requests.post(STORAGE_INIT, headers=H_JSON,
                         json={"file_name": name, "content_type": ctype},
                         timeout=30)
    if init.status_code >= 400:
        raise RuntimeError(f"upload init failed {init.status_code}: {init.text[:400]}")
    body = init.json()
    upload_url = body["upload_url"]
    file_url   = body["file_url"]
    with open(path, "rb") as fh:
        put = requests.put(upload_url, data=fh.read(),
                           headers={"Content-Type": ctype}, timeout=180)
    if put.status_code >= 400:
        raise RuntimeError(f"upload PUT failed {put.status_code}: {put.text[:400]}")
    return file_url


def upscale(src_path, checkpoint="v2", timeout=300):
    if not os.path.exists(src_path):
        print(f"ERROR: {src_path} not found"); return None
    out_path = os.path.splitext(src_path)[0] + "_4x.png"
    if os.path.exists(out_path) and os.path.getsize(out_path) > 50_000:
        print(f"SKIP (exists): {out_path}"); return out_path

    print(f"[1/3] upload {os.path.basename(src_path)} ({os.path.getsize(src_path)//1024} KB)...")
    image_url = upload(src_path)
    print(f"      -> {image_url[:80]}...")

    print(f"[2/3] submit AuraSR ({checkpoint})...")
    sub = requests.post(f"{QUEUE_BASE}/{MODEL}", headers=H_JSON,
                        json={"image_url": image_url, "checkpoint": checkpoint},
                        timeout=30)
    if sub.status_code >= 400:
        print(f"  SUBMIT FAIL {sub.status_code}: {sub.text[:400]}"); return None
    j = sub.json()
    status_url   = j["status_url"]
    response_url = j["response_url"]
    print(f"      req={j.get('request_id','?')[:8]}")

    t0 = time.time()
    while time.time() - t0 < timeout:
        time.sleep(3)
        try:
            s = requests.get(status_url, headers=H_AUTH, timeout=15).json()
        except Exception:
            continue
        st = s.get("status", "?")
        if st == "COMPLETED": break
        if st in ("FAILED", "ERROR", "CANCELLED"):
            print(f"  STATUS {st}: {json.dumps(s)[:400]}"); return None
    else:
        print(f"  TIMEOUT after {timeout}s (last={st})"); return None

    print(f"[3/3] fetch + download...")
    res = requests.get(response_url, headers=H_AUTH, timeout=30).json()
    img = res.get("image") or {}
    url = img.get("url") if isinstance(img, dict) else None
    if not url:
        print(f"  NO URL in response: {json.dumps(res)[:400]}"); return None

    blob = requests.get(url, headers=H_DL, timeout=180).content
    open(out_path, "wb").write(blob)
    print(f"DONE: {out_path} ({len(blob)//1024} KB, {int(time.time()-t0)}s)")
    return out_path


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: python art/upscale.py <image.png> [checkpoint=v2]")
        sys.exit(1)
    src = sys.argv[1]
    ckpt = sys.argv[2] if len(sys.argv) > 2 else "v2"
    upscale(src, checkpoint=ckpt)
