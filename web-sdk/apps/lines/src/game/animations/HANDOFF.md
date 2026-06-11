# Ayakashi Animation Handoff — Tom

**From:** Tiger / Max (via Claude) · **Date:** 2026-06-11
**Where:** everything lives in `apps/lines/src/game/animations/` — import from the barrel:

```ts
import { WinCelebration, TumbleExplosion, KanaboSmash /* ... */ } from '../game/animations';
```

## ⚡ INTEGRATION STATUS: CODE-COMPLETE, NOT YET COMPILED

The wiring described below is **already done** — you're reviewing, not building:

- **Art**: Ayakashi atlas + 4 bg layers + avatar copied into `static/assets/sprites/` (symbolsStatic overwritten, `background/` + `avatar/` added)
- **`assets.ts`**: rewritten Spine-free; added `bgBg/bgFg/bgEffect/bgMist/avatar` keys
- **`constants.ts`**: SYMBOL_INFO_MAP all-sprite incl. X (x2.png/Kanabo) + M (x.png/Ofuda); INITIAL_BOARD fixed to 5×7 (was 5×5 mining layout → board rendered 5×3!)
- **`config.ts`**: X + M added to symbols (extends the SymbolName type)
- **`typesBookEvent.ts`**: tumbleBoard, updateTumbleWin, fsMultiplier, freeSpinRetrigger, wincap added
- **`bookEventHandlerMap.ts`**: all 5 new handlers + Kanabo trigger inside tumbleBoard + payline/burst FX in winInfo + bonus trigger in freeSpinTrigger + bg mood switches. FX calls wrapped in `tryFx` so animation errors can never stall book playback
- **`stateGame.svelte.ts`**: tumble board state ported from cluster; reel-stop FX hook added
- **New components**: `FxHost.svelte` (pixi bridge), `TumbleBoard/TumbleBoardBase/TumbleSymbol.svelte` (cluster port, procedural explosions)
- **Rewritten components**: Background, BoardFrame (procedural glow), Anticipation, FreeSpinIntro/Outro, TransitionAnimation, LoadingScreen, Win, Symbol (sprite-only), ReelSymbol (wild-landing hook), Game (FX layers + avatar + AYAKASHI name)
- **`game/fxManager.ts`**: central lazy wiring; handles padded→visible row conversion (`PADDING_ROW_OFFSET = 1`) and board→canvas transforms

**Your first steps:**
1. `pnpm install && pnpm --filter lines check` — this code has NOT been compiled (no registry access in the sandbox it was written in). Expect a handful of type nits; fix or send back.
2. `pnpm --filter lines storybook` — run ModeBase/ModeBonus stories. NOTE: `stories/data/` still contains mining-game books; regenerate from `library/publish_files/books_*.jsonl.zst` for real Ayakashi flows (tumble, fsMultiplier, X explosions are NOT in the old story data).
3. Verify visually: spin → win (payline trace + bursts) → tumble cascade → bonus trigger → FS intro → ofuda multiplier → big win tiers.

**Known v1 limitations:** overlay FX capture canvas size at first use (mid-session resize not handled); `freeSpinRetrigger` shows no dedicated celebration; small/medium wins reuse the reference count-up text; sounds/fonts still mining placeholders.

## The big picture

**Zero Spine.** Every animation in the game is covered by these 15 pure-PixiJS modules — generated glows, rays, particles, Graphics, Text. They run against the static art as delivered (WebP symbol sprites + 4 background PNGs). The reference game's Spine assets (`bigwin`, `fsIntro`, `transition`, `anticipation`, `explosion`, `foregroundAnimation`, per-symbol `h1.json`–`l5.json`, `W`, `S`, `M`, `loader`) can all be dropped from `assets.ts` once you've wired the replacements.

Every module follows the same contract:

