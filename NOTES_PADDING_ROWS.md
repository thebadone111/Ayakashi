# Notes — padding rows + 4 vs 5 visible rows

**Recorded 2026-06-27.** Not a planned change — Max asked these be flagged for double-check before either ships.

---

## 1. Padding-row animation leak (math ↔ FE)

### Current model

Math board: **7 rows per reel** (`num_rows = 5`, plus 1 padding above + 1 padding below — see [math-sdk/games/0_0_lines/game_config.py:32](math-sdk/games/0_0_lines/game_config.py)).

Frontend board:
- `BOARD_DIMENSIONS = { x: 5, y: 5 }` *(visible)*  → [constants.ts:39](web-sdk/apps/lines/src/game/constants.ts:39)
- `INITIAL_BOARD` has 7 symbols per reel → padded form
- `PADDING_ROW_OFFSET = 1` → [fxManager.ts:52](web-sdk/apps/lines/src/game/fxManager.ts:52)
- `toVisible(p) = { reel, row: row - 1 }` maps padded → visible

### The leak

`bookEventHandlerMap.ts:208` and `:247` call `animateSymbols({ positions: bookEvent.positions })` for `freeSpinTrigger` and `freeSpinRetrigger` **without filtering** through `isVisible`. The handler then does:

```ts
const reelSymbol = context.stateGame.board[reel].reelState.symbols[row];
reelSymbol.symbolState = 'win';
```

If the math ever emits a scatter at a padded-row index outside the visible range (row 0 or row 6), this flips a padding-row symbol to the 'win' state. The `BoardMask` clips its render, but the win-state idle pulse (scale ≥ 1) can spike enough to bleed past the mask edge for a frame or two before the clip catches up.

By contrast, `winInfo` at `:114` already filters wins through `isVisible` before mutating any symbol state — that path is safe.

### Two fixes (pick one)

**A. Belt-and-braces in `animateSymbols`** *(recommended)*. Add an `isVisible` guard inside `animateSymbols` itself so no caller can ever flip a padding cell. Defensive; survives every future call site. Three lines.

**B. Audit the math.** Confirm Stake's Lines engine never emits scatter positions on padded rows for this game. If true, fix A is unnecessary but the audit needs to be repeated whenever the math is touched.

I'd ship **A** because it's free insurance. Suggested location:

```ts
// Board.svelte:32, top of boardWithAnimateSymbols
const visible = symbolPositions.filter((p) => {
  const v = p.row - PADDING_ROW_OFFSET;
  return v >= 0 && v < BOARD_DIMENSIONS.y;
});
```

### Diagnostic before fixing

To confirm this is the actual bleed Max is seeing, run a free-spin-trigger book and log `bookEvent.positions[*].row` values. If you see `0` or `6`, fix A bites; otherwise it's something else (e.g., reel-spin transit, anticipation pulse). Logging hook:

```ts
// bookEventHandlerMap.ts:208 — temporary
console.warn('[fs-trigger]', bookEvent.positions.map(p => `${p.reel}:${p.row}`));
```

---

## 2. 4 rows vs 5 rows

Max raised this as an option for reducing scene crowding. Worth weighing the cost properly before committing — a row-count change is **not** a cosmetic tweak.

### What costs money

| Change | 5 rows (now) | 4 rows |
|---|---|---|
| Math reels | regenerated with `num_rows = 4`, every reel rewritten | needed |
| Math sim | 1 M base + 100 K bonus, hours of compute, RTP land |  needed |
| Paytables | line-pay multipliers change (4-of-a-kind matters more than 5-) | needed |
| Wincap | 2000× distribution shifts | needed |
| Lookup tables | regenerated | needed |
| Submit/ package | restaged from scratch | needed |
| FE `BOARD_DIMENSIONS` | one constant | trivial |
| FE `INITIAL_BOARD` | restructured to 6 cells per reel (4 vis + 2 pad) | trivial |
| FE paylines lookup table | path strings shorten | small |

A 5×5 → 5×4 conversion is **at least a 2-day round**: math redesign + re-sim + verify + FE rewire + new payTable copy + new submit package. The earliest the change could land is after a clean math freeze.

### What it actually solves

The complaint is *"the scene is too crowded"*. Row-count is one of several levers:

| Lever | Cost | Effect |
|---|---|---|
| **UI chrome regen (A3)** — smaller reel_frame + tighter `frame_bg1` | $1, ~1 hr fal.ai | Less border bulk; reels feel less hemmed-in. **Already planned for next round.** |
| **`SYMBOL_SIZE` 80 → 72** | 1 line | Board 400 → 360. ~10% less reel mass; symbols slightly smaller too. |
| **Avatar `height: 560 → 480`** | 1 line | Less right-side mass. Width auto-derives. |
| **Re-centre `BOARD_ANCHOR`** | 1 line | Board sits more centrally; avatar pushes further right. |
| **Drop to 4 rows** | 2-day round | Substantially less reel mass + bigger cells. The real fix if the lighter levers still feel cramped. |

### Recommendation

Try the lighter levers first **after the UI chrome regen lands**. If the scene still reads crowded with a smaller frame, a regen-friendlier `SYMBOL_SIZE`, and a slightly smaller avatar, then 4 rows is worth the math round.

A 4-row build is a stronger product on its own merits — it gives the symbols room to breathe and reads more luxurious at the cell scale. The case for it isn't *"the only fix for crowding"*, it's *"distinct visual register that's worth a math round"*.

### Update 2026-06-27 (afternoon)

**Max is leaning toward 4 rows.** Direction noted; this is now the assumed target for the next math round after current Track A finishes. Concrete sequencing once we get there:

1. `math-sdk/games/0_0_lines/game_config.py:32` — `self.num_rows = [4] * self.num_reels`. Knock-on changes: every reel strip in `reels/BR0` etc. needs re-balanced occurrences (a 4-high reel changes hit frequencies).
2. New paytables — 4-of-a-kind becomes the top pay-line size; 3-of-a-kind matters even more. Multipliers re-tuned.
3. Wincap distribution re-sims (RTP 0.965, wincap 2000× both have to land cleanly).
4. FE: `BOARD_DIMENSIONS.y` 5→4; `INITIAL_BOARD` arrays shrink to 6 entries per reel (4 vis + 1 pad each side); paylines lookup table re-derived from math output via `sync-config.py`.
5. Submit/ package re-staged from scratch.

The art (atlas, bg, avatar, frame) doesn't change — that's a clean carry-over.

---

## 3. Avatar I2V — "high quality, a bit out there" (later)

Max's note 2026-06-27: when we get to the avatar animation pass, lean **higher quality and more creative** than a baseline idle.

Concrete options to explore:
- **Multi-shot reaction set** beyond breath-and-blink — small dance flourish on big wins, fox-tail flick on tumble cascade, nine-tail bloom on free-spin trigger.
- **Wan I2V "720p" tier** rather than the 480p default — sharper, larger frame budget for nuanced motion.
- **Higher fps sheets** — 24 fps instead of 12 reads as filmic rather than animatronic, at 2× the storage cost.
- **ControlNet-guided poses** for the variant set — actual changed body language (arms raised, sword draw, kimono flare) rather than img2img drift.
- **Particle-augmented frames** — composite foxfire/petals into the I2V output itself so her motion *carries* the FX rather than the FX layering separately on top.

Budget guide: each Wan 720p I2V pass is ~$0.50. A 5-state reaction set with ControlNet variants is ~$4-6 total. Worth it once the rest of the visual register is locked.
