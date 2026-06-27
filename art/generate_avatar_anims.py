#!/usr/bin/env python3
"""
Generate all 8 avatar animation clips via Wan 2.2 I2V on fal.ai.

Outputs:
  art/generated/avatar-anims-2026-06-27/mp4/     -- raw MP4s (one per clip)
  art/generated/avatar-anims-2026-06-27/sheets/  -- sprite sheets as PNG + JSON metadata

Sheet format: 9 columns, cell size 192x336 (matches avatar 4:7 aspect).
num_frames follows Wan's 4k+1 constraint (25, 41, 49, 57, 73, 81).

Usage (from repo root, virtualenv active):
  python art/generate_avatar_anims.py
"""
import os, sys, json, time, requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# ---------------------------------------------------------------------------
# Auth + endpoints
# ---------------------------------------------------------------------------
KEY          = os.environ.get("FAL_KEY", "5682095b-d1df-4149-a96e-eca959dd9207:12559632f7d5a20d27e95f147dbb150f")
H_AUTH       = {"Authorization": f"Key {KEY}"}
H_JSON       = {**H_AUTH, "Content-Type": "application/json"}
H_DL         = {"User-Agent": "Mozilla/5.0"}
QUEUE_BASE   = "https://queue.fal.run"
STORAGE_INIT = "https://rest.alpha.fal.ai/storage/upload/initiate"
WAN_MODEL    = "fal-ai/wan/v2.2-a14b/image-to-video"

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AVATAR_SRC = os.path.join(ROOT, "web-sdk/apps/lines/static/assets/sprites/avatar/avatar.webp")
OUT_ROOT   = os.path.join(ROOT, "art/generated/avatar-anims-2026-06-27")
OUT_MP4    = os.path.join(OUT_ROOT, "mp4")
OUT_SHEETS = os.path.join(OUT_ROOT, "sheets")
os.makedirs(OUT_MP4,    exist_ok=True)
os.makedirs(OUT_SHEETS, exist_ok=True)

# ---------------------------------------------------------------------------
# Sheet geometry
# ---------------------------------------------------------------------------
COLS   = 9
CELL_W = 192
CELL_H = 336   # 4:7 matches avatar source 1536x2688

# ---------------------------------------------------------------------------
# Clips  (num_frames must be 4k+1 for Wan 2.2: 25, 33, 41, 49, 57, 65, 73, 81)
# ---------------------------------------------------------------------------
NEGATIVE = (
    "deformed, distorted, ugly, bad anatomy, blurry, low quality, "
    "childish, cute, chibi, hyperactive, bouncy, cartoon exaggeration"
)

CLIPS = {
    "idle": {
        "num_frames": 81,
        "prompt": (
            "Her raised arm lowers with unhurried, fluid grace to rest at her side. "
            "She breathes slowly, her kimono barely moves. Her long silver hair drifts "
            "as if weightless in a gentle ethereal current. The cyan foxfire behind her "
            "pulses and curls lazily. Her head turns a few degrees in a composed, regal "
            "survey of the scene. Still, dignified, serene. No bouncing or fidgeting."
        ),
    },
    "reelstop": {
        "num_frames": 25,
        "prompt": (
            "The faintest incline of her head -- a single measured, composed nod. "
            "Her gaze drops a fraction and returns to forward. The contained gesture "
            "of a woman who notices everything and reacts to nothing. Minimal, precise, dignified."
        ),
    },
    "tumble": {
        "num_frames": 41,
        "prompt": (
            "Her chin lifts slowly and deliberately. A composed, unhurried half-smile "
            "settles on her lips as her gaze moves forward -- the quiet satisfaction of "
            "someone watching events unfold exactly as expected. Her large fox tail makes "
            "one slow, deliberate sweep to the side. Poised, self-assured."
        ),
    },
    "wildland": {
        "num_frames": 49,
        "prompt": (
            "One sculpted brow rises with cool appraisal. Her gaze sharpens and cuts "
            "to the side. She holds herself perfectly still, chin raised, spine straight. "
            "The cyan foxfire around her tail flares briefly outward. Contained, watchful "
            "authority. She is unmoved, merely observing."
        ),
    },
    "smash": {
        "num_frames": 49,
        "prompt": (
            "She turns her head toward the source of the impact -- slow, deliberate, "
            "like a queen acknowledging something beneath her. Her expression remains "
            "composed and unreadable. Her foxfire surges and billows dramatically outward. "
            "She does not flinch. Power radiates from her stillness."
        ),
    },
    "bonus": {
        "num_frames": 57,
        "prompt": (
            "She turns toward the viewer with a slow, knowing half-smile. Her chin "
            "drops a fraction, eyes hold contact directly -- the expression of someone "
            "who already knew this was coming. One hand rises with elegant slowness to "
            "rest lightly near her collarbone. Quiet, graceful amusement. No haste."
        ),
    },
    "fsintro": {
        "num_frames": 73,
        "prompt": (
            "She draws herself to full height, spine elongating. She turns to face "
            "the viewer fully in a single slow, ceremonial motion, both arms opening "
            "wide in a deliberate arc -- like a high priestess opening a ritual. "
            "Her foxfire expands and rises around her. Her expression is open, "
            "commanding, absolute. An invitation from someone accustomed to being obeyed."
        ),
    },
    "bigwin": {
        "num_frames": 81,
        "prompt": (
            "Both arms rise slowly overhead in a single unhurried gesture of absolute "
            "triumph. The foxfire erupts in a wide, dramatic arc behind her. Her long "
            "silver hair billows outward. Her expression is quiet magnificence -- eyes "
            "half-lidded, the corners of her mouth lifted in serene victory. "
            "Not jubilation. Inevitability. The bearing of someone who has always known she would win."
        ),
    },
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def upload(path: str) -> str:
    name = os.path.basename(path)
    # detect content type
    ct = "image/webp" if path.endswith(".webp") else "image/png"
    init = requests.post(STORAGE_INIT, headers=H_JSON,
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


def submit_clip(name: str, cfg: dict, image_url: str) -> dict:
    """Submit one clip to Wan and return {name, request_id, status_url, response_url}."""
    body = {
        "image_url":        image_url,
        "prompt":           cfg["prompt"],
        "negative_prompt":  NEGATIVE,
        "num_frames":       cfg["num_frames"],
        "resolution":       "720p",
        "frames_per_second": 16,
        "aspect_ratio":     "9:16",
    }
    r = requests.post(f"{QUEUE_BASE}/{WAN_MODEL}", headers=H_JSON, json=body, timeout=30)
    if r.status_code >= 400:
        raise RuntimeError(f"[{name}] submit {r.status_code}: {r.text[:300]}")
    j = r.json()
    print(f"  {name:12s} -- {cfg['num_frames']} frames -- req {j.get('request_id','?')[:8]}")
    return {"name": name, **j}


def wait_for_clip(job: dict, timeout: int = 600) -> str:
    """Poll until COMPLETED, return video URL."""
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
            print(f"  [{name}] {st} at {int(time.time()-t0)}s")
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
        raise RuntimeError(f"[{name}] no video url: {json.dumps(res)[:300]}")
    return url


def extract_frames(mp4_path: str) -> list:
    """Extract all frames from an MP4. Tries cv2 then ffmpeg."""
    try:
        import cv2, numpy as np
        cap = cv2.VideoCapture(mp4_path)
        frames = []
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frames.append(Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)))
        cap.release()
        return frames
    except ImportError:
        tmp = mp4_path.replace(".mp4", "_frames")
        os.makedirs(tmp, exist_ok=True)
        os.system(f'ffmpeg -i "{mp4_path}" -q:v 1 "{tmp}/f%04d.png" -y -loglevel error')
        files = sorted(f for f in os.listdir(tmp) if f.endswith(".png"))
        imgs = [Image.open(os.path.join(tmp, f)).copy() for f in files]
        for f in files:
            os.remove(os.path.join(tmp, f))
        os.rmdir(tmp)
        return imgs


