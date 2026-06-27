"""UI chrome generator — reel_frame + fs_counter panel (round 2026-06-27).

The R2 chrome (current shipped reel_frame + Frame_FSCounter2) was generated
when the bg/atlas/avatar were all on the old register. Now everything around
them shifted to the de-IP'd painterly yokai prefix, the lacquer frame reads
heavy and ornate against the new HQ background.

This round leans into the new style + asks for VARIATION so Max can pick.
Six reel_frame prompt variants × 2 models × 3 cands = 36 reel_frame options.
Three fs_panel variants × 2 models × 3 cands = 18 panel options.

Output:
  art/generated/chrome-2026-06-27/reel_frame/<variant>/*.png
  art/generated/chrome-2026-06-27/fs_panel/<variant>/*.png
  + _contact.jpg per asset

Usage:
  $env:FAL_KEY = "id:secret"
  python art/chrome_gen.py            # both assets
  python art/chrome_gen.py reel_frame # just the reel frame
  python art/chrome_gen.py fs_panel   # just the FS counter panel
"""
import os, sys, hashlib

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from fal_generate import gen_batch, build_contact_sheet

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_ROOT = os.path.join(REPO, "art", "generated", "chrome-2026-06-27")

FLUX  = "fal-ai/flux-pro/v1.1-ultra"
SEED  = "fal-ai/bytedance/seedream/v4/text-to-image"

# ============================================================================
# Style prefix — same de-IP'd register as STYLE_GUIDE.md §1.
# ============================================================================

PROSE_PREFIX = (
    "painterly dark-fantasy anime, Edo-period rural Japanese yokai folklore, "
    "moonlit night palette, ethereal cyan foxfire and faint sakura pink "
    "accents over deep indigo and ink-black, hand-drawn cel-shaded "
    "illustration with bold black sumi-e contours"
)

NEG_COMMON = (
    "no logos, no text, no watermarks, no signatures, no people, no person, "
    "no figure, no body, no characters, no creatures, no animals, no fox, "
    "no scenery beyond the frame itself, no torii gate, no temple in the "
    "background, no mountains, no sky, no painted background scene, "
    "no second subject, no multiple frames, no purple, no lavender, no "
    "white background"
)

# ============================================================================
# REEL FRAME — six prompt variants, lighter than the R2 lacquer version.
# Locked composition shared across all variants: a single ornamental BORDER
# surrounding a perfectly square transparent inner window, viewed straight-on,
# rendered against a clean solid deep indigo backdrop so it cuts cleanly.
# Inner window must occupy ~70-72% of the canvas (so the FE FRAME_RATIOS map
# the window over the 5x5 board without trimming the ornament).
# ============================================================================

FRAME_COMPOSITION = (
    "a single ornamental decorative border framing a perfectly square empty "
    "central window, the window occupies seventy percent of the canvas, "
    "the border is the only subject, presented straight-on flat in symmetric "
    "frontal view, isolated against a solid deep indigo backdrop, the inside "
    "of the window is the same flat indigo color so it reads as transparent, "
    "border art is thinner than a typical heavy reel frame, ornament restraint, "
    "the corners may carry small motifs but the long edges stay relatively quiet"
)

REEL_FRAME_VARIANTS = {
    # A — washi-rope frame: woven shimenawa rope edge, white & gold paper folds
    "A_shimenawa": (
        "an ornamental border made of a single thick braided shimenawa rope of "
        "white twisted hemp wrapping perfectly around the square window, with "
        "small folded paper shide streamers in cream and gold hanging at the "
        "four corners, with a thin matte ink-black underline behind the rope, "
        "subtle cyan foxfire glow gently lighting the rope from inside the window"
    ),
    # B — sumi-e ink frame: bold brush stroke border
    "B_sumi_brush": (
        "an ornamental border formed from a single bold sumi-e black ink brush "
        "stroke wrapping around the square window, the stroke is thick with "
        "visible brush texture and dry-bristle wash on the outside edge, "
        "four small painted sakura blossoms in pale pink mark the corners "
        "as the only color, the rest of the border is pure black ink"
    ),
    # C — lacquer + foxfire: thinner version of current red/gold lacquer
    "C_lacquer_thin": (
        "an ornamental border in deep crimson urushi lacquer with thin "
        "delicate gold leaf inlay along its inside edge and a thinner gold "
        "outer rim, restrained corner ornaments featuring a small kamon "
        "mon-emblem at each corner only, cyan foxfire wisps faintly visible "
        "drifting along the gold rim, much narrower and more refined than a "
        "festival lacquer frame"
    ),
    # D — bamboo + paper: light, airy, garden-architecture register
    "D_bamboo_paper": (
        "an ornamental border made of slender bamboo poles bound at the "
        "corners with black silk cord, washi paper panels stretched as thin "
        "trim along the inside edge with faint sakura petal silhouettes "
        "embossed in the paper, a soft warm lantern glow from inside the "
        "window edges, gentle sumi-e ink shadow underneath"
    ),
    # E — iron + flame: heavier dark register
    "E_iron_flame": (
        "an ornamental border of dark hammered iron with subtle hand-forge "
        "texture, four small floating cyan foxfire flames quietly burning at "
        "the corners as the only color, otherwise the iron is matte charcoal "
        "with cool blue moonlight catching only the outer edge, austere and "
        "warrior-clan in feel"
    ),
    # F — kumiko wood: traditional Japanese wooden lattice
    "F_kumiko_wood": (
        "an ornamental border of dark stained kumiko-style wooden lattice "
        "joinery, intricate but restrained geometric wooden joints visible "
        "in the corners only, the long edges stay clean dark wood, a thin "
        "warm amber glow from inside the window picking out the joinery"
    ),
}

