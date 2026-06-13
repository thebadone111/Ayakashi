"""VRAM-safe particle generation for 8GB cards (FLUX Q4 is right at the limit).

Differences from gen-batch-1.py that make it reliable here:
  - batch_size 2 (not 4) — halves peak latent VRAM
  - POST /free between jobs — unloads the model + frees CUDA memory so job N+1
    starts from a clean slate (the accumulation is what hung the last run)
  - skip-if-done — if art/generated/<name>/ already has files, skip it, so
    re-running resumes where a timeout left off

Run (ComfyUI already up):
  cd C:\\Users\\tiger\\Desktop\\Stake\\img-gen\\ComfyUI_windows_portable
  python_embeded\\python.exe C:\\...\\Ayakashi\\art\\gen-particles.py
"""
import json, os, shutil, sys, time, uuid
import requests

COMFY_URL  = "http://127.0.0.1:8188"
CLIENT_ID  = str(uuid.uuid4())
COMFY_ROOT = r"C:\Users\tiger\Desktop\Stake\img-gen\ComfyUI_windows_portable"
OUTPUT_DIR = os.path.join(COMFY_ROOT, "ComfyUI", "output")
DEST_ROOT  = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated"

TAIL = "pure black background, white monochrome, high contrast, crisp edges, game VFX asset"
BATCH = 2

JOBS = [
    dict(name="sakura-petal", w=512, h=512, steps=22,
         clip="single sakura petal, white on black, soft, vfx asset",
         t5=f"One single cherry blossom petal, gently curved with a notched tip, soft silky "
            f"texture, floating at a slight angle, {TAIL}"),
    dict(name="paper-shred", w=512, h=512, steps=22,
         clip="torn paper scrap, white on black, vfx asset",
         t5=f"A small torn scrap of washi paper with ragged fibrous edges, slightly curled, "
            f"caught mid-flutter, {TAIL}"),
    dict(name="ember-flake", w=512, h=512, steps=22,
         clip="glowing ember spark, white on black, vfx asset",
         t5=f"A single small glowing ember flake with a bright hot core and delicate trailing "
            f"sparks, mid-air, {TAIL}"),
    dict(name="smoke-wisp", w=512, h=512, steps=22,
         clip="smoke wisp puff, white on black, soft, vfx asset",
         t5=f"A soft curling wisp of smoke, translucent layered curls thinning at the edges, "
            f"single puff, {TAIL}"),
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
        "5":  {"class_type": "EmptyLatentImage",   "inputs": {"width": job["w"], "height": job["h"], "batch_size": BATCH}},
        "13": {"class_type": "SamplerCustomAdvanced", "inputs": {"noise": ["25", 0], "guider": ["22", 0], "sampler": ["16", 0], "sigmas": ["17", 0], "latent_image": ["5", 0]}},
        "38": {"class_type": "VAEDecode",          "inputs": {"samples": ["13", 0], "vae": ["10", 0]}},
        "39": {"class_type": "SaveImage",          "inputs": {"images": ["38", 0], "filename_prefix": f"particles/{job['name']}_"}},
    }


def free_memory():
    try:
        requests.post(f"{COMFY_URL}/free", json={"unload_models": True, "free_memory": True}, timeout=10)
    except Exception as e:
        print(f"  /free warning: {e}", flush=True)
    time.sleep(2)


def run_job(job):
    dest = os.path.join(DEST_ROOT, job["name"])
    if os.path.isdir(dest) and any(f.endswith(".png") for f in os.listdir(dest)):
        print(f"[{job['name']}] already done — skip", flush=True)
        return 0
    seed = int(time.time() * 1000) % (2**31)
    r = requests.post(f"{COMFY_URL}/prompt",
                      json={"prompt": graph(job, seed), "client_id": CLIENT_ID}, timeout=15).json()
    if "prompt_id" not in r:
        print(f"  SUBMIT ERROR {job['name']}: {json.dumps(r)[:400]}", flush=True)
        return 0
    pid = r["prompt_id"]
    print(f"[{job['name']}] seed={seed} ({pid[:8]}) running...", flush=True)
    t0 = time.time()
    while time.time() - t0 < 300:  # 5-min per-job ceiling
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
        print(f"  TIMEOUT {job['name']} after 5min", flush=True)
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
        free_memory()  # clean slate before the next job
    print(f"\nPARTICLES DONE: {total} new images", flush=True)
