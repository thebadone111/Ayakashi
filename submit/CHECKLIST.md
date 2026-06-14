# Ayakashi — Stake Engine Submission Checklist

Mapped against Stake Engine's official **Approval Guidelines**
(https://stake-engine.com/docs/approval-guidelines and sub-pages) + the math
**data-format** spec. Status: `[x]` verified · `[~]` needs live uploader/Max ·
`[ ]` open. Last updated: R5 submit-prep + math re-run (RTP 0.965, base 1M), 2026-06-14.

A submission is **two publishes** at engine.stake.com — **Math** and **Front End** —
for a specific frontend + math version. See `README.md` for upload steps.
Limits (confirmed by Max): **15 GB math**, **15 GB front end**.

---

## A. Game-integrity rules (hard approval gates)

- [x] **Stateless** — each bet is independent; one `/play` resolves a full round.
      No cross-round state. (Stake: games are "strictly stateless".)
- [x] **No jackpots / gamble / double-up / continuation / early-cashout** — Ayakashi
      is lines + tumble + free spins + Buy Bonus only. (Buy Bonus is a bet mode,
      explicitly allowed; it is NOT a gamble feature.)
- [x] **No prohibited content** — adult yokai/folklore theme; no child-like
      characters, nothing offensive/explicit. (Stake rejects underage-appealing
      or explicit content.)
- [~] **Sufficient quality** — functionality/clarity/communication/performance.
      Reviewer judgment; the R5 polish pass targets this. (See load-time note in D.)

## B. MATH publish  (`submit/math/`)

Per `math-sdk/docs/rgs_docs/data_format.md`.

- [x] `index.json` strict format — base `cost 1.0`, bonus `cost 100.0`, correct
      `events`/`weights` filenames.
- [x] Lookup CSVs — `uint64` `simId,roundProbability,payoutMultiplier`.
- [x] Game logic — `books_{base,bonus}.jsonl.zst`, each round has
      `id` / `events` / `payoutMultiplier`.
- [x] **CSV payout ↔ jsonl `payoutMultiplier` match** (engine hashes these).
      Re-run: `math-sdk/env/Scripts/python.exe submit/_verify_books.py`.
- [x] **RTP = 0.9650** — recomputed from BOTH lookup tables (base 0.965, bonus 0.965).
- [x] **Max win = 2000×** — config + both tables cap at `200000`.
- [x] **Sim count: shipping base 1M / bonus 100k.** The bonus-mode 1M OOM on a
      32 GB machine was sidestepped by dropping threads from 28 → 26 and the
      compression batch size from 50k → 15k; base ran 1e6 cleanly. Optimizer pins
      RTP=0.965 / 2000× across both.
- [~] **Upload + backend stats check passes** — do the Math publish; confirm green.

## C. FRONT-END publish  (`submit/frontend/`)

- [x] Static build (`pnpm run build --filter=lines`) — `index.html` + `_app/` +
      `assets/` + `fonts/` + `favicon.svg` + loaders, laid out at folder root.
- [x] **Size 21 MB** — far under 15 GB. (Trimmed 24 MB of unused/working fonts;
      see D.)
- [x] **No hardcoded `rgs_url`** — `sessionID`/`lang`/`device`/`rgs_url` read from
      the launch URL via the SDK `Authenticate` component.
- [x] **`/wallet/authenticate` on load** — SDK calls it first (else 400 `ERR_IS`).
- [x] **Money = integer, 6 dp** — handled by SDK currency utils.
- [x] **Round resume** — SDK xstate `resumeBet` continues an in-progress round
      from `round.event` in the authenticate response (Stake replay requirement).
- [x] **Error handling** — SDK maps Stake `ERR_*` codes.
- [x] **Localisation** — `lang` (ISO 639-1) drives i18n; social-casino text swap
      (`social=true`, e.g. BET→SPIN) supported by the SDK i18n layer.
- [x] **Required screens/states** — loading, base spin, win presentation, free-
      spins intro/counter/outro, Buy Bonus, max-win/wincap.
- [ ] **🚩 BLOCKER: Pay Table & Game Rules modals are SDK placeholders** — the
      menu is fully wired (ButtonMenu → drawer → PayTable/GameRules/Settings open),
      but `ModalPayTable` renders literally `ADD YOUR PAY TABLE` and
      `ModalGameRules` renders `ADD YOUR GAME RULES` (in `components-ui-html`).
      Stake reviews "clarity/communication" — these MUST be filled with the real
      symbol payouts (data is in `game/config.ts`) + paylines and a rules
      description (tumble, wilds, scatters→free spins, Ofuda, Kanabo, Buy Bonus).
- [x] **Other menu modals work** — Bet menu, Auto Spin, Buy Bonus, Settings are
      functional SDK defaults.
- [ ] **Placeholder identifiers** — `config.ts` still has `providerName:
      "sample_provider"`, `gameName: "sample_lines"` (auto-generated from math);
      `GameVersion version="0.0.0"`. Set real values before submit.
- [x] **FS-end WebGPU crash fixed** (R5) — no per-frame `_resourceId` throw.
- [~] **Live smoke test** — after publish: Developer → Start session → Launch;
      play base + Buy Bonus; confirm no console errors and round completes.

## D. Front-end hygiene notes (done / flagged)

- [x] **Removed 24 MB of unused fonts from the bundle** — three full TTFs
      (Shippori/YujiMai/YujiSyuku) + a `brush/` dir of **personal-use-only demo
      fonts** (NinjaKage/Scarfire/Shotengai + their zips) were being copied from
      `static/` into every build. They are build-inputs only; runtime uses the
      `fonts/*-Subset.woff2`. Relocated to `art/fonts/`, `bake-logo.py` repointed.
      **Shipping personal-use demo fonts would itself be a licensing problem** —
      now resolved for the bundle.
- [~] Bitmap PIXI fonts (`goldFont/silverFont/purpleFont/goldBlur`) are still
      loaded via `assets.ts` but the game renders Yuji Syuku canvas text; could be
      pruned later to shave load further (not a blocker).

## E. Submission process / paperwork

- [x] **Game blurb drafted** — theme + mechanics for the promo/description tag
      (required with every approval request). See `GAME-BLURB.md`.
- [ ] **Record the exact frontend + math version** you publish (approval is tied
      to a specific pair).
- [x] **Provably fair** — the published books + lookup tables ARE the verifiable
      outcome set; no extra frontend work.
- [ ] **Post-approval:** only minor visual updates are allowed without re-review.

## F. Pre-submit decisions (Max)

- [x] **NinjaKage licence** — RESOLVED: NinjaKage is open-license, free for
      commercial use (Max, 2026-06-14). No action needed; keep `DISPLAY_FONT`.
- [x] **Final audio loudness** — signed off by Max (R5 mix is good).
