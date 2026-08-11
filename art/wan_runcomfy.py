"""RunComfy serverless driver for the locked v5 single-pass Wan 2.2 I2V SVI Pro workflow.

Sends the FULL v5 graph inline per request (workflow_api_json mode) against the
`ayakashi-wan-idle` deployment, so the deployment's stored (old 5-pass) workflow
is bypassed entirely. Input image is embedded as a base64 data URI.

Graph = exact port of "v5 - 1 pass (1).json" (UI format -> API format), with:
  - cfg forced to 1 on BOTH KSamplers (attached file had a stray cfg=28 on the
    low-noise sampler; LightX2V 4-step LoRA requires cfg=1 — matches node 277
    and the validated 2026-06-30 config)
  - LoadImage fed via base64 data URI
  - fresh random seeds per run unless pinned

Usage:
  python wan_runcomfy.py --input <input.png> --prompt-file <prompt.txt> --label h5 --out <dir>
  python wan_runcomfy.py --input ... --prompt "..." --label h5 --out ...

Env: RUNCOMFY_API_KEY (falls back to baked key), RUNCOMFY_WAN_DEPLOYMENT_ID.
"""
import argparse
import base64
import json
import mimetypes
import os
import random
import sys
import time

import requests

API = "https://api.runcomfy.net/prod/v2"
KEY = os.environ.get("RUNCOMFY_API_KEY", "e71e19b6-0ded-435a-8caf-948090ca77d1")
DEP = os.environ.get("RUNCOMFY_WAN_DEPLOYMENT_ID", "274fbd0c-e4fc-4097-848d-24552911e37b")
HEADERS = {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
DL_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"}

NEGATIVE = ("色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，"
            "低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，"
            "毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走")


def image_to_datauri(path):
    mime = mimetypes.guess_type(path)[0] or "image/png"
    with open(path, "rb") as fh:
        b64 = base64.b64encode(fh.read()).decode("ascii")
    return f"data:{mime};base64,{b64}"


def build_v5_graph(image_datauri, prompt, seed_hi=None, seed_lo=None,
                   length=97, scale_to_length=720, prefix="render",
                   unet_high="wan22RemixT2VI2V_i2vHighV30.safetensors",
                   unet_low="wan22RemixT2VI2V_i2vLowV30.safetensors",
                   use_gguf=False, with_post=True):
    """Exact v5 single-pass graph in ComfyUI API format."""
    seed_hi = seed_hi if seed_hi is not None else random.getrandbits(48)
    seed_lo = seed_lo if seed_lo is not None else random.getrandbits(48)

    if use_gguf:
        high_loader = {"inputs": {"unet_name": unet_high}, "class_type": "UnetLoaderGGUF",
                       "_meta": {"title": "High UNET (GGUF)"}}
        low_loader = {"inputs": {"unet_name": unet_low}, "class_type": "UnetLoaderGGUF",
                      "_meta": {"title": "Low UNET (GGUF)"}}
    else:
        high_loader = {"inputs": {"unet_name": unet_high, "weight_dtype": "default"},
                       "class_type": "UNETLoader", "_meta": {"title": "High UNET"}}
        low_loader = {"inputs": {"unet_name": unet_low, "weight_dtype": "default"},
                      "class_type": "UNETLoader", "_meta": {"title": "Low UNET"}}

    g = {
        # ── loaders ──────────────────────────────────────────────────────────
        "84": {"inputs": {"clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
                          "type": "wan", "device": "default"},
               "class_type": "CLIPLoader", "_meta": {"title": "Load CLIP"}},
        "90": {"inputs": {"vae_name": "wan_2.1_vae.safetensors"},
               "class_type": "VAELoader", "_meta": {"title": "Load VAE"}},
        "437": high_loader,
        "436": low_loader,
        # ── LoRA stacks (SVI PRO 0.7 -> LightX2V 0.7) ───────────────────────
        "455": {"inputs": {"model": ["437", 0],
                           "lora_name": "SVI_v2_PRO_Wan2.2-I2V-A14B_HIGH_lora_rank_128_fp16.safetensors",
                           "strength_model": 0.7},
                "class_type": "LoraLoaderModelOnly", "_meta": {"title": "SVI HIGH 0.7"}},
        "456": {"inputs": {"model": ["436", 0],
                           "lora_name": "SVI_v2_PRO_Wan2.2-I2V-A14B_LOW_lora_rank_128_fp16.safetensors",
                           "strength_model": 0.7},
                "class_type": "LoraLoaderModelOnly", "_meta": {"title": "SVI LOW 0.7"}},
        "101": {"inputs": {"model": ["455", 0],
                           "lora_name": "wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors",
                           "strength_model": 0.7},
                "class_type": "LoraLoaderModelOnly", "_meta": {"title": "LightX2V HIGH 0.7"}},
        "102": {"inputs": {"model": ["456", 0],
                           "lora_name": "wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors",
                           "strength_model": 0.7},
                "class_type": "LoraLoaderModelOnly", "_meta": {"title": "LightX2V LOW 0.7"}},
        "434": {"inputs": {"model": ["101", 0], "shift": 8},
                "class_type": "ModelSamplingSD3", "_meta": {"title": "Shift 8 High"}},
        "435": {"inputs": {"model": ["102", 0], "shift": 8},
                "class_type": "ModelSamplingSD3", "_meta": {"title": "Shift 8 Low"}},
        # ── input image ─────────────────────────────────────────────────────
        "97": {"inputs": {"image": image_datauri},
               "class_type": "LoadImage", "_meta": {"title": "Load Image"}},
        "398": {"inputs": {"image": ["97", 0], "aspect_ratio": "original",
                           "proportional_width": 1, "proportional_height": 1,
                           "fit": "letterbox", "method": "lanczos",
                           "round_to_multiple": "8", "scale_to_side": "longest",
                           "scale_to_length": scale_to_length,
                           "background_color": "#000000"},
                "class_type": "LayerUtility: ImageScaleByAspectRatio V2",
                "_meta": {"title": "Resolution"}},
        "443": {"inputs": {"pixels": ["398", 0], "vae": ["90", 0]},
                "class_type": "VAEEncode", "_meta": {"title": "VAE Encode"}},
        # ── prompts ─────────────────────────────────────────────────────────
        "366": {"inputs": {"prompt": prompt},
                "class_type": "CR Prompt Text", "_meta": {"title": "Prompt"}},
        "93": {"inputs": {"clip": ["84", 0], "text": ["366", 0]},
               "class_type": "CLIPTextEncode", "_meta": {"title": "Positive"}},
        "89": {"inputs": {"clip": ["84", 0], "text": NEGATIVE},
               "class_type": "CLIPTextEncode", "_meta": {"title": "Negative"}},
        # ── SVI Pro single pass ─────────────────────────────────────────────
        "442": {"inputs": {"positive": ["93", 0], "negative": ["89", 0],
                           "anchor_samples": ["443", 0],
                           "length": length, "motion_latent_count": 1},
                "class_type": "WanImageToVideoSVIPro", "_meta": {"title": "SVI Pro"}},
        # ── step constants ──────────────────────────────────────────────────
        "337": {"inputs": {"value": 8}, "class_type": "INTConstant",
                "_meta": {"title": "steps"}},
        "338": {"inputs": {"value": 4}, "class_type": "INTConstant",
                "_meta": {"title": "split step"}},
        # ── samplers (High 0->4, Low 4->end), cfg=1 both ────────────────────
        "277": {"inputs": {"model": ["434", 0], "positive": ["442", 0],
                           "negative": ["442", 1], "latent_image": ["442", 2],
                           "add_noise": "enable", "noise_seed": seed_hi,
                           "steps": ["337", 0], "cfg": 1,
                           "sampler_name": "euler", "scheduler": "simple",
                           "start_at_step": 0, "end_at_step": ["338", 0],
                           "return_with_leftover_noise": "enable"},
                "class_type": "KSamplerAdvanced", "_meta": {"title": "KSampler High"}},
        "278": {"inputs": {"model": ["435", 0], "positive": ["442", 0],
                           "negative": ["442", 1], "latent_image": ["277", 0],
                           "add_noise": "disable", "noise_seed": seed_lo,
                           "steps": ["337", 0], "cfg": 1,
                           "sampler_name": "euler", "scheduler": "simple",
                           "start_at_step": ["338", 0], "end_at_step": 10000,
                           "return_with_leftover_noise": "disable"},
                "class_type": "KSamplerAdvanced", "_meta": {"title": "KSampler Low"}},
        "87": {"inputs": {"samples": ["278", 0], "vae": ["90", 0]},
               "class_type": "VAEDecode", "_meta": {"title": "VAE Decode"}},
    }
    if not with_post:
        # Raw 16fps encode straight off the decode (RIFE/ESRGAN not on the
        # serverless image — post-process locally instead).
        g["461"] = {"inputs": {"images": ["87", 0], "frame_rate": 16, "loop_count": 0,
                               "filename_prefix": prefix, "format": "video/h264-mp4",
                               "pix_fmt": "yuv420p", "crf": 19, "save_metadata": True,
                               "trim_to_audio": False, "pingpong": False,
                               "save_output": True},
                    "class_type": "VHS_VideoCombine", "_meta": {"title": "render"}}
        return g
    g.update({
        # ── post: RIFE 2x -> RealESRGAN 4x -> two encodes ───────────────────
        "452": {"inputs": {"frames": ["87", 0], "ckpt_name": "rife417.pth",
                           "clear_cache_after_n_frames": 10, "multiplier": 2,
                           "fast_mode": True, "ensemble": True, "scale_factor": 1,
                           "dtype": "float32", "torch_compile": False, "batch_size": 1},
                "class_type": "RIFE VFI", "_meta": {"title": "RIFE 2x"}},
        "458": {"inputs": {"model_name": "RealESRGAN_x4plus_anime_6B.pth"},
                "class_type": "UpscaleModelLoader", "_meta": {"title": "Upscale Model"}},
        "463": {"inputs": {"upscale_model": ["458", 0], "image": ["452", 0]},
                "class_type": "ImageUpscaleWithModel", "_meta": {"title": "Upscale 4x"}},
        "461": {"inputs": {"images": ["463", 0], "frame_rate": 32, "loop_count": 0,
                           "filename_prefix": prefix, "format": "video/h264-mp4",
                           "pix_fmt": "yuv420p", "crf": 19, "save_metadata": True,
                           "trim_to_audio": False, "pingpong": False,
                           "save_output": True},
                "class_type": "VHS_VideoCombine", "_meta": {"title": "render"}},
        "465": {"inputs": {"images": ["463", 0], "frame_rate": 32, "loop_count": 0,
                           "filename_prefix": f"{prefix}-pingpong",
                           "format": "video/h264-mp4",
                           "pix_fmt": "yuv420p", "crf": 19, "save_metadata": True,
                           "trim_to_audio": False, "pingpong": True,
                           "save_output": True},
                "class_type": "VHS_VideoCombine", "_meta": {"title": "render-pingpong"}},
    })
    return g


def submit(graph):
    r = requests.post(f"{API}/deployments/{DEP}/inference", headers=HEADERS,
                      json={"workflow_api_json": graph}, timeout=120)
    try:
        body = r.json()
    except Exception:
        print(f"SUBMIT HTTP {r.status_code}: {r.text[:800]}")
        return None
    if r.status_code >= 400 or "request_id" not in body:
        print(f"SUBMIT ERROR {r.status_code}: {json.dumps(body)[:1500]}")
        return None
    return body["request_id"]


def poll(req, label="run", timeout=4800, poll_every=15):
    t0 = time.time()
    last = ""
    while time.time() - t0 < timeout:
        time.sleep(poll_every)
        try:
            resp = requests.get(f"{API}/deployments/{DEP}/requests/{req}/status",
                                headers=HEADERS, timeout=30)
            s = resp.json()
        except Exception as e:
            print(f"  [{label}] poll net err: {e}", flush=True)
            continue
        status = s.get("status", "?")
        line = f"status={status} qpos={s.get('queue_position')}"
        if line != last or (time.time() - t0) % 60 < poll_every:
            print(f"  [{label}] t={int(time.time()-t0)}s {line}", flush=True)
            last = line
        if status in ("completed", "succeeded", "failed", "cancelled", "error"):
            return status
    print(f"  [{label}] TIMEOUT after {timeout}s (last {last})")
    return "timeout"


TRANSIENT_ERRORS = ("FileUploadException", "InternalServerError", "OutOfMemory")


def _error_names(err) -> list:
    if isinstance(err, list):
        return [e.get("error", "") for e in err if isinstance(e, dict)]
    if isinstance(err, dict):
        return [err.get("error", "")]
    return []


def fetch_result(req, label, dest):
    resp = requests.get(f"{API}/deployments/{DEP}/requests/{req}/result",
                        headers=HEADERS, timeout=60)
    res = resp.json()
    status = res.get("status")
    if status not in ("succeeded", "completed", "success"):
        print(f"  [{label}] RESULT status={status}")
        err = res.get("error")
        if err:
            print(f"  [{label}] ERROR:\n{json.dumps(err, indent=2, ensure_ascii=False)[:2000]}")
        else:
            print(f"  [{label}] BODY: {json.dumps(res, ensure_ascii=False)[:2000]}")
        return {"__failed__": _error_names(err)}
    os.makedirs(dest, exist_ok=True)
    saved = []
    for node_id, node in (res.get("outputs") or {}).items():
        for key in ("images", "gifs", "videos", "files"):
            for item in node.get(key, []) or []:
                url, fn = item.get("url"), item.get("filename", f"{node_id}.bin")
                if not url:
                    continue
                out = os.path.join(dest, fn)
                data = requests.get(url, headers=DL_HEADERS, timeout=600).content
                with open(out, "wb") as fh:
                    fh.write(data)
                saved.append(out)
                print(f"  saved {out} ({os.path.getsize(out)//1024} KB)", flush=True)
    if not saved:
        print(f"  [{label}] no downloadable outputs: {json.dumps(res.get('outputs'))[:1500]}")
    return saved


def run(input_image, prompt, label, dest, seed_hi=None, seed_lo=None,
        length=97, scale=720, use_gguf=False, unet_high=None, unet_low=None,
        with_post=True):
    kwargs = {}
    if unet_high:
        kwargs["unet_high"] = unet_high
    if unet_low:
        kwargs["unet_low"] = unet_low
    graph = build_v5_graph(image_to_datauri(input_image), prompt,
                           seed_hi=seed_hi, seed_lo=seed_lo, length=length,
                           scale_to_length=scale, prefix=label,
                           use_gguf=use_gguf, with_post=with_post, **kwargs)
    attempts = 3
    for attempt in range(1, attempts + 1):
        req = submit(graph)
        if not req:
            print(f"[{label}] submit failed (attempt {attempt}/{attempts}); retrying in 90s")
            time.sleep(90)
            continue
        print(f"[{label}] request {req} (attempt {attempt}/{attempts})", flush=True)
        poll(req, label)
        result = fetch_result(req, label, dest)
        if isinstance(result, list):
            return result
        errs = result.get("__failed__", [])
        if any(e in TRANSIENT_ERRORS for e in errs):
            print(f"[{label}] transient failure {errs}; retrying in 120s "
                  f"(attempt {attempt}/{attempts})", flush=True)
            time.sleep(120)
            continue
        return []  # permanent failure — don't burn retries
    return []


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--prompt")
    ap.add_argument("--prompt-file")
    ap.add_argument("--label", default="render")
    ap.add_argument("--out", required=True)
    ap.add_argument("--seed-hi", type=int)
    ap.add_argument("--seed-lo", type=int)
    ap.add_argument("--length", type=int, default=97)
    ap.add_argument("--scale", type=int, default=720)
    ap.add_argument("--gguf", action="store_true",
                    help="use the GGUF Q5 standard Wan UNETs available on the community image")
    ap.add_argument("--unet-high")
    ap.add_argument("--unet-low")
    ap.add_argument("--no-post", action="store_true",
                    help="skip RIFE/ESRGAN branch; raw 16fps output only")
    args = ap.parse_args()
    if args.prompt_file:
        with open(args.prompt_file, encoding="utf-8") as fh:
            prompt = fh.read().strip()
    elif args.prompt:
        prompt = args.prompt
    else:
        print("ERROR: --prompt or --prompt-file required")
        sys.exit(1)
    paths = run(args.input, prompt, args.label, args.out,
                seed_hi=args.seed_hi, seed_lo=args.seed_lo,
                length=args.length, scale=args.scale, use_gguf=args.gguf,
                unet_high=args.unet_high, unet_low=args.unet_low,
                with_post=not args.no_post)
    print(f"DONE: {len(paths)} files")
