"""Download CC0 Japanese SFX candidates from Pixabay.

For each search term: fetch the search page, take the top detail pages,
parse the JSON-LD contentUrl + duration + title, download the mp3 into
art/generated/audio/<term>/ and record everything in manifest.json.

Pixabay content is royalty-free (Pixabay Content License) - free for
commercial use, no attribution required.

Run: ../../../math-sdk/env/Scripts/python.exe download-sfx.py
"""
import json, os, re, subprocess, time

# NOTE: transport is curl, not requests — Cloudflare passes curl's TLS
# fingerprint but challenges python-requests with "Just a moment...".
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36")
OUT_ROOT = r"C:\Users\tiger\Desktop\Stake\game-1\Ayakashi\art\generated\audio"

SEARCHES = {
    "wood-hit":   ("wood hit", 14),
    "gong":       ("gong", 14),
    "kabuki":     ("kabuki", 10),
    "taiko":      ("taiko", 14),
    "shakuhachi": ("shakuhachi", 10),
    "shamisen":   ("shamisen", 12),
    "koto":       ("koto", 14),
}

DUR_RE = re.compile(r'"duration":"PT(?:(\d+)M)?([\d.]+)S"')
URL_RE = re.compile(r'"contentUrl":"(https://cdn\.pixabay\.com/download/audio/[^"]+)"')
NAME_RE = re.compile(r'"name":"([^"]{0,120})"')

def get_text(url: str) -> str:
    time.sleep(0.35)  # politeness
    r = subprocess.run(
        ["curl", "-sL", "-A", UA, "-H", "Accept-Language: en-US,en;q=0.9", url],
        capture_output=True, timeout=60,
    )
    return r.stdout.decode("utf-8", "ignore")

def get_file(url: str, dest: str) -> bool:
    time.sleep(0.35)
    r = subprocess.run(["curl", "-sL", "-A", UA, url, "-o", dest],
                       capture_output=True, timeout=120)
    return r.returncode == 0 and os.path.exists(dest) and os.path.getsize(dest) > 4000

manifest = {}
for slug, (term, n_take) in SEARCHES.items():
    out_dir = os.path.join(OUT_ROOT, slug)
    os.makedirs(out_dir, exist_ok=True)
    q = term.replace(" ", "%20")
    page = get_text(f"https://pixabay.com/sound-effects/search/{q}/")
    hrefs = []
    for m in re.finditer(r'href="(/sound-effects/[a-z0-9-]+-\d+/)"', page):
        if m.group(1) not in hrefs:
            hrefs.append(m.group(1))
    print(f"[{slug}] {len(hrefs)} results, taking {n_take}", flush=True)

    items = []
    for href in hrefs[:n_take]:
        try:
            detail = get_text(f"https://pixabay.com{href}")
            mu = URL_RE.search(detail)
            md = DUR_RE.search(detail)
            if not mu:
                continue
            url = mu.group(1).replace("\\/", "/")
            dur = (int(md.group(1) or 0) * 60 + float(md.group(2))) if md else -1
            name = href.rstrip("/").rsplit("/", 1)[-1]
            fn = os.path.join(out_dir, name + ".mp3")
            if not os.path.exists(fn) and not get_file(url, fn):
                print(f"    skip {name} (download failed)", flush=True)
                continue
            items.append({"file": name + ".mp3", "duration": round(dur, 2),
                          "page": f"https://pixabay.com{href}", "cdn": url.split("?")[0]})
            print(f"    {name}  {dur:.2f}s  {os.path.getsize(fn)//1024}KB", flush=True)
        except Exception as e:
            print(f"    ERROR {href}: {e}", flush=True)
    manifest[slug] = items

with open(os.path.join(OUT_ROOT, "manifest.json"), "w", encoding="utf-8") as fh:
    json.dump(manifest, fh, indent=1)
total = sum(len(v) for v in manifest.values())
print(f"\nDone: {total} files. Manifest at {OUT_ROOT}\\manifest.json")
