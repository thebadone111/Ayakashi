"""Ayakashi generation batch #1 — P3 particles, P4 brush strokes, P5 flipbook
FX sheets, P6 avatar poses. One ComfyUI lifetime, sequential jobs.

All particle/stroke art is WHITE on BLACK: luminance becomes the alpha at
integration time and ParticlePool tints at runtime, so one sprite serves
every palette.

Run with ComfyUI's python (has requests):
  cd C:\\Users\\tiger\\Desktop\\Stake\\img-gen\\ComfyUI_windows_portable
  python_embeded\\python.exe C:\\Users\\tiger\\Desktop\\Stake\\game-1\\Ayakashi\\art\\gen-batch-1.py
"""
import json, os, shutil, sys, time, uuid
import requests

COMFY_URL  = "http://127.0.0.1:8188"
CLIENT_ID  = str(uuid.uuid4())
COMFY_ROOT = r"C:\Users\tiger\Desktop\Stake\img-gen\ComfyUI_windows_portable"
OUTPUT_DIR = os.path.join(COMFY_ROOT, "ComfyUI", "output")
INPUT_DIR  = os.path.join(COMFY_ROOT, "ComfyUI", "input")
DEST_ROOT  = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated"
AVATAR_SRC = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\web-sdk\apps\lines\static\assets\sprites\avatar\avatar.webp"

STYLE_TAIL = ("pure black background, white monochrome, high contrast, "
              "crisp alpha-ready edges, professional game VFX asset")

JOBS = [
    # ── P3: particle textures (white on black, tinted at runtime) ───────────
    dict(name="ink-splatter", w=768, h=768, batch=4, steps=24,
         clip="white ink splatter, sumi-e, black background, vfx asset",
         t5=f"A single dynamic ink splatter with irregular organic edges, fine droplet spray "
            f"around a dense centre, sumi-e calligraphy energy, {STYLE_TAIL}"),
    dict(name="sakura-petal", w=512, h=512, batch=4, steps=24,
         clip="single sakura petal, white on black, soft, vfx asset",
         t5=f"One single cherry blossom petal, gently curved with a notched tip, soft silky "
            f"texture, floating at a slight angle, {STYLE_TAIL}"),
    dict(name="paper-shred", w=512, h=512, batch=4, steps=24,
         clip="torn paper scrap, white on black, vfx asset",
         t5=f"A small torn scrap of washi paper with ragged fibrous edges, slightly curled, "
            f"caught mid-flutter, {STYLE_TAIL}"),
    dict(name="ember-flake", w=512, h=512, batch=4, steps=24,
         clip="glowing ember spark, white on black, vfx asset",
         t5=f"A single small glowing ember flake with a bright hot core and delicate trailing "
            f"sparks, mid-air, {STYLE_TAIL}"),
    dict(name="smoke-wisp", w=512, h=512, batch=4, steps=24,
         clip="smoke wisp puff, white on black, soft, vfx asset",
         t5=f"A soft curling wisp of smoke, translucent layered curls thinning at the edges, "
            f"single puff, {STYLE_TAIL}"),
    # ── P4: brush strokes ────────────────────────────────────────────────────
    dict(name="brush-stroke-wide", w=1280, h=512, batch=4, steps=28,
         clip="wide dry brush stroke, white ink, black background, sumi-e",
         t5=f"A single wide horizontal dry-brush calligraphy stroke sweeping left to right, "
            f"rough bristle streaks, tapered ragged ends, bold confident sumi-e energy, {STYLE_TAIL}"),
    dict(name="brush-slash-diag", w=1024, h=1024, batch=4, steps=28,
         clip="diagonal slash brush stroke, white ink, black background, sumi-e",
         t5=f"A single aggressive diagonal slash brush stroke from lower-left to upper-right, "
            f"sharp tapered tips, dry bristle texture, katana-cut energy, {STYLE_TAIL}"),
    # ── P5: flipbook FX sheets ───────────────────────────────────────────────
    dict(name="foxfire-burst-sheet", w=1024, h=1024, batch=3, steps=30,
         clip="sprite sheet, 8 frames, fire burst animation, grid, black background, anime vfx",
         t5="A sprite sheet of exactly 8 animation frames arranged in a 4x2 grid, showing a "
            "ghostly flame bursting outward then dissipating into wisps: frame 1 small ignition, "
            "frames 2-4 expanding flare with licking tongues, frames 5-8 breaking apart and fading. "
            "White-blue flame on pure black background, hand-drawn anime effect animation style, "
            "consistent scale and centring across all frames, professional game VFX flipbook"),
    dict(name="slash-arc-sheet", w=1024, h=1024, batch=3, steps=30,
         clip="sprite sheet, 8 frames, slash arc animation, grid, black background, anime vfx",
         t5="A sprite sheet of exactly 8 animation frames arranged in a 4x2 grid, showing a "
            "curved katana slash arc appearing and fading: frame 1 thin bright crescent forming, "
            "frames 2-4 full sweeping arc with motion streaks, frames 5-8 arc dissolving into "
            "speed lines. White on pure black background, hand-drawn anime effect animation, "
            "consistent scale and centring across frames, professional game VFX flipbook"),
    # ── P6: avatar poses (img2img) ───────────────────────────────────────────
    dict(name="avatar-cheer", w=0, h=0, batch=4, steps=30, img2img=AVATAR_SRC, denoise=0.5,
         clip="kitsune fox girl, white hair, red kimono, cheerful celebration pose, anime",
         t5="The same kitsune fox-spirit girl with white hair, fox ears, flowing white fox "
            "tails and the identical red and dark-blue kimono outfit, now celebrating joyfully "
            "with both arms raised and a delighted open-mouth smile, eyes sparkling, identical "
            "art style, identical colors and proportions, full body, dark atmospheric background, "
            "painterly anime illustration, Demon Slayer character art quality"),
    dict(name="avatar-wink", w=0, h=0, batch=4, steps=30, img2img=AVATAR_SRC, denoise=0.45,
         clip="kitsune fox girl, white hair, red kimono, winking, playful, anime",
         t5="The same kitsune fox-spirit girl with white hair, fox ears, flowing white fox "
            "tails and the identical red and dark-blue kimono outfit, now winking playfully with "
            "one eye closed and a mischievous smile, one hand raised in a small wave, identical "
            "art style, identical colors and proportions, full body, dark atmospheric background, "
            "painterly anime illustration, Demon Slayer character art quality"),
]


