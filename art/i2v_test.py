"""Image-to-Video baseline test on the picked Seedream v4 avatar.

Source: art/generated/avatar-ab-2026-06-15/E_seedream-v4-full/E_seedream-v4-full_01.png

Two models, one candidate each (~$0.47 total) — we just want to see whether
whole-image I2V on a kitsune key visual produces a coherent, usable idle
animation. If yes -> simple pipeline. If no -> escalate to layered approach.

  | Variant       | Endpoint                                  | Cost       |
  |---------------|-------------------------------------------|------------|
  | wan22-720p    | fal-ai/wan/v2.2-a14b/image-to-video       | $0.40 (5s) |
  | hailuo02-768p | fal-ai/minimax/hailuo-02/standard/i2v     | $0.27 (6s) |

Output:
  art/generated/i2v-test-2026-06-15/
    wan22-720p.mp4
    wan22-720p_sprites.png        (16 evenly-spaced frames, packed 4x4)
    hailuo02-768p.mp4
    hailuo02-768p_sprites.png
"""
import os, sys, time, json, requests, subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image
import imageio_ffmpeg as iio

KEY = os.environ.get("FAL_KEY", "")
if not KEY: print("ERROR: set FAL_KEY env var"); sys.exit(1)

H_AUTH = {"Authorization": f"Key {KEY}"}
H_JSON = {**H_AUTH, "Content-Type": "application/json"}
H_DL   = {"User-Agent": "Mozilla/5.0"}
QUEUE_BASE = "https://queue.fal.run"
STORAGE_INIT = "https://rest.alpha.fal.ai/storage/upload/initiate"
FFMPEG = iio.get_ffmpeg_exe()

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(REPO, "art", "generated", "avatar-ab-2026-06-15",
                    "E_seedream-v4-full", "E_seedream-v4-full_01.png")
OUT  = os.path.join(REPO, "art", "generated", "i2v-test-2026-06-15")
os.makedirs(OUT, exist_ok=True)

IDLE_PROMPT = (
    "Subtle ambient idle animation. The character stands perfectly still in "
    "her pose, only her silver-white hair and her cyan foxfire flame tails "
    "drift gently in a soft breeze, flowing slowly and continuously. The "
    "small cyan foxfire spark above her fingertips pulses softly, breathing "
    "in and out. Cherry petals drift slowly through the air around her. "
    "Soft moonlight glow. No walking, no head turning, no big gestures, "
    "no camera movement. The character holds her pose throughout. "
    "Peaceful, hypnotic, looping ambient motion."
)


def upload(path):
    name = os.path.basename(path)
    ctype = "image/png"
    init = requests.post(STORAGE_INIT, headers=H_JSON,
                         json={"file_name": name, "content_type": ctype}, timeout=30)
    if init.status_code >= 400:
        raise RuntimeError(f"upload init {init.status_code}: {init.text[:400]}")
    body = init.json()
    with open(path, "rb") as fh:
        put = requests.put(body["upload_url"], data=fh.read(),
                           headers={"Content-Type": ctype}, timeout=180)
    if put.status_code >= 400:
        raise RuntimeError(f"upload PUT {put.status_code}: {put.text[:400]}")
    return body["file_url"]


def run_i2v(model, body, *, label, timeout=600):
    """Submit -> poll -> return mp4 url."""
    print(f"[{label}] submit {model}...", flush=True)
    r = requests.post(f"{QUEUE_BASE}/{model}", headers=H_JSON, json=body, timeout=30)
    if r.status_code >= 400:
        raise RuntimeError(f"SUBMIT {r.status_code}: {r.text[:400]}")
    j = r.json()
    print(f"[{label}] req={j.get('request_id','?')[:8]}", flush=True)
    t0 = time.time()
    while time.time() - t0 < timeout:
        time.sleep(5)
        try:
            s = requests.get(j["status_url"], headers=H_AUTH, timeout=15).json()
        except Exception:
            continue
        st = s.get("status", "?")
        if st == "COMPLETED": break
        if st in ("FAILED", "ERROR", "CANCELLED"):
            raise RuntimeError(f"STATUS {st}: {json.dumps(s)[:400]}")
    else:
        raise RuntimeError("timeout")
    res = requests.get(j["response_url"], headers=H_AUTH, timeout=30).json()
    vid = res.get("video") or {}
    url = vid.get("url") if isinstance(vid, dict) else None
    if not url:
        raise RuntimeError(f"no url: {json.dumps(res)[:400]}")
    return url, res


