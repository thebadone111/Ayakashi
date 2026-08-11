# RunPod Pod Startup Checklist

ComfyUI lives at `/workspace/runpod-slim/ComfyUI` — everything persists across restarts.

---

## Every Restart — One-liner

```bash
nvidia-smi --query-compute-apps=pid --format=csv,noheader | xargs kill -9 2>/dev/null; sleep 2; cd /workspace/runpod-slim/ComfyUI && git pull origin master && nohup python main.py --listen 0.0.0.0 --port 3000 --highvram > /workspace/comfyui.log 2>&1 & sleep 8 && tail -30 /workspace/comfyui.log
```

Ready when you see `Starting server`. Ctrl+C to stop tailing (ComfyUI keeps running).

---

## Every Restart — Step by Step

### 1. SSH in

```bash
# Managed proxy (always works, no port forwarding)
ssh -i C:/Users/tiger/runpod1 <proxy-address>@ssh.runpod.io

# Direct TCP (get IP:PORT from RunPod dashboard → Connect)
ssh -i C:/Users/tiger/runpod1 root@<IP> -p <PORT>
```

### 2. Update ComfyUI

```bash
cd /workspace/runpod-slim/ComfyUI && git pull origin master
```

### 3. Start ComfyUI

```bash
pkill -f "main.py" 2>/dev/null
nohup python main.py --listen 0.0.0.0 --port 3000 --highvram > /workspace/comfyui.log 2>&1 &
tail -f /workspace/comfyui.log
```

---

## Web UI Access

Run this on your **local machine** (keep the terminal open):

```bash
ssh -i C:/Users/tiger/runpod1 -N -L 8188:127.0.0.1:3000 -p <PORT> root@<IP>
```

Open: **http://localhost:8188**

The RunPod web link to port 3000 returns "Access Denied" — use the tunnel.

---

## Pod Details

| | |
|---|---|
| GPU | A100 SXM 80GB |
| ComfyUI | `/workspace/runpod-slim/ComfyUI` (persistent) |
| Models | `/workspace/runpod-slim/ComfyUI/models/` (persistent) |
| Custom nodes | `/workspace/runpod-slim/ComfyUI/custom_nodes/` (persistent) |
| Workflow | `/workspace/runpod-slim/ComfyUI/user/default/workflows/wani2v_rewired.json` |
| SSH key | `C:\Users\tiger\runpod1` |

---

## Fresh Install (first time only)

See `RUNPOD.md` § Fresh Install for full steps.
