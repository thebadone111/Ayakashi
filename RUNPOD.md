# RunPod — Wan 2.2 Idle Animation Reference

**Last updated:** 2026-06-28  
**Pod:** A6000 48GB · `/workspace` 50GB persistent  
**Purpose:** Self-hosted ComfyUI replacing RunComfy (~$2.50/hr → ~$0.60/hr A6000)

---

## 1. Pod & Infrastructure

### Profile
- **GPU:** NVIDIA RTX A6000 (48 GB VRAM)
- **RAM:** 50 GB (not 503 GiB — that was MooseFS pool totals showing host RAM, not pod allocation)
- **CUDA:** torch 2.6+cu124
- **Pod proxy ID:** `bizrqm23c0aei0`
- **A6000 cost:** ~$0.60/hr on-demand EU-SE-1. Stop pod between sessions. `/workspace` volume charges $0.07/GB-month (~$3.50/mo at 50GB cap — trivial).

### Volume layout
| Mount | Persists? | Notes |
|-------|-----------|-------|
| `/` (5GB overlay) | **No** | Lost on pod stop/restart. ComfyUI code lives here — must be re-applied after restart. |
| `/workspace` (50GB) | **Yes** | All weights, custom nodes, outputs. Currently ~31GB used. |

`df -h /workspace` shows MooseFS pool totals for the whole region — not your cap. Use `du -sh /workspace` for real usage.

---

## 2. SSH Access

- **Private key:** `C:\Users\tiger\runpod1` (ed25519)
- **Pubkey:** `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICQzAoHLWYK90mjMbPXj4MnLAxZz1445BucbD1v5982D maxiaidevelopment@gmail.com`

Two endpoints — **both authenticated with the same key:**

```bash
# RunPod proxy — always works, but NO port forwarding
ssh -tt -i ~/runpod1 bizrqm23c0aei0-644112d3@ssh.runpod.io

# Direct TCP — for port forwarding (IP:PORT changes each restart)
ssh -i ~/runpod1 -p <PORT> root@<IP>
```

### Critical: authorized_keys is empty after every pod restart

The pod's `/root/.ssh/authorized_keys` resets on restart. Direct TCP will reject the key until you fix it. Do this via proxy first:

```bash
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICQzAoHLWYK90mjMbPXj4MnLAxZz1445BucbD1v5982D maxiaidevelopment@gmail.com" >> ~/.ssh/authorized_keys
```

Then get the new IP:PORT from RunPod dashboard → Connect → SSH over exposed TCP.

### Port forwarding (always use this — not the web link)

```bash
ssh -i ~/runpod1 -N -L 8188:127.0.0.1:3000 -p <PORT> root@<IP>
```

Access ComfyUI at **http://localhost:8188**

The RunPod web link to port 3000 returns "Access Denied" — their nginx proxy uses session auth tied to their startup scripts. SSH tunnel is the only reliable method.

---

## 3. Post-Restart Checklist

The `/` overlay is ephemeral. After every pod restart:

```bash
# Step 1 — Add pubkey (via proxy SSH first, then switch to direct TCP)
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICQzAoHLWYK90mjMbPXj4MnLAxZz1445BucbD1v5982D maxiaidevelopment@gmail.com" >> ~/.ssh/authorized_keys

# Step 2 — Update ComfyUI and restore custom_nodes symlink
cd /ComfyUI && git pull origin master
rm -rf /ComfyUI/custom_nodes && ln -s /workspace/comfyui/custom_nodes_persistent /ComfyUI/custom_nodes
pip install -q -r /workspace/comfyui/custom_nodes_persistent/ComfyUI-WanVideoWrapper/requirements.txt

# Step 3 — Recreate extra_model_paths.yaml (note: .yaml not .yml — ComfyUI v0.26+ ignores .yml)
cp /ComfyUI/extra_model_paths.yml /ComfyUI/extra_model_paths.yaml

# Step 4 — Kill RunPod's auto-started ComfyUI and restart with --highvram
pkill -f "main.py"
cd /ComfyUI && nohup python main.py --listen 0.0.0.0 --port 3000 --highvram > /workspace/comfyui.log 2>&1 &
echo $! > /workspace/comfyui.pid

# Monitor startup
tail -f /workspace/comfyui.log
```

