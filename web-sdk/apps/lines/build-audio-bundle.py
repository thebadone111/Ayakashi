"""Assemble the Ayakashi audio sprite bundle from the downloaded Pixabay SFX.

Decodes each mapped source with ffmpeg (static binary via imageio-ffmpeg),
trims/fades/normalizes, lays clips out on whole-second boundaries, then
encodes sounds.ogg / sounds.m4a / sounds.mp3 and rewrites sounds.json
(same sprite keys + loop flags as the reference bundle - no code changes).

Run: ../../../math-sdk/env/Scripts/python.exe build-audio-bundle.py
"""
import json, os, subprocess, tempfile
import numpy as np
import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SR = 44100
AUD = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated\audio"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "assets", "audio")

# key: (folder, file, start_s, dur_s, loop, gain_db)
# gain: SFX peak-normalized to -3dB then gain applied; BGM loops sit at -8dB.
M = {
    # --- music loops ---------------------------------------------------------
    "bgm_main":              ("koto", "japanese-koto-zen-471846.mp3", 0, 32.0, True, -8),
    "bgm_freespin":          ("taiko", "musical-taiko-sequence-66123.mp3", 0, 18.3, True, -8),
    "bgm_winlevel_big":      ("taiko", "musical-taiko-drumloop-001-120-97780.mp3", 0, 8.0, True, -8),
    "bgm_winlevel_superwin": ("taiko", "musical-beat1-136354.mp3", 0, 8.0, True, -8),
    "bgm_winlevel_mega":     ("taiko", "musical-beat3-136355.mp3", 0, 8.0, True, -8),
    "bgm_winlevel_epic":     ("taiko", "film-special-effects-shaped-taiko-180916.mp3", 0, 8.0, True, -8),
    "bgm_winlevel_max":      ("taiko", "musical-horde-war-drums-loop-130bpm-342956.mp3", 0, 14.8, True, -8),
    "sfx_bigwin_coinloop":   ("koto", "musical-kayageum1-c3-91074.mp3", 0, 8.0, True, -6),
    # --- free spins ----------------------------------------------------------
    "jng_intro_fs":          ("gong", "film-special-effects-zen-gong-199844.mp3", 0, 2.0, False, 0),
    "sfx_superfreespin":     ("taiko", "boom-5-taiko-466746.mp3", 0, 6.0, False, 0),
    "sfx_fs_respins":        ("shakuhachi", "film-special-effects-shakuhachi-whistle-41844.mp3", 0, 4.0, False, 0),
    # --- anticipation --------------------------------------------------------
    "sfx_anticipation":       ("taiko", "film-special-effects-taiko-drum-367656.mp3", 0, 7.7, False, 0),
    "sfx_anticipation_start": ("taiko", "musical-taiko-43348.mp3", 0, 1.0, False, 0),
    # --- buttons / reel stops (wood) ----------------------------------------
    "sfx_btn_general":  ("wood-hit", "technology-tabble-slamhit-498921.mp3", 0, 0.15, False, -2),
    "sfx_btn_spin":     ("wood-hit", "film-special-effects-wood-hit-432148.mp3", 0, 0.8, False, 0),
    # reel stops fire 5x in quick succession every spin — duck them well below the
    # win cues so they read as soft wood taps, not a drum solo. The game now cycles
    # all 5 variants (one per reel) for a descending kokiriko-board feel.
    "sfx_reel_stop_1":  ("wood-hit", "film-special-effects-wood-block-105066.mp3", 0, 0.5, False, -7),
    "sfx_reel_stop_2":  ("wood-hit", "film-special-effects-hit-tree-02-266307.mp3", 0, 0.55, False, -7),
    "sfx_reel_stop_3":  ("wood-hit", "film-special-effects-hit-tree-03-266306.mp3", 0, 0.6, False, -7),
    "sfx_reel_stop_4":  ("wood-hit", "film-special-effects-stick-hitting-a-dreadlock-small-thud-83297.mp3", 0, 0.6, False, -7),
    "sfx_reel_stop_5":  ("wood-hit", "film-special-effects-chopping-wood-96709.mp3", 0, 0.65, False, -7),
    "sfx_symbols_landing": ("wood-hit", "film-special-effects-hit-by-a-wood-230542.mp3", 0, 1.0, False, -3),
    "sfx_royals_landing":  ("wood-hit", "household-doorhit-98828.mp3", 0, 0.68, False, -3),
    # --- scatter (gong/bell) -------------------------------------------------
    "sfx_scatter_stop_1": ("gong", "film-special-effects-zen-gong-199844.mp3", 0, 1.2, False, 0),
    "sfx_scatter_stop_2": ("gong", "film-special-effects-metal-plate-gong-4-248610.mp3", 0, 1.25, False, 0),
    "sfx_scatter_stop_3": ("gong", "film-special-effects-gong-bell-129820.mp3", 0, 1.3, False, 0),
    "sfx_scatter_stop_4": ("gong", "people-gong-92707.mp3", 0, 1.3, False, 0),
    "sfx_scatter_stop_5": ("gong", "musical-gong-106628.mp3", 0, 1.35, False, 0),
    "sfx_scatter_reveal": ("gong", "film-special-effects-gong-91013.mp3", 0, 1.5, False, 0),
    "sfx_scatter_win":    ("gong", "film-special-effects-quot-gong-quot-sound-effect-308757.mp3", 0, 2.0, False, 0),
    "sfx_scatter_win_v2": ("gong", "film-special-effects-gong-255733.mp3", 0, 3.6, False, 0),
    # --- multiplier / kanabo -------------------------------------------------
    "sfx_multiplier_landing":     ("taiko", "musical-taiko2-98061.mp3", 0, 1.0, False, 0),
    "sfx_multiplier_up":          ("koto", "musical-koto-tremolo-a4-82432.mp3", 0, 1.5, False, 0),
    "sfx_multiplier_update":      ("koto", "musical-koto-hit-106066.mp3", 0, 1.6, False, 0),
    "sfx_multiplier_combine_a":   ("shakuhachi", "musical-shakuhachi-attack-6-97310.mp3", 0, 1.2, False, 0),
    "sfx_multiplier_combine_b":   ("kabuki", "film-special-effects-kabuki-104876.mp3", 0, 1.05, False, 0),
    "sfx_multiplier_explosion_a": ("taiko", "musical-beat1-136354.mp3", 0, 0.8, False, 0),
    "sfx_multiplier_explosion_b": ("taiko", "film-special-effects-boom-5b-taiko-466744.mp3", 0, 2.0, False, 0),
    "sfx_multiplier_explosion_c": ("taiko", "musical-taiko-43348.mp3", 0, 1.2, False, 0),
    "sfx_multiplier_reset":       ("wood-hit", "household-doorhit-98828.mp3", 0, 0.58, False, -4),
    "sfx_multiplier_win":         ("taiko", "musical-taiko-sequence-66123.mp3", 0, 3.8, False, 0),
    "sfx_wild_explode":           ("kabuki", "film-special-effects-kabuki-104876.mp3", 0, 1.4, False, 0),
    # --- tumble wins (escalating koto plucks) --------------------------------
    "tumble_win_1": ("koto", "musical-koto-c4-82455.mp3", 0, 1.0, False, 0),
    "tumble_win_2": ("koto", "musical-koto-g4-82454.mp3", 0, 1.1, False, 0),
    "tumble_win_3": ("koto", "musical-chorusharp-c5-82306.mp3", 0, 1.1, False, 0),
    "tumble_win_4": ("koto", "film-special-effects-celtic-harp-c5-102950.mp3", 0, 1.0, False, 0),
    "tumble_win_5": ("koto", "musical-koto-tremolo-a4-82432.mp3", 0, 1.0, False, 1),
    # --- win levels ----------------------------------------------------------
    "sfx_winlevel_small":       ("koto", "musical-koto-hit-106066.mp3", 0, 1.0, False, 0),
    "sfx_winlevel_standard":    ("koto", "musical-melody-koto-197263.mp3", 0, 1.25, False, 0),
    "sfx_winlevel_nice":        ("shakuhachi", "musical-shakuhachi-stretching-25-41799.mp3", 0, 1.5, False, 0),
    "sfx_winlevel_substantial": ("shakuhachi", "musical-shakuhachi-sequence-2-66112.mp3", 0, 2.5, False, 0),
    "sfx_winlevel_end":         ("shakuhachi", "film-special-effects-shakuhachi-blow-8-41843.mp3", 0, 2.0, False, 0),
    "sfx_youwon_panel":         ("koto", "japanese-koto-zen-471846.mp3", 0, 3.0, False, 0),
}

