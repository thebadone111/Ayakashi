"""Shared fal.ai helpers for Ayakashi asset generation.

Two responsibilities, kept in one file so per-asset drivers stay thin:

  gen_one(model, body, output_path)    — submit, poll, download, save with
                                          resume-by-prompt-hash sidecar
  gen_batch(variants, output_root, n)   — fan out gen_one across variants
                                          and N candidates per variant
  build_contact_sheet(dir, output)      — labelled grid of all PNGs in
                                          subdirs of dir

Auth via FAL_KEY env ("id:secret"). All HTTP via `requests`, no fal_client
dep — see [memory/asset-pipeline] for why we kept this lean.

Resume model (replaces the file-size check that bit us 2026-06-15 when
prompt changes were silently dropped): every saved image gets a sidecar
`<output_path>.prompt.sha` containing sha256(json.dumps(body)). On a
rerun, gen_one regenerates whenever the sha differs OR is missing,
regardless of file size. Hand-deleting the sha forces a regen.
"""
import hashlib
import json
import os
import sys
import time
import glob
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

from PIL import Image, ImageDraw, ImageFont

# ============================================================================
# fal.ai HTTP
# ============================================================================

QUEUE_BASE = "https://queue.fal.run"
_DL_HEADERS = {"User-Agent": "Mozilla/5.0"}


def _auth_headers():
    key = os.environ.get("FAL_KEY", "")
    if not key:
        print("ERROR: set FAL_KEY env var"); sys.exit(1)
    return {"Authorization": f"Key {key}"}