Kill/restart command during a session:
```bash
pkill -f "main.py" && cd /ComfyUI && nohup python main.py --listen 0.0.0.0 --port 3000 --highvram > /workspace/comfyui.log 2>&1 &
```

### Why `--highvram`
Prevents ComfyUI from offloading models between KSampler nodes. Without it, each of the 6 KSamplers unloads and reloads the UNet (~10GB) every pass, adding ~2 minutes startup per node. With it, the model stays in VRAM across all KSamplers — dramatically faster multi-pass generation.

### Why `.yaml` not `.yml`
ComfyUI v0.26.0 changed the expected extension for extra model paths from `.yml` to `.yaml`. The RunPod template creates `.yml`. If models show as "not found", this is why.

### Why `git pull` nukes the custom_nodes symlink
`git pull origin master` replaces the symlinked `/ComfyUI/custom_nodes/` directory with a bare empty directory. Always re-run the `ln -s` command after every pull.

---

## 4. Models on Disk

All under `/workspace/comfyui/models/` (persistent). Total ~31GB.

| File | Size | Source |
|------|------|--------|
| `unet/wan2.2/Wan2.2-I2V-A14B-HighNoise-Q5_0.gguf` | 9.7 GB | `QuantStack/Wan2.2-I2V-A14B-GGUF` |
| `unet/wan2.2/Wan2.2-I2V-A14B-LowNoise-Q5_0.gguf` | 9.7 GB | same |
| `vae/wan_2.1_vae.safetensors` | 243 MB | `Comfy-Org/Wan_2.2_ComfyUI_Repackaged` |
| `clip/umt5_xxl_fp8_e4m3fn_scaled.safetensors` | 6.3 GB | `Comfy-Org/Wan_2.1_ComfyUI_repackaged` |
| `loras/wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors` | 1.2 GB | `Comfy-Org/Wan_2.2_ComfyUI_Repackaged` |
| `loras/wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors` | 1.2 GB | same |
| `loras/SVI/SVI_v2_PRO_Wan2.2-I2V-A14B_HIGH_lora_rank_128_fp16.safetensors` | 1.2 GB | `Kijai/WanVideo_comfy` |
| `loras/SVI/SVI_v2_PRO_Wan2.2-I2V-A14B_LOW_lora_rank_128_fp16.safetensors` | 1.2 GB | same |
| `upscale_models/4x-AnimeSharp.pth` | 64 MB | `Kim2091/AnimeSharp` |

**Why Q5_0 GGUF and not fp16:** A6000 has 48GB VRAM. Wan 2.2 14B fp16 × 2 UNets = ~56GB — won't fit. Q5_0 ≈ 10GB each, fits both with SVI LoRAs and activations.

**Two orphan DiffusionModelLoaderKJ nodes** in the workflow reference fp8 `.safetensors` versions (~14GB each). Both have zero downstream connections — they're bypassed (mode=4). Do not download them.

---

## 5. Workflow — `wani2v_rewired.json`

**Current production workflow:** `C:\Users\tiger\Downloads\wani2v_rewired.json`  
On pod: `/ComfyUI/user/default/workflows/wani2v_rewired.json`

### History
The original RunComfy export had 53 Set/Get nodes (12 SetNode + 41 GetNode) from rgthree-comfy that no longer exist in current ComfyUI → all showed red. Fixed by tracing every named pipe to source and inserting direct links: 68 links deleted, 56 direct links added, 53 nodes removed.

### Current workflow structure (as of 2026-06-28)

**3-pass SVI Pro pipeline:**
- Pass 1: Full generation from reference image (HighNoise KSampler → LowNoise KSampler → SVIPro)
- Pass 2: Re-renders using Pass 1 latent as anchor — smooths temporal inconsistency
- Pass 3: Further pass from Pass 2 output — marginal improvement for slow motion

**Per-pass VHS output:** `Pass_1/2/3_00001.mp4` (21fps) + `Render_00001.mp4` (final)