def decode(path, start, dur):
    with tempfile.NamedTemporaryFile(suffix=".f32", delete=False) as t:
        tmp = t.name
    cmd = [FFMPEG, "-y", "-v", "error", "-ss", str(start), "-t", str(dur), "-i", path,
           "-ac", "2", "-ar", str(SR), "-f", "f32le", tmp]
    subprocess.run(cmd, check=True, capture_output=True)
    data = np.fromfile(tmp, np.float32).reshape(-1, 2)
    os.remove(tmp)
    return data

clips = {}
for key, (folder, fn, start, dur, loop, gain) in M.items():
    path = os.path.join(AUD, folder, fn)
    a = decode(path, start, dur)
    peak = np.abs(a).max() or 1.0
    target = 10 ** ((-3 + gain) / 20)           # peak-normalize to -3dBFS + gain
    a *= target / peak
    n = len(a)
    fade_in = min(int(0.005 * SR), n // 4)
    a[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    if not loop:                                 # loops keep their authored seam
        fade_out = min(int(0.12 * SR), n // 3)
        a[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]
    clips[key] = (a, loop)
    print(f"  {key:28s} {n/SR:6.2f}s  {'loop' if loop else ''}")

# --- synthesised reel-spin bed -------------------------------------------------
# No source clip exists for "reels spinning" — without it the spin is dead silent.
# Synthesise a quiet, seamless rolling-noise bed (FFT band-pass + slow tremolo) so
# there's continuous motion under the reels. numpy-only (the build env has no scipy).
def synth_reel_spin(dur=1.6, peak_dbfs=-13.0):
    n = int(dur * SR)
    rng = np.random.default_rng(7)
    spec = np.fft.rfft(rng.standard_normal(n))
    freqs = np.fft.rfftfreq(n, 1 / SR)
    lo, hi = 160.0, 1600.0
    shape = np.zeros_like(freqs)
    shape[(freqs >= lo) & (freqs <= hi)] = 1.0
    le = (freqs >= lo * 0.5) & (freqs < lo)                      # raised-cosine edges
    shape[le] = 0.5 - 0.5 * np.cos(np.pi * (freqs[le] - lo * 0.5) / (lo * 0.5))
    he = (freqs > hi) & (freqs <= hi * 2)
    shape[he] = 0.5 + 0.5 * np.cos(np.pi * (freqs[he] - hi) / hi)
    bed = np.fft.irfft(spec * shape, n)
    bed /= np.abs(bed).max() or 1.0
    t = np.arange(n) / SR
    bed *= 0.65 + 0.35 * np.sin(2 * np.pi * 8.5 * t)             # rolling tremolo
    bed /= np.abs(bed).max() or 1.0
    xf = int(0.10 * SR)                                          # crossfade seam → seamless loop
    L = n - xf
    fade = np.linspace(0, 1, xf)
    clip = bed[:L].copy()
    clip[:xf] = bed[:xf] * fade + bed[L:L + xf] * (1 - fade)
    clip *= 10 ** (peak_dbfs / 20) / (np.abs(clip).max() or 1.0)
    return np.stack([clip, clip], axis=1).astype(np.float32)

clips["sfx_reel_spin"] = (synth_reel_spin(), True)
print(f"  {'sfx_reel_spin':28s} {len(clips['sfx_reel_spin'][0])/SR:6.2f}s  loop (synth)")

# lay out on whole-second boundaries with >=0.4s gap
sprite, cursor, total = {}, 0.0, None
parts = []
for key, (a, loop) in clips.items():
    dur_ms = len(a) / SR * 1000
    entry = [int(cursor * 1000), round(dur_ms, 4)]
    if loop:
        entry.append(True)
    sprite[key] = entry
    parts.append((int(cursor * SR), a))
    cursor = np.ceil(cursor + dur_ms / 1000 + 0.4)

total = np.zeros((int(cursor * SR), 2), np.float32)
for off, a in parts:
    total[off:off + len(a)] += a

raw = os.path.join(OUT, "_bundle.f32")
total.tofile(raw)
size_args = ["-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", raw]
for out_name, codec in (("sounds.ogg", ["-c:a", "libvorbis", "-q:a", "5"]),
                        ("sounds.m4a", ["-c:a", "aac", "-b:a", "160k"]),
                        ("sounds.mp3", ["-c:a", "libmp3lame", "-q:a", "4"])):
    dest = os.path.join(OUT, out_name)
    subprocess.run([FFMPEG, "-y", "-v", "error", *size_args, *codec, dest],
                   check=True, capture_output=True)
    print(f"{out_name}: {os.path.getsize(dest)//1024}KB")
os.remove(raw)

old = json.load(open(os.path.join(OUT, "sounds.json")))
# new key(s) since the reference bundle (e.g. the synthesised spin bed) are allowed;
# we must never silently DROP a key the game still references.
missing = set(old["sprite"]) - set(sprite)
assert not missing, f"key(s) dropped vs old bundle: {missing}"
config = {k: dict(v) for k, v in old["config"].items()}
for k in set(sprite) - set(config):
    config[k] = {"volume": 1}
# per-cue runtime mix (cheap to tweak without a rebuild):
config["bgm_main"]["volume"] = 0.9       # background music −10% (Max)
config["bgm_freespin"]["volume"] = 0.9
config["sfx_reel_spin"]["volume"] = 1    # already quiet from synth; tweak here if needed
data = {
    "sprite": sprite,
    "src": ["./assets/audio/sounds.ogg", "./assets/audio/sounds.m4a", "./assets/audio/sounds.mp3"],
    "config": config,
}
with open(os.path.join(OUT, "sounds.json"), "w") as fh:
    json.dump(data, fh, indent=1)

ac3 = os.path.join(OUT, "sounds.ac3")
if os.path.exists(ac3):
    os.remove(ac3)
print(f"\nBundle: {cursor:.0f}s total, {len(sprite)} sprites. sounds.json rewritten (ac3 dropped).")
