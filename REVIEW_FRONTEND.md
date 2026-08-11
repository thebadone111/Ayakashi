# Ayakashi Frontend Code Review
**Branch:** final-dev | **Date:** 2026-07-02 | **Reviewer:** Claude Code

This is a thorough review of all frontend source under `web-sdk/apps/lines/src/`. Math SDK internals, art files, node_modules, and build output are excluded. All paths are relative to `web-sdk/apps/lines/src/` unless stated otherwise.

---

## 1. Current State Summary

### What is working
- **Core game loop** is wired end-to-end: XState actors, book event handlers, reel spin/stop/settle, tumble, free spins intro/outro, and bonus buy all connect correctly through the eventEmitter / fxManager / pixi-svelte layer.
- **Procedural FX pipeline** is architecturally solid — TweenRunner, ParticlePool, ScreenShaker, fxBus, and PostFx all have proper ticker lifecycle management and teardown.
- **Board rendering** — two-pass animating/static SymbolWrap layers, masking, board settle — is working correctly after the mask fix in round 4c.
- **Betting bar** (AoA single-row redesign) is complete per the 2026-06-28 session.
- **Particle system** — petal sheets (8 variants), ping-pong flipbook, per-particle random start frame — is correctly implemented.
- **KanaboSmash** choreography is complete and polished (wind-up → spin → slam → ripple → fade). Fallback procedural club silhouette works before the x2.png asset lands.
- **PaylineHighlight** is implemented with 7 rotating colors and comet trails.
- **FreeSpinCounter** is positioned and data-bound correctly. Uses Yuji Syuku so digits render.
- **PostFx** (bloom on both layers, RGBSplit/ZoomBlur impact kick, GodrayFilter, ShockwaveFilter) is always-on and event-driven.
- **CameraGrammar** (zoomIn breathing, dip on tumble) is implemented.
- **i18n** (Lingui en/zh) is wired.
- **Config is auto-generated** from math SDK and not hand-edited.
- **Texture GC disabled** as a workaround for the PixiJS v8.8 WebGPU bug — intentional.

### What is incomplete / placeholder
- **All audio** is the reference mining-game set. Zero Ayakashi-specific SFX or BGM.
- **All bitmap fonts** (`goldFont`, `silverFont`, `purpleFont`, `goldBlur`) are the mining-game set. The big win count-up and small win text use these legacy bitmaps.
- **Avatar idle sheet** was removed (old art, pending Wan I2V pass). Avatar displays a static webp with spring deformation only.
- **Avatar pose textures** (`avatarCheer`, `avatarWink`) are never registered — always undefined at runtime.
- **bgEffect and bgMist** are declared in `assets.ts` (and therefore preloaded, wasting bandwidth) but are never passed to BackgroundAmbient.
- **Game version** is hardcoded `"1.0.0"` and should be pulled from `package.json` or a build constant.
- **PayTable images** depend on `build-paytable-symbols.py` output in `components/paytable/img/*.webp` — it is unclear whether these exist in the repo or need to be generated.
- **Ninja Kage licence** is a demo face. A commercial licence must be confirmed or the font swapped before submission.

---

## 2. Bugs / Broken Things (Must Fix)

### BUG-01 — Avatar pose textures are always `undefined`
**File:** `game/fxManager.ts` (registerAvatar, ~line 320)  
**File:** `game/assets.ts`

`fxManager.registerAvatar()` calls `_avatar.setPoses({ cheer: texture('avatarCheer'), wink: texture('avatarWink') })`. Neither `'avatarCheer'` nor `'avatarWink'` is registered in `assets.ts`. `texture()` looks up `stateApp.loadedAssets[key]`, so both return `undefined`. The avatar will silently fall back to its static webp for every big-win and bonus reaction — no visual corruption, but the cheer/wink pose animation is dead.

**Fix:** Either add `avatarCheer` and `avatarWink` entries to `assets.ts` pointing to the actual files (once they exist), or remove the `setPoses` call from `fxManager` until the assets land and the idle sheet is restored. Do not leave a silent no-op on every big win.

---

