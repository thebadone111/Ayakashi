# RunPod Pod Startup Checklist

Every pod restart wipes `/` (ephemeral). `/workspace` persists. Run all of this after each restart.

---

## 1. SSH in

```bash
# Managed SSH (preferred — always works)
ssh -i C:/Users/tiger/runpod1 8ltmzthz7x9526-64410b29@ssh.runpod.io

# Direct IP (get from RunPod dashboard → Connect)
ssh -i C:/Users/tiger/runpod1 root@<IP> -p <PORT>
```

**If direct IP gives "Permission denied":** the pod's `authorized_keys` is blank after restart. Use managed SSH, or paste this in the RunPod web terminal first:
```bash
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICQzAoHLWYK90mjMbPXj4MnLAxZz1445BucbD1v5982D maxiaidevelopment@gmail.com" >> ~/.ssh/authorized_keys
```

---

## 2. Update ComfyUI

The pod starts with ComfyUI in a **detached HEAD** state (no local branches). The Manager can't update until you fix this:

```bash
cd /ComfyUI
git fetch --all
git branch -r | grep -E "origin/master$|origin/master$"   # find branch name
git reset --hard origin/master                              # or origin/master
git checkout -b master origin/master                        # lets Manager update next time
```

---

## 3. Symlink custom nodes

```bash
rm -rf /ComfyUI/custom_nodes
ln -s /workspace/comfyui/custom_nodes_persistent /ComfyUI/custom_nodes
```

---

## 4. Copy model paths config

```bash
cp /ComfyUI/extra_model_paths.yml /ComfyUI/extra_model_paths.yaml
```

---

## 5. Install requirements

```bash
pip install -q -r /workspace/comfyui/custom_nodes_persistent/ComfyUI-WanVideoWrapper/requirements.txt
```

---

## 6. Start ComfyUI

```bash
pkill -f "main.py" 2>/dev/null
cd /ComfyUI
nohup python main.py --listen 0.0.0.0 --port 3000 --highvram > /workspace/comfyui.log 2>&1 &
tail -f /workspace/comfyui.log
```

Ready when you see `Starting server`. Ctrl+C to stop tailing.

---

## One-liner (paste after SSH)

```bash
cd /ComfyUI && git fetch --all && git reset --hard origin/master && git checkout -b master origin/master 2>/dev/null; rm -rf /ComfyUI/custom_nodes && ln -s /workspace/comfyui/custom_nodes_persistent /ComfyUI/custom_nodes; cp /ComfyUI/extra_model_paths.yml /ComfyUI/extra_model_paths.yaml; pip install -q -r /workspace/comfyui/custom_nodes_persistent/ComfyUI-WanVideoWrapper/requirements.txt; pkill -f "main.py" 2>/dev/null; cd /ComfyUI && nohup python main.py --listen 0.0.0.0 --port 3000 --highvram > /workspace/comfyui.log 2>&1 & echo "Starting..." && sleep 8 && tail -30 /workspace/comfyui.log
```

---

## Access the web UI

- **Direct:** `http://<POD_IP>:<PUBLIC_PORT>` (from RunPod dashboard)
- **TCP proxy** (if direct gives Access Denied — run on your LOCAL machine):

```bash
ssh -i C:/Users/tiger/runpod1 -N -L 8188:127.0.0.1:3000 -p <PORT> root@<IP>
```

Then open: **http://localhost:8188** — keep that terminal open.

---

## Pod details

| | |
|---|---|
| GPU | A6000 48GB · ~$0.60/hr |
| Pod proxy ID | `bizrqm23c0aei0` |
| Managed SSH | `8ltmzthz7x9526-64410b29@ssh.runpod.io` |
| SSH key | `C:\Users\tiger\runpod1` |
| Workflow | `wani2v_rewired.json` (Wan2.2 I2V) |
| ComfyUI port | 3000 internal → proxy to 8188 |
