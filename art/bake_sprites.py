"""Bake a shippable idle sprite sheet from the Wan 2.2 output.

Input:  art/generated/i2v-test-2026-06-15/wan22-720p.mp4
Output: art/generated/i2v-test-2026-06-15/baked/
          akari_idle_4x4.webp        (sprite sheet, target <800 KB)
          akari_idle_4x4.png         (sprite sheet, PNG reference)
          akari_idle_preview.html    (standalone PixiJS v8 ping-pong preview)
          frames/f_00.png ... f_15.png  (individual frames for debugging)

Pipeline:
  1. Extract 16 evenly-spaced frames from the mp4 via ffmpeg
  2. Resize each frame to 512x910 (downscale from 720x1280; keeps 9:16)
  3. Pack into 4x4 grid (2048x3640)
  4. Save as WebP q=82 and PNG
  5. Generate a self-contained HTML preview with the WebP base64-embedded
     and PixiJS v8 from CDN — ping-pong loop @ 12fps
"""
import os, subprocess, base64
from PIL import Image
import imageio_ffmpeg as iio

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(REPO, "art", "generated", "i2v-test-2026-06-15", "wan22-720p.mp4")
OUT  = os.path.join(REPO, "art", "generated", "i2v-test-2026-06-15", "baked")
FRAMES_DIR = os.path.join(OUT, "frames")
os.makedirs(FRAMES_DIR, exist_ok=True)
FFMPEG = iio.get_ffmpeg_exe()

FRAMES  = 16
COLS    = 4
ROWS    = FRAMES // COLS
FRAME_W = 512
FRAME_H = 910  # 9:16-ish, divides cleanly: 512*4=2048, 910*4=3640


def get_duration(path):
    out = subprocess.run([FFMPEG, "-i", path, "-hide_banner"],
                         capture_output=True, text=True).stderr
    for line in out.splitlines():
        if "Duration:" in line:
            t = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = t.split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
    return 5.0


def extract_frames():
    dur = get_duration(SRC)
    print(f"source duration: {dur:.2f}s, extracting {FRAMES} frames")
    for i in range(FRAMES):
        ts = (i + 0.5) * dur / FRAMES
        subprocess.run(
            [FFMPEG, "-y", "-loglevel", "error", "-ss", f"{ts:.3f}",
             "-i", SRC, "-frames:v", "1", "-q:v", "2",
             os.path.join(FRAMES_DIR, f"f_{i:02d}.png")],
            check=True
        )
    print(f"  saved {FRAMES} frames -> {FRAMES_DIR}")


def pack_sheet():
    sheet = Image.new("RGBA", (COLS * FRAME_W, ROWS * FRAME_H), (0, 0, 0, 0))
    for i in range(FRAMES):
        f = Image.open(os.path.join(FRAMES_DIR, f"f_{i:02d}.png")).convert("RGBA")
        f = f.resize((FRAME_W, FRAME_H), Image.LANCZOS)
        c, r = i % COLS, i // COLS
        sheet.paste(f, (c * FRAME_W, r * FRAME_H))
    png_path  = os.path.join(OUT, "akari_idle_4x4.png")
    webp_path = os.path.join(OUT, "akari_idle_4x4.webp")
    sheet.save(png_path, "PNG", optimize=True)
    sheet.save(webp_path, "WEBP", quality=82, method=6)
    print(f"  PNG  {os.path.getsize(png_path)//1024} KB  ({sheet.size[0]}x{sheet.size[1]})")
    print(f"  WEBP {os.path.getsize(webp_path)//1024} KB")
    return webp_path