### BUG-02 — `kanabo()` constructor passes a raw filename as an asset key
**File:** `game/fxManager.ts` (kanabo getter, approx. line 350)

```ts
_kanabo = new KanaboSmash({
    ...
    clubTexture: texture('x2.png'),   // <-- raw filename, NOT the registered key
```

The registered key in `assets.ts` is not `'x2.png'` — sprite atlas frames are accessed by their JSON frame name, not their source filename. `texture('x2.png')` returns `undefined`. The club smash always uses its procedural fallback silhouette instead of the Oni Kanabo art.

**Fix:** Use the correct asset key for the x2 sprite. Check whether the X symbol art comes from the `symbolsStatic` atlas (in which case use `Texture.from('x2.png')` after the atlas loads) or is a standalone sprite registered under a different key. Align with the pattern used for the X symbol in `SYMBOL_INFO_MAP` (`makeSymbolInfo('x2.png')`).

---

### BUG-03 — `winBurstAt()` calls `SymbolWinFx.play()` with `symbol: undefined`
**File:** `game/fxManager.ts` (`winBurstAt`, approx. line 400)  
**File:** `game/animations/symbolWinFx.ts`

`fxManager.winBurstAt()` is called from the `winInfo` handler. It constructs the call with `symbol: undefined` because the actual PixiJS container reference is not plumbed through. In `SymbolWinFx.play()`, when `symbol` is undefined, the elastic pop, shimmer, and settle animations are entirely skipped — only the glow and spark particles fire. The per-symbol win animation (the "possessed pop") **never plays**.

**Fix:** Pass the actual symbol container from the reel/board state into `winBurstAt`. The board's `stateGame.board[reel].reelState.symbols[row]` holds a `container` reference that should be forwarded.

---

### BUG-04 — Dead code: `SUPERSPIN` key check in `bookEventHandlerMap`
**File:** `game/bookEventHandlerMap.ts`, line 32

```ts
if (stateBet.activeBetModeKey === 'SUPERSPIN' || stateGame.gameType === 'freegame') {
```

The actual bet mode keys are `'base'` and `'bonus'` (lowercase, matching `config.ts` betModes). `'SUPERSPIN'` was copy-pasted from a different game. The condition `activeBetModeKey === 'SUPERSPIN'` is permanently false. This is in `winLevelSoundsStop()`, meaning after a big win the music resume logic for a supposed "SUPERSPIN" mode never triggers. Currently harmless since SUPERSPIN doesn't exist, but it's dead code that will confuse anyone maintaining the sound routing.

**Fix:** Remove the `'SUPERSPIN'` branch entirely.

---

### BUG-05 — `createBonusSnapshot` does not await `lastUpdateFreeSpinEvent`
**File:** `game/bookEventHandlerMap.ts`, lines 357-358

```ts
if (lastFreeSpinTriggerEvent) await playBookEvent(lastFreeSpinTriggerEvent, { bookEvents });
if (lastUpdateFreeSpinEvent) playBookEvent(lastUpdateFreeSpinEvent, { bookEvents }); // not awaited
if (lastSetTotalWinEvent) playBookEvent(lastSetTotalWinEvent, { bookEvents });       // not awaited
```

On mid-session resume (`createBonusSnapshot`), the `updateFreeSpin` and `setTotalWin` replay calls are fire-and-forget. If `freeSpinTrigger` is slow (it plays the full intro animation including the screen transition), the subsequent book events can execute before the trigger resolves, causing ordering violations: the FS counter may update before the intro screen appears, or the total win may display before the FS count is shown.

**Fix:** Add `await` to both remaining `playBookEvent` calls, or collect them in a `Promise.all` after the trigger awaits.

---

### BUG-06 — `bgEffect` and `bgMist` are preloaded but never used
**File:** `game/assets.ts`, lines 29-38

Both `bgEffect` and `bgMist` are declared with `preload: true`. This means they block the loading bar and consume bandwidth. However, `game/animations/backgroundAmbient.ts` receives only `{ base }` (bgBg) — the effect and mist textures are never passed. The assets are dead weight.