def extract_sprites(mp4_path, sheet_path, *, frames=16, cols=4):
    """Extract `frames` evenly-spaced frames from mp4, pack into PNG sheet."""
    tmp_dir = sheet_path + "_tmp_frames"
    os.makedirs(tmp_dir, exist_ok=True)

    # Get duration + fps via ffprobe-like
    probe = subprocess.run(
        [FFMPEG, "-i", mp4_path, "-hide_banner"],
        capture_output=True, text=True
    )
    info = probe.stderr  # ffmpeg writes metadata to stderr
    dur = None
    for line in info.splitlines():
        if "Duration:" in line:
            t = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = t.split(":")
            dur = int(h) * 3600 + int(m) * 60 + float(s)
            break
    if not dur:
        print(f"  [warn] no duration; assuming 5s"); dur = 5.0

    # Compute timestamps + extract one frame per timestamp
    timestamps = [(i + 0.5) * dur / frames for i in range(frames)]
    for i, ts in enumerate(timestamps):
        subprocess.run(
            [FFMPEG, "-y", "-loglevel", "error", "-ss", f"{ts:.3f}",
             "-i", mp4_path, "-frames:v", "1", "-q:v", "2",
             os.path.join(tmp_dir, f"f_{i:02d}.png")],
            check=True
        )

    # Pack
    sample = Image.open(os.path.join(tmp_dir, "f_00.png"))
    w, h = sample.size
    rows = (frames + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * w, rows * h), (0, 0, 0, 0))
    for i in range(frames):
        f = Image.open(os.path.join(tmp_dir, f"f_{i:02d}.png")).convert("RGBA")
        c, r = i % cols, i // cols
        sheet.paste(f, (c * w, r * h))
    sheet.save(sheet_path, "PNG")
    print(f"  sprite sheet {sheet_path} ({sheet.size[0]}x{sheet.size[1]}, "
          f"{frames}f, {cols}x{rows} grid)")

    for f in os.listdir(tmp_dir):
        os.remove(os.path.join(tmp_dir, f))
    os.rmdir(tmp_dir)


def variant_wan22(image_url):
    body = {
        "image_url": image_url,
        "prompt": IDLE_PROMPT,
        "resolution": "720p",
        "num_frames": 81,           # ~5s at 16fps
        "frames_per_second": 16,
        "aspect_ratio": "9:16",
    }
    url, _ = run_i2v("fal-ai/wan/v2.2-a14b/image-to-video", body,
                     label="wan22-720p", timeout=600)
    mp4 = os.path.join(OUT, "wan22-720p.mp4")
    open(mp4, "wb").write(requests.get(url, headers=H_DL, timeout=300).content)
    print(f"  saved {mp4} ({os.path.getsize(mp4)//1024} KB)")
    extract_sprites(mp4, os.path.join(OUT, "wan22-720p_sprites.png"))
    return mp4


def variant_hailuo(image_url):
    body = {
        "image_url": image_url,
        "prompt": IDLE_PROMPT,
        "duration": "6",
        "resolution": "768P",
        "prompt_optimizer": True,
    }
    url, _ = run_i2v("fal-ai/minimax/hailuo-02/standard/image-to-video", body,
                     label="hailuo02-768p", timeout=600)
    mp4 = os.path.join(OUT, "hailuo02-768p.mp4")
    open(mp4, "wb").write(requests.get(url, headers=H_DL, timeout=300).content)
    print(f"  saved {mp4} ({os.path.getsize(mp4)//1024} KB)")
    extract_sprites(mp4, os.path.join(OUT, "hailuo02-768p_sprites.png"))
    return mp4


if __name__ == "__main__":
    if not os.path.exists(SRC):
        print(f"ERROR: source {SRC} not found"); sys.exit(1)
    print(f"Uploading source: {os.path.basename(SRC)} ({os.path.getsize(SRC)//1024} KB)")
    image_url = upload(SRC)
    print(f"  -> {image_url[:80]}\n")

    print("Running 2 I2V models in parallel (~5-8 min total wall time, ~$0.47)\n")
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=2) as ex:
        f_wan = ex.submit(variant_wan22, image_url)
        f_hai = ex.submit(variant_hailuo, image_url)
        for f in as_completed([f_wan, f_hai]):
            try: f.result()
            except Exception as e: print(f"  FAILED: {e}")
    print(f"\nDONE in {int(time.time()-t0)}s. Outputs in {OUT}")