**Key node settings:**
| Setting | Value | Notes |
|---------|-------|-------|
| Steps | 11 | HighNoise runs steps 0→4, LowNoise runs steps 4→11 |
| Split step | 4 | Hardcoded INTConstant — both constants feed all 6 KSamplers |
| Length | 101 | Frames per pass (change in all 3 WanImageToVideoSVIPro nodes) |
| Resolution | 848px longest side | LayerUtility node — good Wan sweet spot for A6000 |
| motion_latent_count | Pass 1=0, Pass 2&3=1 | Controls overlap conditioning from previous pass |
| FPS (all VHS nodes) | 24 | Standardise all four VHS nodes to 24 |

**Upscaler (4x-AnimeSharp):** Wired after each pass's VAEDecode, before ImageBatchExtendWithOverlap. One UpscaleModelLoader feeds all three ImageUpscaleWithModel nodes.

---

## 6. How Wan I2V Actually Works

Not frame-by-frame. The model processes the **entire sequence as one 4D tensor** (width × height × time × channels) simultaneously.

1. Reference image → VAE encode → latent
2. Latent tiled to N frames — all noise except frame 0
3. KSampler denoises the entire sequence — every frame attends to every other frame
4. VAE decodes all N latents → N pixel images
5. VHS stitches to MP4

**Implications:**
- VRAM scales with frame count — 101 frames at ~48% A6000 VRAM (23GB)
- Can't generate 240 frames directly — would OOM (~55GB needed)
- Frame count must be **odd** — model anchors on frame 0, needs symmetric temporal structure
- More passes = smoother temporal consistency but diminishing returns for slow/idle motion

### Pass quality comparison (for idle animation)
| Pass 1 → Pass 2 | Visible flicker reduction, smoother motion | Meaningful |
|-----------------|-------------------------------------------|-----------|
| Pass 2 → Pass 3 | Marginal for slow idle motion | Often not worth the time |

**For a subtle idle animation, Pass 1 alone may be sufficient.** Test it before running all 3 passes.

---

## 7. Animation Length & Looping

### Frame count math

Length must be **odd**. Key formula for ping-pong loops:

```
Ping-pong total frames = (2 × N) - 2
```

| Length | Duration @ 24fps | Ping-pong | Ping-pong duration |
|--------|-----------------|-----------|-------------------|
| 81 | 3.4s | 160 frames | 6.7s |
| 101 | 4.2s | 200 frames | 8.3s |
| 121 | 5.0s | 240 frames | **10.0s exactly** |
| 161 | 6.7s | 320 frames | 13.3s |

**For a 10-second loop: use length=121 with ping-pong.**  
121 is odd, ~1.2× VRAM of 101 frames — safe on A6000.

### Ping-pong code (for sprite sheet splitting)
```javascript
const pingPong = [...frames, ...frames.slice(1, -1).reverse()];
```

### VHS FPS setting
- Set **all four** VHS_VideoCombine nodes to the same value (24 recommended)
- FPS only controls MP4 playback speed — doesn't affect the frames themselves
- For sprite sheet work the FPS on the video is irrelevant; only the frames matter

---

## 8. Resolution

**Current: 848px longest side** (LayerUtility: ImageScaleByAspectRatio V2, scale_to_side=longest)

848 is the Wan community's consensus sweet spot. The model's native training resolutions are non-standard (480×832, 832×480, 720×1280 etc.). 848 is close to 832 and rounds cleanly to multiples of 8.

**Do not go higher than 848** with 101+ frames on A6000 — VRAM for video diffusion scales with spatial × temporal dimensions simultaneously. 1280px would likely OOM.

**After-generation upscaling strategy:**
- Generate at 848px (good model quality at this resolution)
- 4x-AnimeSharp → ~3392px (very high res, crisp anime detail)
- Downscale locally to target sprite sheet resolution
- **Do not upscale inside the pipeline during generation** — running 4x on 101-frame batches OOMs (this caused our crash)

---

## 9. Wan 2.2 I2V Prompting Guide

### Core rules