**Fix:** Either wire them back into `BackgroundAmbient` (if the background layers are intended to return) or change `preload: true` → `preload: false` / remove the declarations entirely to stop them from delaying first paint.

---

### BUG-07 — `startFoxfireSwirl()` is defined but never called
**File:** `game/animations/winCelebration.ts`

The method `startFoxfireSwirl()` exists in `WinCelebration` and is documented in the file header as part of the celebration choreography, but it is not called anywhere in `play()`. The foxfire swirl particle effect is absent from every big-win celebration.

**Fix:** Either call `startFoxfireSwirl()` in the appropriate phase of `play()` (after the title appears, or concurrent with the count-up), or delete the method if it was intentionally deferred.

---

### BUG-08 — `buildVignette()` allocates a new GPU texture on every big-win play
**File:** `game/animations/winCelebration.ts` (`buildVignette()`)

Every call to `WinCelebration.play()` creates a new `<canvas>` element, draws a radial gradient on it, and calls `Texture.from(cnv)` — uploading a fresh GPU texture each time. This is released in `teardownScene()` if the texture is tracked, but if teardown fails or is called in a non-try/finally pattern, the texture leaks. Even without leaks, this allocates and uploads ~1 MB to the GPU per big win.

**Fix:** Compute the vignette texture once in the constructor (or lazily on first `play()`), cache it, and reuse it. Destroy only in the module's `destroy()`.

---

### BUG-09 — PayTable grid shows 5 rows but board has 4 visible rows
**File:** `components/paytable/PayTableContent.svelte`, line 51 and line 96

```ts
const rows = 5;   // hardcoded
```

The actual board is 5 reels × 4 visible rows (`BOARD_DIMENSIONS = { x: 5, y: 4 }`). The payline diagram SVG iterates `Array(rows)` (5 rows, indices 0–4), but payline entries are row-indexed 0–3. Row index 4 will always be unlit (`line[c] === r` never true for r=4). The payline diagram shows a phantom fifth row of grey cells below every line.

**Fix:** Change `const rows = 5` to `const rows = 4` (or derive it from config).

---

### BUG-10 — ModalBuyBonusAyakashi: incorrect feature description ("Global Multiplier")
**File:** `components/ModalBuyBonusAyakashi.svelte`, line 99

```
Enter Free Spins instantly with the Global Multiplier already active.
```

There is no Global Multiplier mechanic in Ayakashi. The M (Ofuda) symbol multiplies the number of free spins awarded at trigger time — it does not create a persistent multiplier that runs during the feature. This copy is factually wrong and may constitute misleading advertising under gambling regulations.

**Fix:** Replace with accurate description, e.g.: "Skip the wait. Enter Free Spins directly with bonus reels active. Ofuda Talismans may multiply your spin count at trigger."

---

### BUG-11 — Bet adjust buttons in ModalBuyBonusAyakashi have no min/max guards
**File:** `components/ModalBuyBonusAyakashi.svelte`, lines 120-130

```ts
onclick={() => stateBetDerived.updateBetAmount((v) => v / 2)}
onclick={() => stateBetDerived.updateBetAmount((v) => v * 2)}
```

No clamps are applied. Halving can drive the bet below the minimum table bet; doubling can exceed the maximum. The SDK's `updateBetAmount` likely has its own guards, but the absence of explicit limits here is fragile — if the SDK function changes its clamping behaviour the modal's buttons become dangerous.

**Fix:** Check `stateBetDerived` for min/max helpers and apply them, or at minimum verify that `updateBetAmount`'s internal clamping covers the full edge-case range.

---

### BUG-12 — `cameraGrammar.release()` is never called by WinCelebration
**File:** `game/animations/cameraGrammar.ts`  
**File:** `game/animations/winCelebration.ts`

`zoomIn()` starts a 9-second breathing zoom on the stage and registers a self-releasing timeout. However, if WinCelebration ends early (player tap-skip) or throws, the 9-second timeout still runs and will zoom-release after the board has already returned to normal, potentially repositioning it mid-spin. `release()` is not called in the WinCelebration `finally`-equivalent.

