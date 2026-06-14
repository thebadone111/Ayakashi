# Ayakashi — Stake Engine Submission Package

Everything needed to publish Ayakashi to Stake Engine, in upload-ready format.
A submission is **two separate publishes** at https://engine.stake.com.

```
submit/
├── math/                       → publish as "Math"
│   ├── index.json
│   ├── lookUpTable_base_0.csv
│   ├── lookUpTable_bonus_0.csv
│   ├── books_base.jsonl.zst
│   └── books_bonus.jsonl.zst
├── frontend/                   → publish as "Front End"
│   ├── index.html
│   ├── _app/
│   ├── assets/
│   ├── favicon.svg
│   ├── loader.gif
│   └── stake-engine-loader.gif
├── CHECKLIST.md                → submission checklist (mapped to Stake's guidelines)
├── GAME-BLURB.md               → theme+mechanics blurb (required with the approval request)
└── _verify_books.py            → re-runs the math integrity check
```

**Before you submit:** approval is tied to a specific **frontend version + math
version** — record both when you publish. Include the `GAME-BLURB.md` copy with
the approval request. After approval, only minor visual updates are allowed
without re-review.

## Step 1 — Publish the Math

1. engine.stake.com → your game → **Files** (or Math) page.
2. Import the **contents of `submit/math/`** (the `index.json` must sit at the
   root of the selected upload set).
3. **Publish Game → Math**. The backend runs a preliminary stats check (RTP,
   probabilities, payout hashing). Wait for it to go green.
   - Note: `books_bonus.jsonl.zst` is ~461 MB — the upload takes a while.

## Step 2 — Publish the Front End

1. **Files** page → Import files → select the **whole `submit/frontend/` folder**.
2. **Publish Game → Front End**.

## Step 3 — Smoke test

1. **Developer** page → **Start game session** → **Launch in New Tab**.
2. Play a base spin and a Buy Bonus; confirm no console errors and the round
   completes (balance updates, end-round fires).
3. Optionally copy the launch URL's query string into local DEV mode
   (`pnpm run dev --filter=lines`) to debug against the live RGS.

## Regenerating the package

- **Math** (only if the math changes): re-run the math sim/optimization, then
  copy `math-sdk/games/0_0_lines/library/publish_files/*` into `submit/math/`.
- **Front End** (after any code/asset change):
  ```
  cd web-sdk && pnpm run build --filter=lines
  ```
  then copy the build output (`index.html` from the prerendered pages +
  everything under the client output dir) into `submit/frontend/`.
  Working font sources now live in `art/fonts/` (moved out of `static/`), so the
  build no longer bundles the 24 MB of unused/personal-use demo fonts — the
  rebuilt bundle is clean automatically (no manual stripping needed).

## Verify math integrity locally

```
math-sdk/env/Scripts/python.exe submit/_verify_books.py
```
Confirms every sampled round has `id/events/payoutMultiplier` and that the CSV
`payoutMultiplier` column exactly matches the compressed game logic.

---
See `CHECKLIST.md` for the full verified/open status of every requirement.
