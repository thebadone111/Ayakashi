"""P4 brush strokes + P5 flipbook test (VRAM-safe, resumable).

Brush strokes are reliable. The flipbook (8-frame grid) is a TEST — FLUX may
not produce a clean grid; we inspect the result before committing to P5.
batch=2, /free between, skip-if-done.

Run (ComfyUI up):
  cd C:\\...\\ComfyUI_windows_portable
  python_embeded\\python.exe C:\\...\\Ayakashi\\art\\gen-brush-flipbook.py
"""
import json, os, shutil, time, uuid
import requests

COMFY_URL  = "http://127.0.0.1:8188"
CLIENT_ID  = str(uuid.uuid4())
COMFY_ROOT = r"C:\Users\tiger\Desktop\Stake\img-gen\ComfyUI_windows_portable"
OUTPUT_DIR = os.path.join(COMFY_ROOT, "ComfyUI", "output")
DEST_ROOT  = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated"

JOBS = [
    dict(name="brush-stroke-wide", w=1280, h=384, batch=2, steps=26,
         clip="wide dry brush stroke, white ink, black background, sumi-e calligraphy",
         t5="A single wide horizontal dry-brush calligraphy stroke sweeping left to right, "
            "rough bristle streaks and split-hair texture, tapered ragged ends, bold confident "
            "sumi-e energy, pure white ink on pure black background, high contrast, VFX mask asset"),
    dict(name="brush-slash", w=1024, h=1024, batch=2, steps=26,
         clip="diagonal slash brush stroke, white ink, black background, sumi-e",
         t5="A single aggressive diagonal slash brush stroke from lower-left to upper-right, "
            "sharp tapered tips, dry bristle texture, katana-cut energy, pure white ink on pure "
            "black background, high contrast, VFX mask asset"),
    dict(name="foxfire-sheet-test", w=1024, h=1024, batch=1, steps=28,
         clip="sprite sheet 4x2 grid, 8 frames, blue flame burst animation, black background, anime vfx",
         t5="A sprite sheet of exactly 8 sequential animation frames in a clean 4x2 grid with "
            "thin gaps between cells, each cell showing one frame of a ghostly blue-white flame "
            "bursting then dissipating: ignition, expansion, peak flare, breaking apart, fading. "
            "Pure black background, white-blue flame, hand-drawn anime effect, identical framing "
            "per cell, game VFX flipbook"),
]


def graph(job, seed):
    return {
        "25": {"class_type": "RandomNoise",        "inputs": {"noise_seed": seed}},
        "16": {"class_type": "KSamplerSelect",     "inputs": {"sampler_name": "euler"}},
        "17": {"class_type": "BasicScheduler",     "inputs": {"model": ["36", 0], "scheduler": "normal", "steps": job["steps"], "denoise": 1.0}},
        "37": {"class_type": "DualCLIPLoaderGGUF", "inputs": {"clip_name1": "t5xxl_fp8_e4m3fn.safetensors", "clip_name2": "clip_l.safetensors", "type": "flux"}},
        "36": {"class_type": "UnetLoaderGGUF",     "inputs": {"unet_name": "flux1-dev-Q4_K_S.gguf"}},
        "10": {"class_type": "VAELoader",          "inputs": {"vae_name": "ae.safetensors"}},
        "40": {"class_type": "CLIPTextEncodeFlux", "inputs": {"clip": ["37", 0], "clip_l": job["clip"], "t5xxl": job["t5"], "guidance": 3.5}},
        "22": {"class_type": "BasicGuider",        "inputs": {"model": ["36", 0], "conditioning": ["40", 0]}},
        "5":  {"class_type": "EmptyLatentImage",   "inputs": {"width": job["w"], "height": job["h"], "batch_size": job["batch"]}},
        "13": {"class_type": "SamplerCustomAdvanced", "inputs": {"noise": ["25", 0], "guider": ["22", 0], "sampler": ["16", 0], "sigmas": ["17", 0], "latent_image": ["5", 0]}},
        "38": {"class_type": "VAEDecode",          "inputs": {"samples": ["13", 0], "vae": ["10", 0]}},
        "39": {"class_type": "SaveImage",          "inputs": {"images": ["38", 0], "filename_prefix": f"bf/{job['name']}_"}},
    }


def free_memory():
    try:
        requests.post(f"{COMFY_URL}/free", json={"unload_models": True, "free_memory": True}, timeout=10)
    except Exception:
        pass
    time.sleep(2)


def run_job(job):
    dest = os.path.join(DEST_ROOT, job["name"])
    if os.path.isdir(dest) and any(f.endswith(".png") for f in os.listdir(dest)):
        print(f"[{job['name']}] already done — skip", flush=True)
        return 0
    seed = int(time.time() * 1000) % (2**31)
    r = requests.post(f"{COMFY_URL}/prompt", json={"prompt": graph(job, seed), "client_id": CLIENT_ID}, timeout=15).json()
    if "prompt_id" not in r:
        print(f"  SUBMIT ERROR {job['name']}: {json.dumps(r)[:400]}", flush=True)
        return 0
    pid = r["prompt_id"]
    print(f"[{job['name']}] seed={seed} ({pid[:8]}) running...", flush=True)
    t0 = time.time()
    while time.time() - t0 < 420:
        time.sleep(4)
        try:
            hist = requests.get(f"{COMFY_URL}/history/{pid}", timeout=10).json()
        except Exception:
            continue
        if pid not in hist:
            continue
        st = hist[pid].get("status", {}).get("status_str", "")
        if st == "success":
            break
        if st == "error":
            print(f"  GEN ERROR {job['name']}: {hist[pid]['status'].get('messages', [])}", flush=True)
            return 0
    else:
        print(f"  TIMEOUT {job['name']}", flush=True)
        return 0
    os.makedirs(dest, exist_ok=True)
    n = 0
    for node_out in hist[pid].get("outputs", {}).values():
        for img in node_out.get("images", []):
            sub = img.get("subfolder", "")
            src = os.path.join(OUTPUT_DIR, sub, img["filename"]) if sub else os.path.join(OUTPUT_DIR, img["filename"])
            shutil.copy2(src, os.path.join(dest, img["filename"]))
            n += 1
    print(f"  -> {n} images ({time.time()-t0:.0f}s)", flush=True)
    return n


if __name__ == "__main__":
    total = 0
    for job in JOBS:
        total += run_job(job)
        free_memory()
    print(f"\nBRUSH/FLIPBOOK DONE: {total} new images", flush=True)