**Fix:** Call `fxManager.camera().release()` (or the appropriate method) in the teardown path of `WinCelebration.play()`, before awaiting the `teardownScene()`. Alternatively, make `release()` idempotent and call it unconditionally on any `pointerdown` dismiss.

---

## 3. Missing Features (Should Have for Submission)

### MISSING-01 — No Ayakashi audio whatsoever
**File:** `game/sound.ts`, `game/assets.ts`

All sounds are the reference mining-game set (`sfx_multiplier_landing`, `sfx_royals_landing`, `bgm_main`, `bgm_freespin`, etc.). Sound keys in `sound.ts` include `sfx_multiplier_*` and similar names that have no relevance to Ayakashi. The game will ship with another game's audio, which is a submission blocker for any operator.

**Required:** Commission or source: temple bell scatters, foxfire wild land, kokiriko reel stops (5 variants exist in the code as `sfx_reel_stop_1..5`), cascading koto tumble wins, BGM for basegame and freegame, big win flourishes (BIG/SUPER/MEGA/EPIC/MAX), FS intro jingle, scatter trigger sting, bonus buy confirmation tone.

---

### MISSING-02 — No Ayakashi bitmap fonts
**File:** `game/assets.ts`, lines 78-93

Bitmap fonts `goldFont`, `silverFont`, `purpleFont`, `goldBlur` are all the mining-game `mm_*.xml` / `miningfont_*.xml` files. These render numerics in a generic coin-mine style with no yokai aesthetic. The win count-up, big-win amounts, and small-win overlays all use these fonts.

**Required:** Commission sumi-e or lacquer-style bitmap fonts for win display. At minimum replace the gold set; the silver/purple variants are used for less prominent UI elements.

---

### MISSING-03 — Avatar idle animation is disabled
**File:** `game/assets.ts` (comment on lines 44-46)

`avatarIdleSheet` was removed pending a new Wan I2V pass on the updated avatar art. The avatar displays a static webp. On desktop/landscape it is always visible and the lack of motion is immediately noticeable compared to a production slot.

**Required:** Run the Wan I2V pipeline on the current avatar art (see `HANDOFF.md §7 option B`) and restore the idle sheet registration.

---

### MISSING-04 — Portrait layout hides FreeSpinCounter and Avatar entirely
**File:** `components/Game.svelte`

```svelte
{#if ['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType())}
    <FreeSpinCounter ... />
    <!-- Avatar -->
{/if}
```

Portrait players (mobile, ~800×1422 canvas) never see the free spin counter during the feature, and the avatar is never rendered. The FS counter is important information — without it, portrait players have no UI indication of their remaining spins. The avatar is a core branding element.

**Required:** Design a portrait-compatible FS counter position (above or below the reels). Consider a simplified avatar position for portrait (banner treatment rather than full height).

---

### MISSING-05 — Ninja Kage demo font requires a commercial licence
**File:** `game/fxManager.ts`, line 62

```ts
const DISPLAY_FONT = 'Ninja Kage'; // dramatic brush — letter titles ONLY
```

Ninja Kage is distributed as a demo/free-for-personal-use typeface. Using it in a commercial gambling product without a paid licence is an IP violation. The comment in `fxManager.ts` itself notes: "confirm a commercial licence before submit, or switch DISPLAY_FONT to TEXT_FONT."

**Required:** Either purchase a commercial licence for Ninja Kage or replace DISPLAY_FONT with a licensed alternative (Yuji Syuku already covers the full character set including kanji).

---

### MISSING-06 — Win sounds for all small/medium win levels are missing
**File:** `game/winLevelMap.ts`, lines 5-46

Win levels 1–5 (`zero`, `standard`, `small`, `nice`, `substantial`) all have `sound: { sfx: undefined, bgm: undefined }`. There is no audio feedback for the vast majority of winning spins. Only big wins (levels 6+) have audio. In a tumble game with frequent small cascades, silent wins create a flat, broken-feeling experience.

**Required:** Add SFX keys for at least levels 3–5 (small/nice/substantial). The tumble win koto (`tumble_win_1..5`) partially covers cascades, but the setWin handler for non-tumble wins is completely silent.