- **Constructor** takes `app` (PIXI Application) + a parent/effects `Container`, plus board geometry where relevant (`boardOrigin` = top-left of visible board in that layer's space, `symbolSize` = 120).
- **Trigger methods** are async where the game flow should await them.
- **`destroy()`** releases every ticker callback, tween, and display object. Call it on board/game unmount. Instances are reusable across spins — construct once, not per spin.
- **`fontFamily`** defaults to Arial. Pass our local WOFF2 family name (no external fonts — Stake requirement).

Particle systems are pooled with hard caps; idle animations share a single ticker callback. Target is comfortably 60 fps.

## Module → event wiring map

Book events from the math (`library/configs/event_config_*.json`):
`reveal, winInfo, updateTumbleWin, tumbleBoard, setTotalWin, setWin, freeSpinTrigger, updateFreeSpin, freeSpinRetrigger, fsMultiplier, freeSpinEnd, finalWin, wincap`

Note: `tumbleBoard`, `updateTumbleWin`, `fsMultiplier`, `freeSpinRetrigger`, `wincap` have **no handlers in apps/lines yet** — port the tumble pattern from `apps/cluster/src/game/bookEventHandlerMap.ts` (lines ~81, ~201). The modules below slot into those handlers.

| Module | Class | Wire to | Notes |
|---|---|---|---|
| `winCelebration.ts` | `WinCelebration` | `setWin` / `freeSpinEnd` → `winUpdate`/`freeSpinOutroCountUp` for winLevel 6–10 | `play({ level: winLevelData.alias, amount, formatAmount, duration: winLevelData.presentDuration })`. `skip()` on press-to-continue. Replaces `bigwin` Spine. Also covers `wincap` (use `level: 'max'`). |
| `bonusTrigger.ts` | `BonusTriggerAnimation` | `freeSpinTrigger`, after scatter win anim, before FS intro | `play({ scatterPositions })` — screen-space scatter centres. |
| `freeSpinsScreen.ts` | `FreeSpinsScreen` | `freeSpinIntroShow/Update`, `freeSpinOutroCountUp` | `playIntro({ totalFreeSpins })`, `playOutro({ amount, formatAmount })`, `press()` on tap. Replaces `fsIntro` Spines. |
| `wildLanding.ts` | `WildLandingAnimation` | W `land` state in ReelSymbol/SymbolWrap | `playAt({ x, y, symbol, multiplier })` — badge shows when multiplier > 1. Replaces `wild_dynamite_land`. |
| `reelSpinFx.ts` | `ReelSpinFx` | reel settle callback + `reveal.anticipation` flags | `onReelStop(i, { reelContainer, scatterLanded })`, `startAnticipation(i)` / `stopAnticipation(i)`. Replaces `anticipation` Spine. Also exports `AYAKASHI_SPIN_OPTIONS` — drop into `constants.ts` SPIN_OPTIONS. |
| `paylineHighlight.ts` | `PaylineHighlight` | `winInfo`, per win | `showLine({ positions, lineIndex, amount, formatAmount })`, `clear()` before tumble/next spin. |
| `symbolWinFx.ts` | `SymbolWinFx` | `boardWithAnimateSymbols` win state | `play({ symbol, x, y, tier })`. **This is what lets every `win` entry in SYMBOL_INFO_MAP stay a static sprite** — see below. |
| `symbolIdle.ts` | `SymbolIdleManager` | symbol `static` state | `register(container, 'standard'|'wild'|'scatter')` on settle, `unregister()` on spin/explode. Single shared instance. |
| `tumbleExplosion.ts` | `TumbleExplosion` | `tumbleBoard` handler | `explodeMany(cells)` for all `explode: true` positions, then slide down. Replaces `explosion` Spine. |
| `kanaboSmash.ts` | `KanaboSmash` | `tumbleBoard`/`winInfo` when an X is on board with a win | `playAt({ center, affected })` — play **before** `TumbleExplosion` on the 3×3 cells. Pass `clubTexture` (x2 art); procedural fallback included. |
| `ofudaCharm.ts` | `OfudaCharm` | `fsMultiplier` book event | `playAt({ cell, multiplier, symbol })`. |
| `backgroundAmbient.ts` | `BackgroundAmbient` | game mount | Feed the 4 bg textures (bg_bg/bg_fg/bg_effect/bg_mist). `setMood('freespin')` on FS enter, `'base'` on exit. `resize(w,h)` on canvas resize. Replaces `foregroundAnimation` Spine rigs. |
| `transitionWipe.ts` | `TransitionWipe` | `transition` emitter event | `await wipe.play({ onCovered })` — swap board frame glow / bg mood inside `onCovered`. Replaces `transition` Spine. |
| `uiFx.ts` | `SpinButtonFx`, `BetStepperFx`, `CollectFx` | pointer events + spin state | `press()`, `setSpinning()`, `setEnabled()`; `tick(at, ±1)`; `pulse(at, meter)`. |
| `loaderFx.ts` | `LoaderOrbs` | LoadingScreen | `setProgress(0..1)`. Replaces `loader` Spine. |
| `avatarFx.ts` | `AvatarActor` | game mount — **no event wiring needed** | Gacha-style character from the flat avatar PNG: MeshPlane deform (flowy idle waves) + spring jiggle physics. Auto-subscribes to `fxBus` and reacts to reel stops, wilds, smashes, tumbles, bonus, FS intro and big wins (scaled by tier). `setPosition()` on layout change, `setVisible(false)` if portrait is cramped. Replaces the planned avatar Spine rig. |
| `fx.ts` | shared toolkit | — | `TweenRunner`, `ParticlePool`, `ScreenShaker`, `RayBurst`, `flash`, glow/ray textures, `PALETTE`, easings. Use these for any new effect so everything stays consistent. Also exports **`fxBus`** — a tiny pub/sub the FX modules emit on (`bigwin`, `bonus`, `smash`, `wildland`, `tumble`, `fsintro`, `reelstop`). The avatar listens to it; you can subscribe anything else (audio stingers, board frame flashes) the same way: `fxBus.on('bigwin', handler)`. |

## SYMBOL_INFO_MAP changes (constants.ts)

1. **All `win` states → static sprite.** e.g. `H1.win = h1Static`. `SymbolWinFx` provides the motion. Same for `postWinStatic`, `land` (W gets `WildLandingAnimation` layered on top).
2. **Remove the `explosion` spine ref** from every symbol — `TumbleExplosion` handles removal.
3. **Add the two new symbols:**
   - `X` (exploder) — art file is **x2 / Oni Kanabo** (`x2.png` in the atlas). Confirmed mapping.
   - `M` (fsMultiplier) — art file is **x / Ofuda Talisman** (`x.png` in the atlas). Confirmed mapping.
   - `L5` is a regular sprite in Ayakashi (not the reference Spine multiplier) — `l5.webp`.
4. Swap the atlas: Tiger's `symbolsStatic` atlas (403×1408, 14 symbols) from `art/finals/` replaces the reference mining atlas in `static/assets/sprites/symbolsStatic/`.

## Layering (zIndex guide)

```
background layer      ← BackgroundAmbient
board / symbols
board effects layer   ← ReelSpinFx (anticipation behind symbols if preferred),
                        SymbolWinFx, PaylineHighlight, WildLanding, TumbleExplosion,
                        KanaboSmash, OfudaCharm
overlay layer         ← BonusTrigger, FreeSpinsScreen, WinCelebration
top layer             ← TransitionWipe (covers everything incl. UI per uiHide)
```

`shakeTarget` for WinCelebration/BonusTrigger/KanaboSmash should be the board container (or a camera group wrapping board + bg) — not the layer the effect renders in, or the shake moves the effect itself.

## Cleanup checklist before submission

- [ ] Strip all reference Spine entries from `assets.ts` (and the `static/assets/spines/` folders from the build) once wired
- [ ] Replace mining bitmap fonts (`goldFont` etc.) or pass our WOFF2 `fontFamily` into every module constructor
- [ ] Reference `sfx_*`/`bgm_*` sound names in bookEventHandlerMap still point at mining audio — swap when Ayakashi audio lands
- [ ] Port tumble handlers from the cluster app (`tumbleBoard`, `updateTumbleWin`) + add `fsMultiplier`, `freeSpinRetrigger`, `wincap` handlers
- [ ] `pnpm check` — these modules were written against pixi.js 8.8.1 / strict TS but have **not** been compiled (sandbox had no registry access)
- [ ] Test in Storybook with the existing `ModeBaseBook` / `ModeBonusBook` stories; Bet Replay for big win / max win / bonus trigger paths

## Questions / ping Tiger

- Multiplier flow: W carries multipliers in FS (`padding_symbol_values`), M is the `fsMultiplier` event symbol — Zacke owns the exact event payloads; check `fsMultiplier` payload shape before wiring OfudaCharm.
- If any module's feel is off (timing, intensity), all tunables are top-of-file constants or constructor options — tweak freely, the structure won't fight you.
