"""Avatar reaction poses via FLUX img2img (VRAM-safe, resumable).

denoise 0.5 keeps her identity/outfit/colours while changing pose+expression.
/free between jobs; skip-if-done. Source is the live avatar.webp so poses
match exactly. Batch 2.

Run (ComfyUI up):
  cd C:\\...\\ComfyUI_windows_portable
  python_embeded\\python.exe C:\\...\\Ayakashi\\art\\gen-avatar-poses.py
"""
import json, os, shutil, time, uuid
import requests

COMFY_URL  = "http://127.0.0.1:8188"
CLIENT_ID  = str(uuid.uuid4())
COMFY_ROOT = r"C:\Users\tiger\Desktop\Stake\img-gen\ComfyUI_windows_portable"
OUTPUT_DIR = os.path.join(COMFY_ROOT, "ComfyUI", "output")
INPUT_DIR  = os.path.join(COMFY_ROOT, "ComfyUI", "input")
DEST_ROOT  = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated"
AVATAR_SRC = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\web-sdk\apps\lines\static\assets\sprites\avatar\avatar.webp"

IDENTITY = ("the same kitsune fox-spirit girl with white hair, fox ears, flowing white "
            "fox tails and the identical red and dark-blue kimono outfit, identical art "
            "style, identical colors and proportions, full body, dark atmospheric "
            "background, painterly anime illustration, Demon Slayer character art quality")

JOBS = [
    dict(name="avatar-cheer", denoise=0.5, batch=2, steps=28,
         clip="kitsune fox girl, white hair, red kimono, cheerful celebration, arms raised, anime",
         t5=f"{IDENTITY}, now celebrating joyfully with both arms raised high and a delighted "
            f"open-mouth smile, eyes bright and sparkling"),
    dict(name="avatar-wink", denoise=0.45, batch=2, steps=28,
         clip="kitsune fox girl, white hair, red kimono, winking, playful wave, anime",
         t5=f"{IDENTITY}, now winking playfully with one eye closed and a mischievous smile, "
            f"one hand raised in a small friendly wave"),
]


def graph(job, seed, input_name):
    return {
        "1":  {"class_type": "LoadImage",          "inputs": {"image": input_name}},
        "10": {"class_type": "VAELoader",          "inputs": {"vae_name": "ae.safetensors"}},
        "2":  {"class_type": "VAEEncode",          "inputs": {"pixels": ["1", 0], "vae": ["10", 0]}},
        "5":  {"class_type": "RepeatLatentBatch",  "inputs": {"samples": ["2", 0], "amount": job["batch"]}},
        "25": {"class_type": "RandomNoise",        "inputs": {"noise_seed": seed}},
        "16": {"class_type": "KSamplerSelect",     "inputs": {"sampler_name": "euler"}},
        "17": {"class_type": "BasicScheduler",     "inputs": {"model": ["36", 0], "scheduler": "normal", "steps": job["steps"], "denoise": job["denoise"]}},
        "37": {"class_type": "DualCLIPLoaderGGUF", "inputs": {"clip_name1": "t5xxl_fp8_e4m3fn.safetensors", "clip_name2": "clip_l.safetensors", "type": "flux"}},
        "36": {"class_type": "UnetLoaderGGUF",     "inputs": {"unet_name": "flux1-dev-Q4_K_S.gguf"}},
        "40": {"class_type": "CLIPTextEncodeFlux", "inputs": {"clip": ["37", 0], "clip_l": job["clip"], "t5xxl": job["t5"], "guidance": 3.5}},
        "22": {"class_type": "BasicGuider",        "inputs": {"model": ["36", 0], "conditioning": ["40", 0]}},
        "13": {"class_type": "SamplerCustomAdvanced", "inputs": {"noise": ["25", 0], "guider": ["22", 0], "sampler": ["16", 0], "sigmas": ["17", 0], "latent_image": ["5", 0]}},
        "38": {"class_type": "VAEDecode",          "inputs": {"samples": ["13", 0], "vae": ["10", 0]}},
        "39": {"class_type": "SaveImage",          "inputs": {"images": ["38", 0], "filename_prefix": f"avatar/{job['name']}_"}},
    }


def free_memory():
    try:
        requests.post(f"{COMFY_URL}/free", json={"unload_models": True, "free_memory": True}, timeout=10)
    except Exception:
        pass
    time.sleep(2)


def run_job(job, input_name):
    dest = os.path.join(DEST_ROOT, job["name"])
    if os.path.isdir(dest) and any(f.endswith(".png") for f in os.listdir(dest)):
        print(f"[{job['name']}] already done — skip", flush=True)
        return 0
    seed = int(time.time() * 1000) % (2**31)
    r = requests.post(f"{COMFY_URL}/prompt",
                      json={"prompt": graph(job, seed, input_name), "client_id": CLIENT_ID}, timeout=15).json()
    if "prompt_id" not in r:
        print(f"  SUBMIT ERROR {job['name']}: {json.dumps(r)[:400]}", flush=True)
        return 0
    pid = r["prompt_id"]
    print(f"[{job['name']}] seed={seed} ({pid[:8]}) running...", flush=True)
    t0 = time.time()
    while time.time() - t0 < 360:
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
    input_name = os.path.basename(AVATAR_SRC)
    shutil.copy2(AVATAR_SRC, os.path.join(INPUT_DIR, input_name))
    total = 0
    for job in JOBS:
        total += run_job(job, input_name)
        free_memory()
    print(f"\nAVATAR POSES DONE: {total} new images", flush=True)