---

### MISSING-07 — `FreeSpinCounter` text says "FREE SPIN" (singular)
**File:** `components/FreeSpinCounter.svelte`, line 81

```ts
text={'FREE SPIN'}
```

All competing slot games display "FREE SPINS" (plural). This is a cosmetic issue but operators will flag it in QA.

**Fix:** Change to `'FREE SPINS'`.

---

### MISSING-08 — Game version is hardcoded
**File:** `components/Game.svelte`

```svelte
<GameVersion version="1.0.0" />
```

The version string is hardcoded. Operators need the version to track build identifiers against audit logs. It should be pulled from the app's `package.json` or injected at build time via a Vite define.

**Fix:** Add `define: { __APP_VERSION__: JSON.stringify(pkg.version) }` to `vite.config.ts` and use `__APP_VERSION__` instead.

---

## 4. Code Quality Issues (Nice to Fix)

### QUALITY-01 — Debug `console.info` left in production path
**File:** `game/bookEventHandlerMap.ts`, line 164

```ts
if (exploderPositions.length > 0) console.info('[fx] kanabo smash x', exploderPositions.length);
```

This is inside the `tumbleBoard` handler, which fires on every win with an X on the board. It will spam the operator's browser console on every cascade.

**Fix:** Remove before submission. If you need telemetry, use a debug-flag-gated logger, not unconditional `console.info`.

---

### QUALITY-02 — `H5` symbol is in `HIGH_SYMBOLS` and `SYMBOL_INFO_MAP` but not on reels
**File:** `game/constants.ts`, line 72

```ts
export const HIGH_SYMBOLS = ['H1', 'H2', 'H3', 'H4', 'H5'];
```

H5 is not in the config's reel strips. It is mapped in `SYMBOL_INFO_MAP` with `makeSymbolInfo('h5.webp')` (line 151), but `h5.webp` presumably exists only as art — it never appears in the game. This is dead code / phantom asset. If H5 is truly cut, remove it from both arrays to avoid confusion.

---

### QUALITY-03 — `Symbol.svelte` multiplier badge uses hardcoded pixel values
**File:** `components/Symbol.svelte`

```ts
x={52}  y={56}  fontSize: 44
```

These values are fixed regardless of `SYMBOL_SIZE`. If `SYMBOL_SIZE` (currently 115) ever changes, the badge will be mispositioned. All other layout calculations derive from `SYMBOL_SIZE`.

**Fix:** Express as multiples: `x={SYMBOL_SIZE * 0.45}`, `y={SYMBOL_SIZE * 0.49}`, `fontSize: SYMBOL_SIZE * 0.38`.

---

### QUALITY-04 — `(config as any)` type casts in PayTableContent
**File:** `components/paytable/PayTableContent.svelte`, lines 19, 47-49

Three `(config as any)` casts defeat TypeScript's type safety. The auto-generated `config.ts` has a well-typed structure — the paytable component should import and use those types rather than casting to any.

**Fix:** Import the relevant types from `config.ts` or a shared types file and use them properly.

---

### QUALITY-05 — `backgroundAmbient.update()` recomputes cover scale every frame
**File:** `game/animations/backgroundAmbient.ts` (`update()`)

```ts
this.base.scale.set(cover(this.base, BG_COVER_EXTRA));
```

`cover()` runs on every ticker frame. The background scale only needs updating when the window is resized. Calling it 60× per second for a static background wastes CPU cycles on every frame.

**Fix:** Compute the cover scale once on load and on any resize event, then apply it only when the canvas dimensions change.

---

### QUALITY-06 — `winCelebration.ts`: `window.addEventListener('pointerdown', onPointer)` not in try/finally
**File:** `game/animations/winCelebration.ts`

The play loop attaches a window `pointerdown` listener to dismiss the celebration. If an exception is thrown between listener attachment and the `removeEventListener` call, the handler leaks and will fire on the next dismiss action (potentially triggering a second skip on an unrelated interaction). The pattern uses a finally-like approach but it's not a true `try/finally`.

