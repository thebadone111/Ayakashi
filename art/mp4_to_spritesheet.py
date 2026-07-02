#!/usr/bin/env python3
"""
Convert MP4 animations to PIXI-compatible sprite sheets (TexturePacker JSON format).

Usage:
  # Convert specific files:
  python3 art/mp4_to_spritesheet.py "art/finals/animations/Stake img/h1-1.mp4" "art/finals/animations/Stake img/h2-1.mp4"

  # Convert all win animations at once:
  python3 art/mp4_to_spritesheet.py "art/finals/animations/Stake img/"*.mp4

  # Custom output dir and frame size:
  python3 art/mp4_to_spritesheet.py h1-1.mp4 --out web-sdk/apps/lines/static/assets/sprites/symbolWin --size 300

Output per MP4:
  {stem}.webp  — packed sprite sheet
  {stem}.json  — TexturePacker-format atlas
"""

import os, sys, json, math, subprocess, tempfile, argparse
from pathlib import Path
from PIL import Image


def get_video_fps(mp4_path: Path) -> float:
    """Read the native FPS from the video using ffprobe."""
    result = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0',
         '-show_entries', 'stream=r_frame_rate',
         '-of', 'default=noprint_wrappers=1:nokey=1', str(mp4_path)],
        capture_output=True, text=True,
    )
    raw = result.stdout.strip()  # e.g. "30/1" or "25/1"
    if '/' in raw:
        num, den = raw.split('/')
        return float(num) / float(den)
    return 30.0


def extract_frames(mp4_path: Path, out_dir: Path, fps: float | None) -> list[Path]:
    """Extract PNG frames with ffmpeg. Returns sorted list of frame paths."""
    out_dir.mkdir(parents=True, exist_ok=True)
    cmd = ['ffmpeg', '-y', '-i', str(mp4_path)]
    if fps is not None:
        cmd += ['-vf', f'fps={fps}']
    cmd += ['-pix_fmt', 'rgba', str(out_dir / 'frame_%04d.png')]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f'ffmpeg error for {mp4_path.name}:\n{result.stderr}')
    return sorted(out_dir.glob('frame_*.png'))


def pack_spritesheet(frames: list[Path], sheet_path: Path, frame_size: int) -> dict:
    """Pack frames into a square-ish grid, save as webp, return atlas JSON dict."""
    n = len(frames)
    cols = math.ceil(math.sqrt(n))
    rows = math.ceil(n / cols)

    sheet = Image.new('RGBA', (cols * frame_size, rows * frame_size), (0, 0, 0, 0))
    atlas_frames = {}

    for i, fp in enumerate(frames):
        img = Image.open(fp).convert('RGBA')
        img = img.resize((frame_size, frame_size), Image.LANCZOS)
        x = (i % cols) * frame_size
        y = (i // cols) * frame_size
        sheet.paste(img, (x, y))
        atlas_frames[f'frame_{i:04d}.png'] = {
            'frame': {'x': x, 'y': y, 'w': frame_size, 'h': frame_size},
            'rotated': False,
            'trimmed': False,
            'spriteSourceSize': {'x': 0, 'y': 0, 'w': frame_size, 'h': frame_size},
            'sourceSize': {'w': frame_size, 'h': frame_size},
            'pivot': {'x': 0.5, 'y': 0.5},
        }

    sheet.save(sheet_path, 'WEBP', quality=90, lossless=False)
    return {
        'frames': atlas_frames,
        'meta': {
            'app': 'mp4_to_spritesheet',
            'version': '1.0',
            'image': sheet_path.name,
            'format': 'RGBA8888',
            'size': {'w': cols * frame_size, 'h': rows * frame_size},
            'scale': '1',
            'frameCount': n,
        },
    }


def convert(mp4_path: Path, out_dir: Path, frame_size: int, fps: float | None):
    stem = mp4_path.stem
    out_dir.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)

        native_fps = get_video_fps(mp4_path)
        extract_fps = fps if fps is not None else native_fps
        print(f'\n[{stem}]  native {native_fps:.1f} fps → extracting at {extract_fps:.1f} fps')

        frames = extract_frames(mp4_path, tmp_path, fps)
        print(f'  {len(frames)} frames extracted')

        sheet_path = out_dir / f'{stem}.webp'
        atlas = pack_spritesheet(frames, sheet_path, frame_size)

        json_path = out_dir / f'{stem}.json'
        json_path.write_text(json.dumps(atlas, indent='\t'))

        kb = sheet_path.stat().st_size // 1024
        cols = math.ceil(math.sqrt(len(frames)))
        rows = math.ceil(len(frames) / cols)
        print(f'  → {sheet_path.name}  ({cols}×{rows} grid, {kb} KB)')
        print(f'  → {json_path.name}')


def main():
    parser = argparse.ArgumentParser(
        description='Convert MP4 animations to PIXI sprite sheets'
    )
    parser.add_argument('inputs', nargs='+', help='MP4 file path(s)')
    parser.add_argument(
        '--out', default='web-sdk/apps/lines/static/assets/sprites/symbolWin',
        help='Output directory (default: lines symbolWin asset folder)',
    )
    parser.add_argument(
        '--size', type=int, default=200,
        help='Frame size in pixels — square (default: 200, same as existing symbols)',
    )
    parser.add_argument(
        '--fps', type=float, default=None,
        help='Downsample to this FPS before packing (default: native)',
    )
    args = parser.parse_args()

    # Check ffmpeg is available
    if subprocess.run(['which', 'ffmpeg'], capture_output=True).returncode != 0:
        sys.exit(
            'Error: ffmpeg not found.\n'
            'Install it with:  sudo apt install ffmpeg'
        )

    out_dir = Path(args.out)
    for inp in args.inputs:
        try:
            convert(Path(inp), out_dir, args.size, args.fps)
        except Exception as e:
            print(f'  ERROR: {e}', file=sys.stderr)

    print(f'\nDone. Files written to: {out_dir}')


if __name__ == '__main__':
    main()