def graph(job, seed, input_name=None):
    g = {
        "25": {"class_type": "RandomNoise",        "inputs": {"noise_seed": seed}},
        "16": {"class_type": "KSamplerSelect",     "inputs": {"sampler_name": "euler"}},
        "17": {"class_type": "BasicScheduler",     "inputs": {"model": ["36", 0], "scheduler": "normal", "steps": job["steps"], "denoise": job.get("denoise", 1.0)}},
        "37": {"class_type": "DualCLIPLoaderGGUF", "inputs": {"clip_name1": "t5xxl_fp8_e4m3fn.safetensors", "clip_name2": "clip_l.safetensors", "type": "flux"}},
        "36": {"class_type": "UnetLoaderGGUF",     "inputs": {"unet_name": "flux1-dev-Q4_K_S.gguf"}},
        "10": {"class_type": "VAELoader",          "inputs": {"vae_name": "ae.safetensors"}},
        "40": {"class_type": "CLIPTextEncodeFlux", "inputs": {"clip": ["37", 0], "clip_l": job["clip"], "t5xxl": job["t5"], "guidance": 3.5}},
        "22": {"class_type": "BasicGuider",        "inputs": {"model": ["36", 0], "conditioning": ["40", 0]}},
        "13": {"class_type": "SamplerCustomAdvanced", "inputs": {"noise": ["25", 0], "guider": ["22", 0], "sampler": ["16", 0], "sigmas": ["17", 0], "latent_image": ["5", 0]}},
        "38": {"class_type": "VAEDecode",          "inputs": {"samples": ["13", 0], "vae": ["10", 0]}},
        "39": {"class_type": "SaveImage",          "inputs": {"images": ["38", 0], "filename_prefix": f"batch1/{job['name']}_"}},
    }
    if input_name:  # img2img
        g["1"] = {"class_type": "LoadImage",        "inputs": {"image": input_name}}
        g["2"] = {"class_type": "VAEEncode",        "inputs": {"pixels": ["1", 0], "vae": ["10", 0]}}
        g["5"] = {"class_type": "RepeatLatentBatch", "inputs": {"samples": ["2", 0], "amount": job["batch"]}}
    else:
        g["5"] = {"class_type": "EmptyLatentImage", "inputs": {"width": job["w"], "height": job["h"], "batch_size": job["batch"]}}
    return g


def wait_ready(timeout=240):
    print("Waiting for ComfyUI", end="", flush=True)
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            if requests.get(f"{COMFY_URL}/object_info", timeout=3).status_code == 200:
                print(" ready!", flush=True)
                return True
        except Exception:
            pass
        print(".", end="", flush=True)
        time.sleep(3)
    return False


def run_job(job):
    input_name = None
    if job.get("img2img"):
        input_name = os.path.basename(job["img2img"])
        shutil.copy2(job["img2img"], os.path.join(INPUT_DIR, input_name))
    seed = int(time.time() * 1000) % (2**31)
    r = requests.post(f"{COMFY_URL}/prompt",
                      json={"prompt": graph(job, seed, input_name), "client_id": CLIENT_ID},
                      timeout=15).json()
    if "prompt_id" not in r:
        print(f"  SUBMIT ERROR {job['name']}: {json.dumps(r)[:500]}", flush=True)
        return []
    pid = r["prompt_id"]
    print(f"[{job['name']}] seed={seed} submitted ({pid[:8]})", flush=True)
    while True:
        time.sleep(5)
        try:
            hist = requests.get(f"{COMFY_URL}/history/{pid}", timeout=10).json()
        except Exception:
            continue
        if pid not in hist:
            continue
        state = hist[pid].get("status", {}).get("status_str", "")
        if state == "success":
            break
        if state == "error":
            print(f"  GEN ERROR {job['name']}: {hist[pid]['status'].get('messages', [])}", flush=True)
            return []
    dest = os.path.join(DEST_ROOT, job["name"])
    os.makedirs(dest, exist_ok=True)
    moved = []
    for node_out in hist[pid].get("outputs", {}).values():
        for img in node_out.get("images", []):
            sub = img.get("subfolder", "")
            src = os.path.join(OUTPUT_DIR, sub, img["filename"]) if sub else os.path.join(OUTPUT_DIR, img["filename"])
            shutil.copy2(src, os.path.join(dest, img["filename"]))
            moved.append(img["filename"])
    print(f"  -> {len(moved)} images to {dest}", flush=True)
    return moved


if __name__ == "__main__":
    if not wait_ready():
        print("ComfyUI never came up", flush=True)
        sys.exit(1)
    total = 0
    for job in JOBS:
        total += len(run_job(job))
    print(f"\nBATCH DONE: {total} images across {len(JOBS)} jobs", flush=True)