**Fix:** Wrap the play body in a proper `try { ... } finally { window.removeEventListener(...) }` block.

---

### QUALITY-07 — FreeSpinCounter position uses unexplained magic number offsets
**File:** `components/FreeSpinCounter.svelte`, lines 35-41

```ts
x: ... + 8 - context.stateGameDerived.boardLayout().width * 0.08,
y: ... + 16 + context.stateGameDerived.boardLayout().height * 0.15,
```

The `0.08` and `0.15` multipliers and the `+8`/`+16` pixel nudges are undocumented magic numbers. A comment explaining what these offsets are compensating for (and why `FRAME_OUTER_HALF` alone isn't sufficient) would save future debugging time.

---

### QUALITY-08 — `bgEffect`/`bgMist` declared in `assets.ts` with `preload: true` but unused
(Duplicate of BUG-06, listed here for code quality tracking)  
The assets occupy space in the preload budget and are a maintenance hazard — anyone reading the code will assume they are used somewhere.

---

### QUALITY-09 — Module-level mutable `let` state for all lazy singletons in fxManager
**File:** `game/fxManager.ts` (top of file)

All lazy instances (`_winCelebration`, `_kanabo`, `_freeSpins`, etc.) are module-level `let` variables. Module-level state survives hot-module replacement in development, which means HMR can leave stale instance references. In production this is not a problem, but in dev sessions the game can get into broken states requiring a full page reload.

**Fix:** Not critical for submission, but consider a `resetAll()` export that clears all instances for HMR scenarios.

---

### QUALITY-10 — `winLevelMap` `animation` fields reference Spine animation names (dead fields)
**File:** `game/winLevelMap.ts`

```ts
animation: { intro: 'big_win_intro', idle: 'big_win_idle', outro: 'big_win_exit' },
```

These Spine animation name strings are never read by any procedural code. The `WinCelebration` module does not consult them. They're dead data that creates confusion about whether Spine is still in use.

**Fix:** Remove the `animation` field from the `winLevelMap` type and all entries, since the game is fully procedural.

---

## 5. UX / Flow Issues

### UX-01 — No portrait FS counter: player has no spin count visibility on mobile
(See MISSING-04 above — elevating because it's a direct player harm, not just missing polish)

A player running free spins on a portrait phone has no way to know how many spins remain. This will cause player confusion and support tickets.

---

### UX-02 — Win celebration camera zoom relies on 9-second timeout instead of player action
**File:** `game/animations/cameraGrammar.ts`

The `zoomIn()` method auto-releases after 9000ms. If a player taps to skip the celebration before 9 seconds, the stage remains zoomed in during the next spin, then snaps back during normal gameplay. The zoom should always release synchronously when the celebration ends.

---

### UX-03 — FreeSpins outro `autoDismiss` is 30 seconds
**File:** `game/animations/freeSpinsScreen.ts`

`autoDismiss = 30000ms`. If a player does nothing for 30 seconds, the game auto-continues. This is unusually long; most operators require auto-dismiss between 10–15 seconds. Check operator requirements before submission.

---

### UX-04 — Buy Bonus modal bet change has no visual min/max indication
**File:** `components/ModalBuyBonusAyakashi.svelte`

The `−` and `+` bet-adjust buttons in the footer don't show disabled states at min/max bet. A player halving from minimum bet or doubling at maximum gets no feedback. The buttons don't visually indicate boundaries.

**Fix:** Derive `atMin`/`atMax` from the bet state and apply `disabled` + visual dimming.

---

### UX-05 — Win small text `fontSize` is `SYMBOL_SIZE` (115px) — likely too large
**File:** `components/Win.svelte`

The small/medium win count-up uses `fontSize: SYMBOL_SIZE` (115px as a PIXI BitmapText size). This may be intentional for dramatic effect but should be reviewed against the actual rendering — at 115px the number may overflow the allotted space on smaller canvases.

---

### UX-06 — Logo dimensions are hardcoded instead of asset-driven
**File:** `components/Game.svelte`

```svelte
<Logo width={220} height={220 * (270 / 690)} />
```

The `270/690` ratio is the source image's aspect ratio hardcoded inline. If the logo asset is ever updated at a different resolution the layout breaks silently. The Sprite component should derive its height from the loaded texture's natural aspect ratio.

---

### UX-07 — "FREE SPIN" (singular) in the FS counter
(See MISSING-07 — repeating as a UX issue because it reads as a bug to players)

---

### UX-08 — No visual feedback on autospin settings changes
The turbo/autospin controls in the betting bar change state immediately but no haptic or visual confirmation (beyond the icon swap) is given to the player. Minor — most slots work this way — but an optional toast or pulse animation on the icon on change would improve perceived responsiveness.

---

## 6. Performance Concerns

### PERF-01 — Background cover scale recomputed every frame
**File:** `game/animations/backgroundAmbient.ts`  
(See QUALITY-05)  
The `cover()` call runs at 60fps. Since the background scale changes only on resize, this is 59 wasted trigonometric computations per second during gameplay.

**Impact:** Low CPU cost per call but unnecessary; fix before any mobile performance profiling.

---

### PERF-02 — GPU texture allocated per big-win via `buildVignette()`
**File:** `game/animations/winCelebration.ts`  
(See BUG-08)  
Each big-win play uploads a new ~1MB GPU texture. On WebGPU this also triggers a new bind group creation. On mobile GPUs this can cause a frame hitch at the start of the celebration.

**Impact:** Noticeable jank on mid-range mobile at the moment the vignette uploads. Cache the texture.

---

### PERF-03 — Per-line ticker added to `app.ticker` per win line, never batched
**File:** `game/animations/paylineHighlight.ts`

Each active payline win creates its own `app.ticker.add()` callback for the comet animation. With 50 paylines theoretically all winning simultaneously, up to 50 ticker callbacks are active at once. This is unlikely in practice (most wins are 5–15 lines) but the pattern is unbounded.

**Impact:** Minor in practice. A single shared ticker updating all active comets in one callback would be cleaner and scale-proof.

---

### PERF-04 — `ParticlePool.obtain()` is O(n) linear scan
**File:** `game/animations/fx.ts`, `obtain()` method (~line 523)

```ts
for (const p of this.pool) if (!p.active) return p;
```

Every `emit()` call scans from the start of the pool to find a free slot. With a pool of 250 particles and high emit counts (kanabo smash emits 46 particles at once), this is O(pool_size) per particle emitted. For the current pool sizes this is not a bottleneck, but it's a known pool-pattern anti-pattern.

**Impact:** Negligible at current sizes. Low priority unless pool sizes grow.

---

### PERF-05 — `refreshParticleTextures()` called on every board FX or overlay access
**File:** `game/fxManager.ts`, `needBoardFx()` and `needOverlay()`

`refreshParticleTextures()` iterates all 5 particle names + 8 petal sheet keys on every call to any board-FX or overlay module getter. These getters are called multiple times per book event (e.g. `winInfo` calls `paylineHighlight()`, `spotlightShow()`, `winBurstAt()` — each calls `needBoardFx()`). Texture lookups are cheap but the petal sheet-slicing check (which hits the `_petalFrameCache` WeakMap) runs every time.

**Impact:** Low — the cache hit path is fast. But a one-time refresh on asset load completion would be cleaner.

---

### PERF-06 — Texture GC disabled globally as a WebGPU bug workaround
**File:** `game/fxManager.ts`, lines 97-107

`textureGC.active = false` prevents PixiJS from ever evicting idle textures from GPU memory. The game has: 8 petal sheets + procedural glow cache (per unique radius/color pair) + all atlas frames resident permanently. On low-VRAM mobile devices (512MB shared GPU) this could cause out-of-memory crashes after extended sessions.

**Impact:** Medium risk on mobile. Track the upstream PixiJS v8.8 bug — if fixed before submission, remove the workaround and re-enable GC with a sensible timeout (e.g. 60 seconds).

---

*End of review. Priority order for pre-submission: BUG-01 through BUG-12 (all blocking), then MISSING-01/02/03/05/07 (submission blockers), then UX-01/02/03, then performance items.*