def make_sheet(frames: list, cols: int, cell_w: int, cell_h: int):
    n = len(frames)
    rows = (n + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cell_w, rows * cell_h), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        r, c = divmod(i, cols)
        resized = frame.convert("RGBA").resize((cell_w, cell_h), Image.LANCZOS)
        sheet.paste(resized, (c * cell_w, r * cell_h))
    return sheet, rows


def process_clip(name: str, video_url: str, num_frames_expected: int):
    mp4_path = os.path.join(OUT_MP4, f"{name}.mp4")
    print(f"[{name}] downloading...", end=" ", flush=True)
    data = requests.get(video_url, headers=H_DL, timeout=300).content
    open(mp4_path, "wb").write(data)
    print(f"{len(data)//1024} KB")

    print(f"[{name}] extracting frames...", end=" ", flush=True)
    frames = extract_frames(mp4_path)
    print(f"{len(frames)} frames")

    sheet, rows = make_sheet(frames, COLS, CELL_W, CELL_H)
    sheet_path = os.path.join(OUT_SHEETS, f"{name}.png")
    sheet.save(sheet_path, "PNG")
    kb = os.path.getsize(sheet_path) // 1024
    print(f"[{name}] sheet {COLS}x{rows} grid  {sheet.width}x{sheet.height}px  {kb} KB")

    meta = {"name": name, "frames": len(frames), "cols": COLS, "rows": rows,
            "cell_w": CELL_W, "cell_h": CELL_H, "loop": name == "idle"}
    with open(os.path.join(OUT_SHEETS, f"{name}_meta.json"), "w") as f:
        json.dump(meta, f, indent=2)
    return meta


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("Uploading avatar...")
    image_url = upload(AVATAR_SRC)
    print(f"  URL: {image_url}\n")

    print(f"Submitting all {len(CLIPS)} clips to Wan 2.2...")
    jobs = []
    for name, cfg in CLIPS.items():
        try:
            jobs.append(submit_clip(name, cfg, image_url))
        except Exception as e:
            print(f"  ERROR submitting {name}: {e}")

    print(f"\nWaiting for {len(jobs)} jobs (running in parallel on fal.ai)...\n")

    # Wait + download + sheet in a thread pool so downloads overlap
    results = {}
    with ThreadPoolExecutor(max_workers=4) as ex:
        future_map = {}
        for job in jobs:
            name = job["name"]
            future = ex.submit(lambda j=job: wait_for_clip(j))
            future_map[future] = name

        for future in as_completed(future_map):
            name = future_map[future]
            try:
                video_url = future.result()
                meta = process_clip(name, video_url, CLIPS[name]["num_frames"])
                results[name] = meta
            except Exception as e:
                print(f"[{name}] ERROR: {e}")

    print("\n" + "=" * 60)
    print(f"Done.  MP4s -> {OUT_MP4}")
    print(f"       Sheets -> {OUT_SHEETS}\n")
    for name in CLIPS:
        if name in results:
            m = results[name]
            print(f"  {name:12s}  {m['frames']:>3} frames  {m['cols']}x{m['rows']} grid")
        else:
            print(f"  {name:12s}  FAILED")


if __name__ == "__main__":
    main()
