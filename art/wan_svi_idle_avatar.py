#!/usr/bin/env python3
"""
RunComfy WAN SVI Pro — avatar idle animation.

Strategy:
  1. Submit job with avatar.webp image override + idle prompt.
  2. Poll every 3s — the moment the instance boots, immediately upload
     avatar.webp via proxy (window is ~90s before LoadImage executes).
  3. Monitor logs for each pass completing (4/4 progress bars).
  4. After every completed pass, pull new files from ComfyUI /history
     and download them so you can review pass-by-pass.
  5. You can Ctrl+C to cancel the job at any time after pass 4.

Usage (from repo root, virtualenv active):
  python art/wan_svi_idle_avatar.py
"""
import os, sys, time, requests, json

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

# ---------------------------------------------------------------------------
KEY     = os.environ.get('FAL_KEY', 'e71e19b6-0ded-435a-8caf-948090ca77d1')
DEP_ID  = '274fbd0c-e4fc-4097-848d-24552911e37b'
H       = {'Authorization': 'Bearer ' + KEY}
H_JSON  = {**H, 'Content-Type': 'application/json'}
API     = 'https://api.runcomfy.net'

ROOT       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AVATAR     = os.path.join(ROOT, 'web-sdk/apps/lines/static/assets/sprites/avatar/avatar.webp')
OUT_DIR    = os.path.join(ROOT, 'art/generated/avatar-wan-svi-idle-avatar-2026-06-27')
os.makedirs(OUT_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Idle prompt — structured beat-by-beat cinematic description
# ---------------------------------------------------------------------------
IDLE_PROMPT = (
    "Subject: A regal, mature Japanese kitsune fox-spirit woman. "
    "She wears an ornate dark kimono with intricate gold embroidery. "
    "Her long silver-white hair flows past her waist. "
    "Cyan foxfire flames glow and drift gently around her. "
    "She has the composed, unhurried bearing of ancient authority — not tense, not stiff, alive and eternal. "

    "Beat 1 — Static hold: She stands perfectly centered in frame, facing camera directly. "
    "Posture tall, spine straight, shoulders level. Completely still. "
    "Her silver hair rests softly against her kimono. Cyan foxfire glows steadily behind her. "

    "Beat 2 — First breath: A slow, deep breath lifts her chest almost imperceptibly. "
    "Her shoulders rise a fraction and settle. Expression remains serene and unreadable. "

    "Beat 3 — Hair stirs: An invisible spiritual current passes through — "
    "her long silver-white hair lifts and drifts upward and to the side in a slow, weightless arc. "
    "Individual strands float as if gravity has loosened its hold. The motion is silky, unhurried, graceful. "

    "Beat 4 — Foxfire blooms: The cyan foxfire brightens and expands gently outward, "
    "casting soft blue-green luminance across her face and the edges of her kimono. "
    "The glow pulses once — a slow, living heartbeat of spiritual energy. "

    "Beat 5 — Settle: She exhales slowly. The foxfire recedes. "
    "Her hair drifts back down and settles. She returns to perfect stillness — "
    "unmoved, patient, eternal. The stillness of someone who has waited centuries and will wait centuries more. "

    "Camera: completely locked static portrait frame throughout. Absolutely no camera movement. "
    "Style: cinematic anime, high quality, rich atmospheric lighting, painterly detail, ethereal and spiritual mood, "
    "masterful composition, 4K."
)

# ---------------------------------------------------------------------------
def submit_job():
    # 366-370 = CR Prompt Text nodes for passes 1-5 (route via Set/Get vars to CLIPTextEncode 93/152/284/297/310)
    body = {
        'overrides': {
            '97':  {'inputs': {'image': 'avatar.webp'}},
            '366': {'inputs': {'prompt': IDLE_PROMPT}},
            '367': {'inputs': {'prompt': IDLE_PROMPT}},
            '368': {'inputs': {'prompt': IDLE_PROMPT}},
            '369': {'inputs': {'prompt': IDLE_PROMPT}},
            '370': {'inputs': {'prompt': IDLE_PROMPT}},
        }
    }
    r = requests.post('%s/prod/v2/deployments/%s/inference' % (API, DEP_ID),
                      headers=H_JSON, json=body, timeout=30)
    if r.status_code >= 400:
        raise RuntimeError('Submit failed %d: %s' % (r.status_code, r.text[:300]))
    j = r.json()
    print('Job queued: %s' % j['request_id'])
    return j['request_id']


def upload_avatar(instance_id):
    proxy = '%s/prod/v2/deployments/%s/instances/%s/proxy/upload/image' % (API, DEP_ID, instance_id)
    with open(AVATAR, 'rb') as f:
        img = f.read()
    resp = requests.post(proxy, headers=H,
                         files={'image': ('avatar.webp', img, 'image/webp')},
                         data={'overwrite': 'true', 'type': 'input', 'subfolder': ''},
                         timeout=60)
    return resp.status_code, resp.text[:200]


def get_history(instance_id):
    proxy = '%s/prod/v2/deployments/%s/instances/%s/proxy/history' % (API, DEP_ID, instance_id)
    r = requests.get(proxy, headers=H, timeout=15)
    if r.status_code == 200:
        return r.json()
    return {}


def download_via_proxy(instance_id, filename, dest_path):
    proxy = '%s/prod/v2/deployments/%s/instances/%s/proxy/view' % (API, DEP_ID, instance_id)
    r = requests.get(proxy, headers=H,
                     params={'filename': filename, 'type': 'output', 'subfolder': ''},
                     timeout=120)
    if r.status_code == 200:
        with open(dest_path, 'wb') as f:
            f.write(r.content)
        return len(r.content)
    return 0


def cancel_job(req_id):
    url = '%s/prod/v2/deployments/%s/requests/%s/cancel' % (API, DEP_ID, req_id)
    r = requests.post(url, headers=H, timeout=15)
    print('Cancel -> %d' % r.status_code)


def get_final_outputs(req_id):
    url = '%s/prod/v2/deployments/%s/requests/%s/result' % (API, DEP_ID, req_id)
    r = requests.get(url, headers=H, timeout=15)
    if r.status_code == 200:
        return r.json().get('outputs', {})
    return {}


# ---------------------------------------------------------------------------
def main():
    req_id = submit_job()
    status_url = '%s/prod/v2/deployments/%s/requests/%s/status' % (API, DEP_ID, req_id)

    instance_id  = None
    avatar_uploaded = False
    log_url      = None
    log_seen_len = 0
    pass_count   = 0        # number of 4/4 bar PAIRS seen (= 1 SVI pass each)
    bar_count    = 0        # individual 4/4 completions seen
    downloaded   = set()    # filenames already downloaded
    t0           = time.time()

    print('Polling every 3s — will upload avatar the moment instance boots...')
    print('(Ctrl+C to cancel job after pass 4)\n')

    try:
        while True:
            time.sleep(3)
            r = requests.get(status_url, headers=H, timeout=15)
            s = r.json()
            status = s.get('status', '?')
            inst   = s.get('instance_id', '')
            elapsed = int(time.time() - t0)

            # --- Instance just booted ---
            if inst and not instance_id:
                instance_id = inst
                log_url = 'https://cdn.runcomfy.com/logs/%s/comfyui.txt' % instance_id
                print('[%ds] Instance up: %s' % (elapsed, instance_id))
                print('[%ds] Uploading avatar.webp immediately...' % elapsed)
                code, txt = upload_avatar(instance_id)
                if code == 200:
                    avatar_uploaded = True
                    print('[%ds] Avatar uploaded OK: %s' % (elapsed, txt))
                else:
                    print('[%ds] Avatar upload FAILED %d: %s' % (elapsed, code, txt))

            # --- Poll logs for pass progress ---
            if log_url:
                lr = requests.get(log_url, timeout=10)
                full_log = lr.text
                new_text = full_log[log_seen_len:]
                log_seen_len = len(full_log)

                # Count completed 4/4 bars in new text
                new_bars = new_text.count('4/4 [')
                if new_bars:
                    bar_count += new_bars
                    # Each SVI pass = 2 bars (low + high KSampler)
                    new_passes = bar_count // 2
                    if new_passes > pass_count:
                        for p in range(pass_count + 1, new_passes + 1):
                            print('\n[%ds] === PASS %d COMPLETE ===' % (elapsed, p))
                        pass_count = new_passes

                        # Try to grab new output files from history
                        hist = get_history(instance_id)
                        for prompt_id, entry in hist.items():
                            for node_id, out in entry.get('outputs', {}).items():
                                for key, val in out.items():
                                    if isinstance(val, list):
                                        for item in val:
                                            if isinstance(item, dict):
                                                fname = item.get('filename', '')
                                                if fname and fname.endswith('.mp4') and fname not in downloaded:
                                                    dest = os.path.join(OUT_DIR, fname)
                                                    size = download_via_proxy(instance_id, fname, dest)
                                                    if size:
                                                        print('  Downloaded: %s  (%d KB)' % (fname, size // 1024))
                                                        downloaded.add(fname)

                        if pass_count >= 4:
                            print('\nPass 4 done. Press Ctrl+C NOW to cancel before final render, or wait for pass 5.')

            # --- Done ---
            if status == 'completed':
                print('\n[%ds] Job completed.' % elapsed)
                outputs = get_final_outputs(req_id)
                for node_id, node_out in outputs.items():
                    for key, val in node_out.items():
                        if isinstance(val, list):
                            for item in val:
                                if isinstance(item, dict) and 'url' in item:
                                    url = item['url']
                                    fname = url.split('/')[-1]
                                    dest = os.path.join(OUT_DIR, fname)
                                    if fname not in downloaded:
                                        rr = requests.get(url, timeout=120)
                                        with open(dest, 'wb') as f:
                                            f.write(rr.content)
                                        print('  Final download: %s  (%d KB)' % (fname, len(rr.content)//1024))
                break

            if status in ('failed', 'error', 'cancelled'):
                print('[%ds] Job %s: %s' % (elapsed, status, json.dumps(s)[:300]))
                break

            if elapsed > 3600:
                print('Timeout after 1h')
                break

            # Status line every 30s
            if elapsed % 30 < 3:
                print('[%ds] %s  pass=%d  bars=%d' % (elapsed, status, pass_count, bar_count))

    except KeyboardInterrupt:
        print('\nCtrl+C — cancelling job...')
        cancel_job(req_id)
        print('Job cancelled. Downloaded passes so far:', sorted(downloaded))

    print('\nFiles in:', OUT_DIR)
    for f in sorted(os.listdir(OUT_DIR)):
        sz = os.path.getsize(os.path.join(OUT_DIR, f)) // 1024
        print('  %s  %d KB' % (f, sz))


if __name__ == '__main__':
    main()