def _body_hash(body: dict) -> str:
    return hashlib.sha256(
        json.dumps(body, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()


def _extract_image_url(res: dict):
    img = res.get("image")
    if isinstance(img, dict) and img.get("url"): return img["url"]
    if isinstance(img, str) and img.startswith("http"): return img
    imgs = res.get("images")
    if isinstance(imgs, list) and imgs:
        first = imgs[0]
        if isinstance(first, str) and first.startswith("http"): return first
        if isinstance(first, dict):
            return first.get("url") or first.get("image")
    return None


# ============================================================================
# gen_one — single submission with resume-by-hash
# ============================================================================

def gen_one(model: str, body: dict, output_path: str, *,
            timeout: int = 600, poll_every: int = 4, label: str = None):
    """Submit one fal.ai gen and save to output_path.

    Resume logic: if output_path exists AND <output_path>.prompt.sha
    matches sha256(body), skip and return the existing path. If hash is
    missing or differs, regenerate.
    """
    h_auth = _auth_headers()
    h_json = {**h_auth, "Content-Type": "application/json"}
    sha = _body_hash(body)
    sha_path = output_path + ".prompt.sha"
    label = label or os.path.splitext(os.path.basename(output_path))[0]

    # Resume
    if os.path.exists(output_path) and os.path.exists(sha_path):
        with open(sha_path) as f:
            if f.read().strip() == sha:
                print(f"  SKIP {label} (hash match)")
                return output_path

    t0 = time.time()
    try:
        r = requests.post(f"{QUEUE_BASE}/{model}", headers=h_json, json=body, timeout=30)
        if r.status_code >= 400:
            print(f"  [{label}] SUBMIT {r.status_code}: {r.text[:200]}"); return None
        j = r.json()
        print(f"  [{label}] req={j.get('request_id','?')[:8]}", flush=True)
    except Exception as e:
        print(f"  [{label}] SUBMIT EXC: {e}"); return None

    status_url, response_url = j["status_url"], j["response_url"]
    last_log = t0
    err_count = 0
    while time.time() - t0 < timeout:
        time.sleep(poll_every)
        try:
            s = requests.get(status_url, headers=h_auth, timeout=15).json()
            err_count = 0
        except Exception as e:
            err_count += 1
            if err_count <= 3 or err_count % 10 == 0:
                print(f"  [{label}] poll err #{err_count}: {e}", flush=True)
            continue
        st = s.get("status", "?")
        # Heartbeat every 30s so a slow queue doesn't look like a hang
        if time.time() - last_log >= 30:
            print(f"  [{label}] still {st} at {int(time.time()-t0)}s", flush=True)
            last_log = time.time()
        if st == "COMPLETED": break
        if st in ("FAILED", "ERROR", "CANCELLED"):
            print(f"  [{label}] {st}: {json.dumps(s)[:200]}"); return None
    else:
        print(f"  [{label}] TIMEOUT after {timeout}s"); return None

    try:
        res = requests.get(response_url, headers=h_auth, timeout=30).json()
    except Exception as e:
        print(f"  [{label}] FETCH EXC: {e}"); return None

    url = _extract_image_url(res)
    if not url:
        print(f"  [{label}] NO URL: {json.dumps(res)[:200]}"); return None

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    blob = requests.get(url, headers=_DL_HEADERS, timeout=180).content
    with open(output_path, "wb") as f:
        f.write(blob)
    with open(sha_path, "w") as f:
        f.write(sha)
    print(f"  [{label}] SAVED {len(blob)//1024}KB in {int(time.time()-t0)}s", flush=True)
    return output_path


# ============================================================================
# gen_batch — fan out across variants × candidates
# ============================================================================

def gen_batch(variants: list, output_root: str, *,
              gens_per_variant: int = 3, parallel: int = 3,
              seed_base: int = 0, file_prefix: str = "",
              skip_existing_seeds: dict = None):
    """Run a multi-model A/B with N candidates per variant in parallel.

    `variants` — list of {name, model, body_base}
    `output_root` — dir; per-variant subdirs auto-created
    `file_prefix` — optional prefix for filenames (e.g. symbol key "h2")
    `skip_existing_seeds` — {variant_name: callable(idx) -> int} override
                            for seed selection per slot

    Returns dict {variant_name: [paths]}.
    """
    os.makedirs(output_root, exist_ok=True)

    def _seed_for(vname, idx):
        if skip_existing_seeds and vname in skip_existing_seeds:
            return skip_existing_seeds[vname](idx)
        return seed_base + idx * 13

    def _run(v, idx):
        body = dict(v["body_base"])
        body["seed"] = _seed_for(v["name"], idx)
        sub = os.path.join(output_root, v["name"])
        prefix = f"{file_prefix}_" if file_prefix else ""
        fn = os.path.join(sub, f"{prefix}{v['name']}_{idx:02d}.png")
        label = f"{file_prefix}/{v['name']}_{idx:02d}" if file_prefix else f"{v['name']}_{idx:02d}"
        return v["name"], gen_one(v["model"], body, fn, label=label)

    jobs = [(v, i) for v in variants for i in range(1, gens_per_variant + 1)]
    print(f"Generating {len(jobs)} images across {len(variants)} model(s) (parallel={parallel})")
    print(f"Output: {output_root}\n")
    t_start = time.time()
    results = {v["name"]: [] for v in variants}
    with ThreadPoolExecutor(max_workers=parallel) as ex:
        futs = [ex.submit(_run, v, i) for (v, i) in jobs]
        for f in as_completed(futs):
            name, path = f.result()
            if path:
                results[name].append(path)
    ok = sum(len(v) for v in results.values())
    print(f"\nDONE in {int(time.time()-t_start)}s — {ok}/{len(jobs)} saved")
    return results


# ============================================================================
# build_contact_sheet — labelled grid of all PNGs in subdirs
# ============================================================================

def build_contact_sheet(dir_path: str, *, output_name: str = "_contact.jpg",
                        cols: int = 3, tile_w: int = 700, tile_h: int = 700,
                        label_h: int = 32, pad: int = 10,
                        bg_rgb: tuple = (12, 14, 22)):
    """Build a labelled grid contact sheet of all PNGs in subdirs of dir_path.

    Walks one level deep — each subdir is treated as a model/variant group.
    Output saved to <dir_path>/<output_name>.
    """
    if not os.path.isdir(dir_path):
        print(f"ERROR: {dir_path} not found"); return None

    items = []
    for variant in sorted(os.listdir(dir_path)):
        v_dir = os.path.join(dir_path, variant)
        if not os.path.isdir(v_dir): continue
        for p in sorted(glob.glob(os.path.join(v_dir, "*.png"))):
            items.append((os.path.basename(p)[:-4], p))
    if not items:
        print(f"ERROR: no images in {dir_path}"); return None
    print(f"found {len(items)} candidate(s)")

    rows = (len(items) + cols - 1) // cols
    sheet_w = cols * tile_w + (cols + 1) * pad
    sheet_h = rows * (tile_h + label_h + pad) + pad
    sheet = Image.new("RGB", (sheet_w, sheet_h), bg_rgb)
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("arial.ttf", 18)
    except IOError:
        font = ImageFont.load_default()

    for i, (label, path) in enumerate(items):
        col, row = i % cols, i // cols
        x = pad + col * (tile_w + pad)
        y = pad + row * (tile_h + label_h + pad)
        draw.text((x + 4, y + 4), label, fill=(220, 220, 230), font=font)
        im = Image.open(path).convert("RGB")
        im.thumbnail((tile_w, tile_h), Image.LANCZOS)
        ix = x + (tile_w - im.width) // 2
        iy = y + label_h + (tile_h - im.height) // 2
        sheet.paste(im, (ix, iy))

    out = os.path.join(dir_path, output_name)
    sheet.save(out, "JPEG", quality=88)
    print(f"saved {out} ({os.path.getsize(out)//1024} KB, {sheet.size})")
    return out


# ============================================================================
# CLI: `python fal_generate.py contact <dir>`
# ============================================================================

if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "contact":
        build_contact_sheet(sys.argv[2])
    else:
        print("Usage: python fal_generate.py contact <dir>")
        print("       (gen_one / gen_batch are used by per-asset scripts)")