1. **Motion only.** The reference image already defines appearance, style, and scene. Never describe hair colour, outfit, face, or background — the model can see all of it.
2. **Lock the camera explicitly.** Always open with `Static shot. Fixed camera.` Without this, the model may drift the camera.
3. **Be literal and sequential.** Write events in the order you want them. The model follows text sequence.
4. **Name speeds precisely.** "slowly", "imperceptibly", "once", "clearly", "wide arc" — the model takes these literally.
5. **One sentence per motion system.** Don't chain unrelated motions in one clause.
6. **Amplitude language for more movement.** "clearly", "visibly", "with amplitude", "wide arc" → more motion. "subtly", "barely", "imperceptibly" → less.

### Formula (I2V)
```
Static shot. Fixed camera. [Motion system 1]. [Motion system 2]. [Motion system 3]. No camera movement.
```

### Motion layering for idle avatars
Layer independent systems at different speeds for organic feel:

| System | Speed | Example |
|--------|-------|---------|
| Breathing | Slowest (~4s cycle) | chest rises and falls |
| Tail drift | Slow (~6s) | tails undulate in a long arc |
| Hair/ribbon | Medium-slow | flutter with unseen air current |
| Foxfire orbs | Medium | bob and pulse independently |
| Ear twitch | Infrequent, fast | single twitch once |
| Eye blink | Infrequent | blink once slowly |
| Weight shift | Very slow | body sways fractionally forward |

### Kitsune avatar — per-pass prompts (current)

**Pass 1 — Motion blocking** (CR Prompt Text node 366):
```
Static shot. Fixed camera. The kitsune spirit breathes slowly and deeply,
her body rising and falling with each breath. Her nine tails drift in a wide,
slow arc from left to right, each tail moving independently with a slight delay.
Her body sways forward imperceptibly with her breath. Foxfire orbs float and
drift upward slowly, each on its own path. No camera movement.
```

**Pass 2 — Motion refinement** (CR Prompt Text node 367):
```
Static shot. Fixed camera. Slow rhythmic breathing, chest barely moving.
Nine tails undulate in a gentle wave — the outer tails trail behind the inner ones.
Foxfire orbs pulse once with soft amber light, dimming and brightening slowly.
Hair and ribbon edges flutter as if touched by a breeze from below.
One fox ear twitches sharply once to the left, then stills. No camera movement.
```

**Pass 3 — Surface detail** (CR Prompt Text node 368):
```
Static shot. Fixed camera. Fur details shimmer faintly where foxfire light catches them.
Eyes blink once slowly, lids closing fully then opening with calm deliberateness.
Pupils contract slightly then relax. Foxfire particles at the orb edges flicker
and drift upward as individual sparks. Ribbon fabric ripples once from end to tip.
Tails settle into stillness at the end of their arc. Serene, alert expression.
No camera movement.
```

### Wan 2.7 vs Wan 2.2 prompting
Wan 2.7 is API-only (wan.video) — no open weights yet. 2.2 is the best available locally.

Key 2.7-style improvements that also work on 2.2:
- More literal execution of specific instructions ("ear twitches once" = one twitch)
- Explicit camera lock (`static shot. fixed camera.`) is more reliably honoured
- Fine emotional vocabulary works better in 2.7; in 2.2 keep it simple (serene, alert, calm)
- Over-describing in 2.7 can fight itself — same lesson applies in 2.2

---

## 10. Performance & VRAM Lessons

| Lesson | Detail |
|--------|--------|
| `--highvram` is essential | Without it, 2-min model reload per KSampler node. Add to every ComfyUI launch. |
| Upscale after generation, not during | 4x-AnimeSharp on 101-frame batch inside the pipeline → OOM. Upscale the final video locally. |
| Pass 3 is often skippable | For slow idle animations, Pass 1→2 captures most of the quality gain. Bypass Pass 3 to halve crash risk. |
| 48% VRAM at 101 frames | ~23GB used. Scales roughly linearly. 121 frames ≈ 28GB (safe). 241 frames ≈ 55GB (OOM). |
| 3-pass + upscalers crashes | The combination of 3×101-frame upscaling batches + overlap merges exceeds VRAM at the Render stage. |
| Steps: 11 with split at 4 | HighNoise handles coarse structure (steps 0–4), LowNoise refines (steps 4–11). Good balance. |