# ============================================================================
# FS COUNTER PANEL — three variants. Aspect ratio 4:3, anchors a "FREE SPINS"
# title above a large numeric "X OF Y" counter rendered later by the FE.
# ============================================================================

FS_COMPOSITION = (
    "a single ornamental small horizontal panel viewed straight-on flat, "
    "with a perfectly empty solid deep indigo center inside the panel where "
    "text will be added later, the panel is the only subject, isolated against "
    "a solid deep indigo backdrop, four to three aspect ratio horizontal "
    "orientation, presented straight-on in symmetric frontal view, panel is "
    "small and restrained — not a big banner"
)

FS_PANEL_VARIANTS = {
    "A_washi_strip": (
        "a small horizontal washi paper strip with rough torn top and bottom "
        "edges, the paper is aged ivory cream with subtle pink sakura "
        "embossing visible in the grain, a thin gold inkline border on the "
        "inside, sumi-e ink shadow underneath, no text in or on the paper"
    ),
    "B_iron_plate": (
        "a small horizontal dark iron plate with hammered hand-forge texture, "
        "tiny cyan foxfire flames lit at the two outer ends as the only color, "
        "thin matte gold rim along the inside edge, austere warrior-clan feel"
    ),
    "C_lacquer_mini": (
        "a small horizontal deep crimson lacquer plaque with a thin gold "
        "leaf rim around the inside, small kamon mon-emblems at each end "
        "as the only ornament, restrained and refined"
    ),
}

# ============================================================================
# Build variants list for gen_batch
# ============================================================================

def _seed_base(name: str) -> int:
    h = hashlib.md5(name.encode()).hexdigest()
    return int(h[:4], 16)


def reel_frame_variants():
    variants = []
    for vkey, vprose in REEL_FRAME_VARIANTS.items():
        seed = _seed_base(vkey)
        prompt = f"{PROSE_PREFIX}, {vprose}, {FRAME_COMPOSITION}. {NEG_COMMON}"
        for mtag, mid, ar in [("flux", FLUX, "1:1"), ("seedream", SEED, "1:1")]:
            body = {
                "prompt": prompt,
                "num_images": 1,
                "enable_safety_checker": False,
                "output_format": "png",
                "aspect_ratio": ar,
                "seed": seed,
            }
            variants.append({
                "name": f"{vkey}_{mtag}",
                "model": mid,
                "body_base": body,
            })
    return variants


def fs_panel_variants():
    variants = []
    for vkey, vprose in FS_PANEL_VARIANTS.items():
        seed = _seed_base("fs_" + vkey)
        prompt = f"{PROSE_PREFIX}, {vprose}, {FS_COMPOSITION}. {NEG_COMMON}"
        for mtag, mid in [("flux", FLUX), ("seedream", SEED)]:
            body = {
                "prompt": prompt,
                "num_images": 1,
                "enable_safety_checker": False,
                "output_format": "png",
                # Seedream supports custom 4:3; flux-1.1-ultra requires preset
                "aspect_ratio": "4:3",
                "seed": seed,
            }
            variants.append({
                "name": f"{vkey}_{mtag}",
                "model": mid,
                "body_base": body,
            })
    return variants


def run_reel_frame():
    out = os.path.join(OUT_ROOT, "reel_frame")
    res = gen_batch(reel_frame_variants(), out, gens_per_variant=3, parallel=4)
    build_contact_sheet(out)
    return res


def run_fs_panel():
    out = os.path.join(OUT_ROOT, "fs_panel")
    res = gen_batch(fs_panel_variants(), out, gens_per_variant=3, parallel=4)
    build_contact_sheet(out)
    return res


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    if target in ("reel_frame", "all"):
        print("\n=== REEL FRAME ===")
        run_reel_frame()
    if target in ("fs_panel", "all"):
        print("\n=== FS PANEL ===")
        run_fs_panel()