PREVIEW_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Akari Idle Preview</title>
<style>
  html, body { margin: 0; padding: 0; background: #0b0b14; color: #d8d8e0;
               font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .wrap { display: flex; min-height: 100vh; align-items: center; justify-content: center; }
  .panel { display: flex; gap: 32px; align-items: center; padding: 24px; }
  #stage { background: #14141e; border: 1px solid #232336; border-radius: 8px;
           box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
  .info { max-width: 320px; font-size: 14px; line-height: 1.5; opacity: 0.85; }
  .info h2 { font-size: 18px; margin: 0 0 12px; color: #b4c4ff; }
  .info code { background: #1a1a26; padding: 2px 6px; border-radius: 3px;
               font-size: 12px; color: #c8e8c8; }
  .info dl { margin: 12px 0 0; }
  .info dt { color: #888; font-size: 12px; margin-top: 8px; }
  .info dd { margin: 2px 0 0; }
  .controls { margin-top: 16px; display: flex; gap: 8px; }
  .controls button { background: #2a2a3e; color: #d8d8e0; border: 1px solid #3a3a52;
                     padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; }
  .controls button:hover { background: #36364e; }
</style>
</head>
<body>
<div class="wrap">
  <div class="panel">
    <canvas id="stage" width="512" height="910"></canvas>
    <div class="info">
      <h2>Akari — Idle Loop Preview</h2>
      <p>16-frame ping-pong loop, Wan 2.2 a14b, downscaled to 512&times;910.</p>
      <dl>
        <dt>Source</dt><dd><code>wan22-720p.mp4</code> (5s @ 16fps)</dd>
        <dt>Frames</dt><dd>16 evenly-spaced</dd>
        <dt>Loop</dt><dd>ping-pong (16 fwd + 16 rev = 32-frame cycle)</dd>
        <dt>Playback</dt><dd id="fps-info">12 fps (1.33s fwd, 1.33s rev)</dd>
        <dt>Sheet</dt><dd id="sheet-info">2048&times;3640 WebP</dd>
      </dl>
      <div class="controls">
        <button id="slower">Slower</button>
        <button id="normal">12 fps</button>
        <button id="faster">Faster</button>
        <button id="pause">Pause</button>
      </div>
    </div>
  </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/pixi.js/8.5.2/pixi.min.js"></script>
<script>
const SHEET_BASE64 = "__SHEET_BASE64__";
const FRAME_W = 512, FRAME_H = 910, COLS = 4, ROWS = 4, COUNT = 16;

(async () => {
  const app = new PIXI.Application();
  await app.init({
    canvas: document.getElementById('stage'),
    width: FRAME_W, height: FRAME_H,
    background: 0x14141e, antialias: true,
  });

  const dataUrl = `data:image/webp;base64,${SHEET_BASE64}`;
  const baseTex = await PIXI.Assets.load(dataUrl);
  const frames = [];
  for (let i = 0; i < COUNT; i++) {
    const c = i % COLS, r = Math.floor(i / COLS);
    frames.push(new PIXI.Texture({
      source: baseTex.source,
      frame: new PIXI.Rectangle(c * FRAME_W, r * FRAME_H, FRAME_W, FRAME_H),
    }));
  }
  const pingPong = [...frames, ...frames.slice(1, -1).reverse()];

  const sprite = new PIXI.AnimatedSprite(pingPong);
  sprite.animationSpeed = 12 / 60;
  sprite.loop = true;
  sprite.play();
  app.stage.addChild(sprite);

  const fpsEl = document.getElementById('fps-info');
  const setFps = (fps) => {
    sprite.animationSpeed = fps / 60;
    fpsEl.textContent = `${fps} fps (${(COUNT/fps).toFixed(2)}s fwd, ${(COUNT/fps).toFixed(2)}s rev)`;
  };
  document.getElementById('slower').onclick = () => setFps(6);
  document.getElementById('normal').onclick = () => setFps(12);
  document.getElementById('faster').onclick = () => setFps(24);
  document.getElementById('pause').onclick = (e) => {
    if (sprite.playing) { sprite.stop(); e.target.textContent = 'Play'; }
    else { sprite.play(); e.target.textContent = 'Pause'; }
  };
})();
</script>
</body>
</html>
"""


def build_preview(webp_path):
    with open(webp_path, "rb") as fh:
        b64 = base64.b64encode(fh.read()).decode("ascii")
    html = PREVIEW_HTML.replace("__SHEET_BASE64__", b64)
    out = os.path.join(OUT, "akari_idle_preview.html")
    open(out, "w", encoding="utf-8").write(html)
    print(f"  preview {os.path.getsize(out)//1024} KB -> {out}")
    return out


if __name__ == "__main__":
    if not os.path.exists(SRC):
        print(f"ERROR: {SRC} not found"); raise SystemExit(1)
    extract_frames()
    webp = pack_sheet()
    build_preview(webp)
    print("\nDONE. open the preview HTML in a browser.")