---

## 11. Current Experiments & Goals

### What we're testing
- **3-pass kitsune idle at 101 frames** with per-pass prompts (Pass 1 available, Pass 3 crashed)
- Whether **Pass 1 output alone** is sufficient quality for the idle loop
- **121 frames + ping-pong** as the path to a 10-second loop within VRAM limits

### Next run configuration
- Length: **121** (all 3 WanImageToVideoSVIPro nodes)
- Passes: **2** (bypass Pass 3 nodes in UI — right-click → Bypass)
- Upscalers: **remove from pipeline** — upscale locally after
- FPS: **24** on all four VHS nodes
- Prompts: increase amplitude language for more visible movement
- Flag: **--highvram** on ComfyUI launch

### Broader goals
- Produce idle, anticipation, big-win, and ambient avatar animations for Ayakashi
- All animations to be sprite sheets looping at 24fps
- Target output: ~512–1024px wide, upscaled from 848px generation → 4x → downscale locally
- Each animation type will need its own prompt set (idle prompts above are a template)

---

## 12. Spritesheet Baking & Upscaling

### Why not upscale inside the pipeline
Running 4x-AnimeSharp on a 101-frame batch inside ComfyUI causes a RAM OOM cascade:
1. VRAM fills from the upscaled batch (~8GB at 3392px × 101 frames)
2. PyTorch offloads to CPU RAM
3. CPU RAM (50GB) also exhausts with models + multiple large batches in memory
4. ComfyUI crashes

**Do not put ImageUpscaleWithModel nodes inside the generation pipeline.** Bypass them.

### Upscale at spritesheet bake time instead

The baking script processes one frame at a time — peak memory is just 2 frames, regardless of how many frames total. No batch tensor explosion. The pipeline:

```
MP4 → extract frames → [optional ping-pong] → 4x upscale per frame → downscale to target size → arrange spritesheet grid
```

### Where to run the upscaler

**Local machine — recommended.**
- Free (no compute cost)
- 4x-AnimeSharp runs fine on CPU for 121 frames at 848px input — takes a few minutes, not hours
- No data transfer of large upscaled images to/from cloud
- Simplest: bake the spritesheet locally after pulling the MP4 down from the pod

**RunPod — possible but wasteful.**
- Has 4x-AnimeSharp.pth already on disk
- Can run frame-by-frame (not batch) to avoid the OOM
- But costs $0.60/hr for a GPU that's idle 95% of the time during ESRGAN upscaling
- Not worth it unless you need a remote headless batch job

**RunComfy — no.**
- $2.50/hr for a task that doesn't need FLUX
- Wrong tool entirely

### Spritesheet baking script (to be written)

Parameters it should accept:
- Input MP4 path
- Ping-pong flag (doubles the frames for a smooth loop)
- Upscale flag + model path (4x-AnimeSharp.pth)
- Target frame size (e.g. 512×512, 256×512)
- Grid layout (columns × rows, or auto)
- Output path

Frame extraction via ffmpeg or PIL/imageio. Upscaling via `spandrel` or `basicsr` (both support ESRGAN `.pth` files and run on CPU or local GPU).

---

## 13. Misc Lessons

### HuggingFace downloads on MooseFS
`hf_hub_download()` creates relative symlinks that break when moved on MooseFS. Use streaming download instead for anything > 5GB:
```python
import urllib.request
urllib.request.urlretrieve("https://huggingface.co/<repo>/resolve/main/<file>", dst)
```

### `df` lies on RunPod
`df -h /workspace` shows the MooseFS pool total across all customers. Use `du -sh /workspace` for your actual usage.

### Workflow JSON backup
Save the workflow JSON to `/workspace/` after any changes. The `/ComfyUI/user/` path is on the ephemeral overlay.
```bash
cp /ComfyUI/user/default/workflows/wani2v_rewired.json /workspace/wani2v_rewired_backup.json
```
