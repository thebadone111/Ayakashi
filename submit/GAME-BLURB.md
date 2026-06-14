# Ayakashi — Submission Blurb

Stake requires a short blurb (theme + mechanics) with every approval request,
used for promotional copy and the in-client game description tag. Drafts below —
trim to whatever length the engine form allows.

## One-liner
Ayakashi — a moonlit descent into Japanese yokai folklore where cascading spirits,
ofuda talismans and the oni's war-club chase a 2000× haunt.

## Short (description tag)
Enter the spirit realm of **Ayakashi**, a 5×5 lines slot steeped in Japanese
yokai folklore. Winning spirits dissolve and tumble for repeated wins on a single
spin. Temple-bell scatters summon the Free Spins, where Ofuda talismans multiply
your awarded spins and the Oni's Kanabo smashes whole 3×3 clusters of the board.
Max win **2000×**, RTP **96.5%**.

## Reviewer-facing description

**Ayakashi — Spirits of the Floating World**

Ayakashi is a 5×5 lines slot steeped in Japanese yokai folklore. Players step
through a moonlit torii gate where cascading spirits, paper talismans and a
war-club-wielding oni chase a 2000× max win. The art direction is bespoke
RunComfy/FLUX — sumi-e ink, lacquer black-and-red, foxfire blues, and a kitsune
avatar who reacts to wins.

### Format
- **5×5 grid**, lines-pay (left-to-right).
- **Stateless single-round** resolution — one `/play` request resolves a full
  round including cascades and feature.
- No gamble, double-up, continuation, or cashout.

### Core mechanics
- **Tumble cascade.** Winning symbols dissolve and remaining symbols fall to fill
  the board, paying repeatedly within a single spin until no new wins land.
- **Wilds (W) — kitsune sigils.** Substitute for any paying symbol.
- **Scatters (S) — temple bells.** Three or more anywhere on the screen trigger
  Free Spins.

### Feature symbols
- **Ofuda talismans** — landing during the scatter trigger multiplies the number
  of free spins awarded. Scatters during the feature retrigger more.
- **Oni's Kanabo (war club)** — smashes a surrounding 3×3 cluster of the board,
  clearing space for large cascade chains.

### Free Spins
A dedicated bonus mode with its own intro (torii gate rise, foxfire pillars,
drifting petals) and outro. A Global Multiplier accumulates as kitsune wilds
land. Available as a **Buy Bonus** for a flat **100× cost**, routed through a
two-tap confirm dialog to prevent accidental spend.

### Math summary
- **RTP — 96.50%** (pinned by the optimizer on both lookup tables).
- **Max win — 2000×** bet; capped in both base and bonus payout tables.
- **Volatility — medium** in the base game (std-dev 11.66 over 1M sims); the
  bonus is naturally low-variance because every bought spin pays.
- **Sims shipped** — base 1,000,000 / bonus 100,000. Lookup CSVs and books
  hash-match (verified via `submit/_verify_books.py`).
- **Hit rate** — ~29% of base spins win at least once; every bonus play pays.

### Worth noting for review
- **Round resume** wired via the SDK's xstate `resumeBet` from `round.event` on
  authenticate — partially-played rounds restore correctly.
- **Localisation** respects launch-URL `lang`; social-casino text swap
  (BET→SPIN) supported via the SDK i18n layer.
- **Real Pay Table & Game Rules modals** — populated from the math config (no
  SDK placeholder text).
- **Bespoke Buy Bonus modal** with two cards (Base Game / Yokai Bonus) —
  replaces the SDK's generic `ModalBuyBonus` while keeping the engine flow
  (`activeBetModeKey → /wallet/play`) unchanged.
- **Frontend bundle 22 MB**; demo-licensed fonts have been removed from the
  build (only the runtime subsets ship).
- **FS-end WebGPU crash** previously caused by per-frame `_resourceId` on the
  PIXI 8.8 TextureGCSystem — resolved.

## Mechanics summary (legacy bullet list)
- **Format:** 5×5, lines-pay, single-request (stateless) round.
- **Tumble / cascade:** winning symbols explode and the board refills, paying
  repeatedly within one spin.
- **Wilds (W):** substitute and carry a multiplier on landing.
- **Temple-bell Scatters (S):** trigger the Free Spins feature.
- **Ofuda talismans:** during the trigger, multiply the number of free spins
  awarded; scatters during the feature retrigger more.
- **Oni Kanabo:** the club symbol smashes a surrounding 3×3 area for big cascades.
- **Free Spins:** dedicated bonus mode (Buy Bonus available at 100× cost).
- **Math:** RTP 0.9650, max win capped at 2000×, medium volatility (base).

## Theme keywords (promo)
Japanese folklore, yokai, oni, kitsune/foxfire, sumi-e ink, torii gate, ofuda
talisman, taiko & koto audio, moonlit/lantern night palette.
