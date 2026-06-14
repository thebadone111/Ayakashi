# Ayakashi — Polish Roadmap (1★ → comfortable 2★)

Working file. Updated after every completed task so any session can resume cold.
Branch: `final-dev`. Each task = one commit. Max's direction (2026-06-12):
"cinematically perfect animations; generate assets when needed; avatar more alive."

## Status legend
`[ ]` todo · `[~]` in progress · `[x]` done (commit ref) · `[1★]` deferred — only
revisit if the submission scores 1 star

---

## ROUND 5 — Max review 2026-06-14 (audio + final polish, then SUBMIT)

DIRECTION (Max): the game is feature-complete. From here it's **polish only** of
what we already have. Everything not listed under "polish" below is **frozen as
`[1★]`** — a redesign we only spend time on if the live submission comes back at
1 star. Next big step after this round's polish is **SUBMIT PREP**.

### Polish — DONE this round (uncommitted working tree)
- [x] **Audio cohesion overhaul** — the mix was a flat "soundboard": every cue at
      volume 1, no spin bed, and all 5 reels firing the *same* `sfx_reel_stop_1`
      with forcePlay. Fixes:
        • **Reel-spin bed added** — synthesised seamless rolling-noise loop
          (`sfx_reel_spin`, FFT band-pass + 8.5 Hz tremolo, ~−13 dBFS) injected
          into `build-audio-bundle.py`; starts on spin, stops (finally{}) when all
          reels settle. The spin is no longer dead silent.
        • **Reel stops varied + ducked** — game now cycles `sfx_reel_stop_1..5`
          (one per reel = descending kokiriko run); bundle gain −7 dB so they're
          soft taps, not a drum solo.
        • **Removed the per-win blip** — `winInfo` no longer fires
          `sfx_winlevel_small` on every win (it stacked on the escalating tumble
          koto + final flourish — the main pile-up).
        • **Listener leak fixed** — `createPlayOnce` added a permanent `on('end')`
          per one-shot; now an id-scoped `once` that self-removes (this was the
          in-game twin of the MaxListeners warning).
- [x] **BGM −10%** — `bgm_main` / `bgm_freespin` config volume → 0.9.
- [x] **Pill buttons** — multi-word labels were cramped; default `labelScale`
      0.9→0.8 (text a bit smaller) and ButtonBuyBonus wraps to the disc width
      (was a fixed 200 px, wider than the 150 disc → "BUY BONUS" spilled). +/−
      glyphs unaffected (they override labelScale=1.7).
- [x] **WebGPU crash at FS end fixed** — PIXI v8.8 `TextureGCSystem` unloaded an
      idle texture whose source a live `BindGroup` still referenced →
      `_updateKey` read `_resourceId` on null, throwing every frame. Disabled the
      texture GC (game-scoped, in `fxManager.app()`); our generated/loaded
      textures are a bounded, resident set, so nothing to reclaim.

### Decisions confirmed (Max, this round)
- **NinjaKage** — RESOLVED (Max 2026-06-14): open-license, free for commercial
  use. Keep `DISPLAY_FONT`. (Demo font *files* were also pulled out of the shipped
  bundle during submit-prep; runtime uses a subset woff2.)
- **FS counter placement** — good now; closed.
- **Volume balance** — RESOLVED (Max): the R5 cohesion/mix pass is signed off.

### SUBMIT PREP (R5 cont., 2026-06-14)
- [x] `submit/` package built — math (index.json + lookup CSVs + jsonl.zst),
      frontend bundle (21 MB), CHECKLIST.md, README.md, GAME-BLURB.md, verify script.
- [x] Cross-checked vs Stake approval guidelines: stateless ✓, no
      jackpot/gamble/continuation ✓, math format ✓, no hardcoded rgs_url ✓,
      resume/auth/currency handled by SDK ✓. Limits 15 GB math / 15 GB FE.
- [x] Math RTP 0.9700 + 2000× re-verified from lookup tables; CSV↔jsonl hashes match.
- [~] Re-running math at 1,000,000 sims/mode (was 100k) for tail/variety fidelity.
- [x] Front-end font bloat fixed — 24 MB of unused/personal-use demo fonts pulled
      out of `static/` → `art/fonts/`; bake-logo.py repointed. Bundle 46→21 MB.
- [ ] **🚩 BLOCKER — Pay Table & Game Rules modals are SDK placeholders**
      ("ADD YOUR PAY TABLE" / "ADD YOUR GAME RULES" in components-ui-html). Menu is
      wired and other modals work; these two need real content (symbol payouts from
      config.ts + paylines + mechanics rules). Required for approval.
- [ ] Placeholder identifiers: `providerName`/`gameName` in config.ts +
      `GameVersion 0.0.0` → set real values before submit.

### Frozen `[1★]` (do NOT touch unless the submission scores 1 star)
- [1★] Q2 loading-screen redesign (was line ~270)
- [1★] P4 brush-stroke reveals (FS wipe / win slash / textured paylines)
- [1★] 3-act big-win finale — blackout + heartbeat act (needs a heartbeat cue)
- [1★] Avatar "more alive" — JP voice-line speech bubbles; img2img pose variants

---

## ROUND 4 — Max review 2026-06-14 (UI polish + model decision)

MODEL DECISION (Max): stay on full FLUX dev for Ayakashi (cloud was never GGUF —
that's local only); trial Illustrious/NoobAI XL (anime) or Ideogram 3/Recraft
(UI/text) on the NEXT game. See memory [[image-model-upgrade]].

DONE this round (uncommitted working tree — pending Max sign-off in Storybook):
- [x] **Build break fixed** — a mid-edit `freeSpinsScreen.ts` EOF had broken the
      FX pipeline (fxManager imports it) → only the background rendered. Resolved;
      full game mounts again.
- [x] **Betting-UI alignment** — `LayoutDesktop` rebuilt into clean columns:
      Balance | Win | Bet readouts evenly spaced (no overlap), controls aligned
      directly beneath each (Menu+BuyBonus ‹Balance›, Auto·SPIN·Turbo ‹Win›,
      −/+ ‹Bet›); SPIN slightly enlarged as the hero.
- [x] **Brush typography everywhere** — all PIXI UI text (buttons, labels,
      amounts) switched proxima-nova → `Yuji Syuku`; added a Storybook
      preview-head so the font actually renders (it was silently falling back).
      Full Yuji Mai / Yuji Syuku / Shippori Mincho TTFs downloaded.
- [x] **Logo + title typography — kanji/brush (Max wanted MORE calligraphic).**
      Downloaded NinjaKage (dramatic sword-brush display, per Max's 1001fonts
      examples) + subset to woff2. SVG-text can't use web fonts in PIXI, so the
      logo is now BAKED to a webp via bake-logo.py (NinjaKage "AYAKASHI" gold +
      crimson outline + drop shadow, 妖かし subtitle in full Yuji Syuku, brush
      tagline). Big display titles (FS intro, win celebration) FONT_FAMILY →
      `Ninja Kage`; small UI labels stay on legible `Yuji Syuku`. NOTE: NinjaKage
      is a DEMO font — confirm commercial license before submit.
- [x] **Torii mist edges blended** — earlier feather wasn't enough; added an
      image pass that gaussian-softens the blue MIST regions (keeping the red
      gate crisp) + a wide feathered alpha ramp. Mist now fades wispily instead
      of hard-cutting.
- [x] **Win screen — dropped the orange/purple blob (Max).** Removed the big
      additive glow `bloom` behind the avatar + the continuous foxfire-swirl
      halo. Now: background dims (vignette) + sumi-e BRUSH banner + tier title +
      hero amount + a single impact (flash/shake/shockwave + spark burst). The
      avatar stays clearly visible. "Just the brush stroke and the dim."
- [x] **Multipliers no longer escape the reel frame** — the Ofuda multiplier
      reveal floated 0.85·cell ABOVE the cell, so a top-row multiplier poked over
      the frame; clamped the reveal (and its release drift) to stay below the
      board top.
- [x] **Avatar shadows / 3D** — soft ground contact shadow + DropShadowFilter so
      she lifts off the background.
- [x] **New torii gate (FS intro)** — replaced the flat v1 render with a
      painterly v2 gate (vermilion + blue foxfire mist + gold), and SOFTENED the
      alpha edges (wide luminance ramp + feather) so the mist blends instead of
      hard-cutting. Foxfire pillar flames shrunk (h 200→120) as braziers at the
      post bases.

CAVEAT to watch: the animating board layer (BoardContext animate=true) has no
mask, so a symbol's persistent "2X" BitmapText could still spill mid-animation
(distinct from the Ofuda reveal, which is now clamped). Revisit if Max still
sees stray multipliers during spins.

### ROUND 4b — missing NUMBERS root cause FOUND + fixed (2026-06-14, this session)

ROOT CAUSE (definitively proven via canvas glyph-coverage tests in the live
game): **'Ninja Kage' is a DEMO font whose digit / $ / . / , glyphs are EMPTY
(zero outlines).** Letters render; NUMBERS render INVISIBLE. The face even loads
with correct advance WIDTHS (so layout looked normal) but paints 0 pixels for
"$2,412.50". This — NOT a freeze — is why Max saw "win screen has no amount" and
"FS text weird/cut off". (Bonus discovery: the prior session's "celebration is
frozen" was a PHANTOM — the headless preview tab is hidden, so the browser
throttles rAF→0 and the whole Pixi ticker pauses. The avatar DropShadowFilter it
removed chasing that phantom was likely innocent; ground shadow + try/catch tick
hardening were kept.)

Also found: 'Ninja Kage' was never even LOADING (used only in Pixi canvas text,
which doesn't trigger CSS @font-face loading) — fixed too, though moot for digits
since they're empty.

FIXES (uncommitted working tree):
- [x] **Two font roles in fxManager** — `DISPLAY_FONT='Ninja Kage'` (dramatic
      brush, LETTER titles ONLY) + `TEXT_FONT='Yuji Syuku'` (full glyph set, for
      anything with numbers). winCelebration + freeSpinsScreen gained a
      `numberFontFamily` option (title stays NinjaKage, amount/count → Yuji).
      ofuda / wildLanding (x-mult badges) + paylineHighlight (amount tags) →
      Yuji. So every NUMBER now renders.
- [x] **'gold' mining BITMAP font purged from visible numbers** — FreeSpinCounter
      ("FREE SPIN" + "X OF Y") and Win.svelte small/med count-up amount were on
      the placeholder mining `'gold'` bitmap font (the same one that broke the
      reel multiplier). Switched to real `Text` in Yuji Syuku (gold fill +
      ink stroke). Removes the fragile mining-font dependency for all on-screen
      numbers; matches Max's brush direction.
- [x] **Font-load hardening** — Game.svelte onMount force-loads both brush faces
      (`document.fonts.load`) before any canvas text; @font-face `block`→`swap`
      in app.html + preview-head so a number is NEVER invisible even if a face is
      slow/missing (shows a fallback instead).

LICENCE FLAG for Max: 'Ninja Kage' is a DEMO font (empty digits + likely no
commercial licence). It's now used for LETTER titles only. Before submit either
buy the full licence or set DISPLAY_FONT = TEXT_FONT (drop NinjaKage entirely;
Yuji Syuku is OFL and renders the dramatic brush titles fine too).

NOT verifiable headlessly: live animated playback (hidden preview tab freezes the
ticker). Glyph rendering + font loading + clean build were verified; the moving
celebration/FS screens need Max's eyes (or a visible browser).

### ROUND 4c — Max layout/feel pass (2026-06-14)

- [x] **Animations outside the frame** — the `animate={true}` BoardContext layer
      (spinning/landing/win symbols) was UNMASKED, so symbols spilled above/below
      the reel frame. Added `<BoardMask />` to it (matching the static layer) so
      all symbol motion is clipped to the window. (Board + FX both derive from
      BOARD_ANCHOR, so origins already align; if Max still sees a specific FX
      off, grab a screenshot to pin it down.)
- [x] **Avatar less jumpy** — added `motionScale = 0.92` in AvatarActor.update,
      applied to every amplitude (breath, squash, sway, hop, idle bob, weight
      shift, mesh-flow waves, follow-through, head-lean) → uniform ~8% calmer.
- [x] **Nudge positions** — reel frame 5% LEFT (BOARD_ANCHOR.x 0.43→0.38),
      avatar 5% RIGHT (x 0.76→0.81).
- [x] **Raise UI + frame** — betting bar up 5% of layout height (LayoutDesktop),
      reel frame up 5% (BOARD_ANCHOR.y 0.47→0.42). NEEDS Max's eye to confirm the
      frame top still sits below the painted bg-foreground edge (bg_fg is a
      full-screen composited layer, no code edge to clamp against).
- [x] **Avatar shadow vanishes during win** — the celebration vignette cropped
      her feet, so the dark ground shadow fell into the dimmed ring and
      disappeared. Enlarged the clear zone (inner 0.62→0.72) and dropped its
      centre toward the feet so the lit ground under her (and the shadow) stays
      bright through the win.

VERIFY: static layout (positions, frame-vs-foreground) is checkable via one-shot
extract even with the frozen ticker; avatar calmness + win-shadow are motion and
need Max's eyes (or a visible browser).

### ROUND 4d — Max layout/UI tweaks (2026-06-14)

- [x] **Avatar up + left a touch** — x 0.81→0.79, y 0.86→0.84.
- [x] **Reel frame down 2%** — BOARD_ANCHOR.y 0.42→0.44 (also relieves the
      tight-top from 4c; frame keeps clear of the bg foreground edge).
- [x] **Button labels spilled the round medallions** — root cause: UiButton's
      `wordWrapWidth` was a fixed 200, WIDER than the 150 disc, so two-word labels
      (AUTO SPIN, BUY BONUS) stayed on one over-wide line and overflowed. Wrap now
      = `sizes.width * 0.8`, so they wrap to two centred lines INSIDE the circle at
      the same readable size (single words like MENU/TURBO still fit on one line).
      Added a `labelScale` prop to UiButton for per-button glyph sizing.
      (If Max prefers actual wider PILL buttons over wrapped labels, that's a
      follow-up — needs the bar's button spacing re-tuned + a visible-browser check.)
- [x] **Bigger + / −** — ButtonDecrease/Increase pass `labelScale={1.7}` (≈0.9→1.7
      of UI_BASE_FONT_SIZE) so the +/− glyphs read large on their discs.

---

## ROUND 3 — Max review 2026-06-13 (design direction + submit prep)

DESIGN PHILOSOPHY (applies to everything now): generate bespoke ASSETS on
RunComfy, then ENCHANT them with the animation libs (GSAP + shaders + particles
+ flipbooks). Not procedural-only, not static-asset-only.

- [x] **FREEZE on freespin/jackpot — FIXED (critical regression).** Root cause:
      the bell `bonusTrigger` left ring tweens running after `teardownScene()`
      destroyed their Graphics; their `onUpdate` then called `.clear()` on a
      destroyed object and THREW every frame. Because PixiJS ticker listeners
      share one linked list, that uncaught throw aborted the whole frame — every
      FX listener registered AFTER it (the scene `transitionWipe`) never ticked,
      so its tweens never resolved, so `broadcastAsync({transition})` never
      returned and book playback hung forever. Three-layer fix: (1) SYSTEMIC —
      `TweenRunner.update` now wraps each tween in try/catch, so a throwing
      `onUpdate` is isolated + killed instead of poisoning the ticker for
      everyone (no single FX bug can ever freeze the game again); (2) ROOT —
      `bonusTrigger` ring `onUpdate`s bail if `ring.destroyed`, and
      `teardownScene()` calls `tweens.killAll()` before destroying targets;
      (3) DEFENSIVE (kept from diagnosis) — `Board.boardWithAnimateSymbols` races
      the symbol `oncomplete` against a 1200ms timeout, and `SymbolSprite` gates
      its `oncomplete` on wall-clock timers not Svelte `Tween` promises. Verified:
      free-spin-trigger book now plays bell → mist transition → FS intro and the
      story action resolves, with zero ticker errors.
- [x] **A1b BELL animation — redo FROM SCRATCH.** Rebuilt as clean concentric
      SOUND-WAVE ripples: rings now REDRAW each frame (radius grows, line tapers
      thin + fades) instead of scaling a stroked Graphics (which thickened into a
      donut). No white glow blob — the old centre `core`/`makeGlowTexture` flares
      are gone, white-out softened to a brief warm flash. Also fixed a latent bug:
      the climax `toll` rings were never `addChild`-ed (invisible) — now added.
      Removed dead wisp system + unused imports. Screenshot-verified over the dark
      board: gold/white ripples radiate cleanly, no blob.
- [x] **WIN celebration — replace the spinning ray-fan "carousel".** Rebuilt
      FULLY AVATAR-LED: ray-fan carousel removed; the moment anchors to the live
      avatar (getScreenBounds plumbed via fxManager): a radial SPOTLIGHT vignette
      keeps her clear while the board dims, a foxfire bloom + spirit-flame swirl
      HALO around her (curls up her silhouette, clear of her face), and the win
      amount + tier title slam into a sumi-e BRUSH BANNER beside her (toward
      centre). Bespoke brush asset generated on RunComfy cloud FLUX, processed to
      alpha (brush_wide.webp), registered as 'brushWide', tinted per tier; clean
      procedural lacquer-plaque fallback remains. Screenshot-verified live (strip
      PostFx filters to bypass an extract+filter darkening artifact — see memory).
      RunComfy also produced a 3x3 foxfire flame SHEET (art/generated/fx/
      foxfire-sheet) ready for the FS-intro flipbook below.
- [x] **FS intro foxfire extras** — DONE. The gate-post "pillars" were generic
      stretched glow blobs; replaced with REAL bespoke foxfire flames (RunComfy
      blue-white flame, sliced from the foxfire sheet, alpha-cut → particleFoxfire,
      preloaded) that sway + breathe on a backing bloom glow. Added ambient
      foxfire wisps that lick upward near the posts during the idle hold, and the
      ignite burst now throws flame-shaped wisps instead of dots. Also fixed
      needOverlay() to refresh the particle registry (overlay FX no longer depend
      on a board-FX having run first to populate textures). Screenshot-verified:
      twin foxfire flames flank the FREE SPINS / count.
- [1★] **Avatar MORE ALIVE** — voice lines via Japanese speech bubbles
      (「やった！」 win, 「いくよ！」 spin), generated bubble asset shown on events.
      FROZEN (R5): only if the submission scores 1 star.

PROCESS: don't block-wait on RunComfy — kick off, periodically check, integrate.

LAST PRIORITY (do after all polish above — Max 2026-06-13):
- [ ] **SUBMIT PREP** — double-check MATH (RTP 0.97, wincap 2000x,
      payout correctness) + Stake WebSDK SUBMIT REQUIREMENTS (build, asset
      budget, config, provably-fair, required events/screens).

---

## ROUND 2 — Max review 2026-06-13 (NEW ISSUES, not yet started)

### DONE this round (RunComfy cloud FLUX)
- [x] **RunComfy API wired** — driver (runcomfy_generate.py), skill updated to
      prefer cloud; deployment created+terminated via API (no idle cost)
- [x] **Q3 symbols regenerated** — all 14 HQ on cloud FLUX, shared style spec,
      cut to alpha + uniform 90% size, atlas repacked. Cohesive matched set.
      Screenshot-verified on the board.
- [x] **Q1 reel frame regenerated** — ornate red/gold square-window frame,
      window cut + measured, FRAME_RATIOS updated. Live. (fit is a touch loose —
      ornate corners spread beyond the board border; could tighten later)
- [x] fs-frame (blue foxfire, square window) generated — NOT yet wired as the
      FS-mode board frame (optional; ties into B3)

### Bugs (functional) — STILL TODO
- [x] **B1 MAX-WIN keeps rolling free spins** (af1131c) — winCapped flag in the
      wincap handler no-ops subsequent spin visuals; round ends on max-win.
- [x] **B2 winning combos outside frame / padding** (af… B2 commit) — AUDITED:
      win data rows are all 1..5 (padded) = visible 0..4, NONE on padding;
      win-mapping code was already correct (toVisible used; winBurstAt converts
      internally); mask clips vertical padding (5 rows shown). Added a defensive
      isVisible() filter in winInfo so a padding-row position can NEVER present
      even if math emits one. Likely was a pre-frame-rework artifact.
- [x] **B3 FS blue border** — was the BoardFrame foxfire (blue) glow; recolored
      to a soft GOLD halo that hugs the frame (matches red/gold lacquer),
      lowered alpha + slower pulse so it reads as the frame lighting up.

### Betting UI (Max 2026-06-13)
- [x] **U1 betting UI redesign + custom assets** — DONE. Reskinned the core
      components-ui-pixi bar into the Ayakashi lacquer aesthetic with BESPOKE
      RunComfy art (full-precision FLUX, cloud), processed to alpha (rembg):
        • `spin_medallion.webp` (key `bet`) — ornate red/black urushi disc with a
          gold foxfire-filigree rim + spiral mon; the hero spin button.
        • `base_button.webp` (key `base_button`) — glossy gold-rimmed red/black
          ink-cloud plate; drives every standard button (menu, auto, turbo,
          +/−, buy-bonus) via the UiButton dark variant.
        • `base_ticker.webp` (key `base_ticker`) — dark lacquer plaque w/ gold
          hairline + corner ornaments behind balance/win/bet readouts.
      Wiring: UiSprite now renders the keyed Sprite when its texture is loaded
      and FALLS BACK to the procedural rounded plate otherwise (other apps in the
      monorepo keep working). Per-state colouring via sprite tint (white / warm
      hover / gold active / dimmed-lacquer disabled). Text shifted white→warm
      parchment (value gold) for the lacquer look. Buy-bonus repointed off its
      missing `buyBonus` key onto the shared plate with a gold tint.
      Screenshot-verified in components-game--pre-spin: medallion + plates +
      ticker plaques all render, zero asset-key errors. Generation script
      art/gen-ui-cloud.py + processor process-ui.py; RunComfy deployment disabled
      after use (scale-to-zero, no idle cost).
- [x] **U2 move reel frame + avatar toward center** (this session)

### Art quality (likely needs regen / new assets — see ANIMATION LIBRARY note)
- [x] **Q1 reel frame** — regenerated (HQ cloud square-window frame), live.
- [1★] **Q2 loading screen looks horrible** — redesign LoadingScene. FROZEN (R5).
- [x] **Q3 symbols** — all 14 regenerated HQ + normalized, cohesive set, live.
- [x] **Q4 coins** — WinCoins boosted: ~2x denser (frequency x0.45), 1.7x scale,
      2.5x maxParticles, longer life. Reads as a real gold shower now.

### Animations to REDO from the ground up (procedural Graphics = the problem)
- [x] **A1 bell/scatter** — bonus-trigger toll rebuilt: textured ember debris +
      drifting petals on each bell ignite (P3 assets), and the final toll fires a
      real screen-ripple/camera-dip (fxBus smash) for genuine impact. Was glow-dots.
- [x] **A2 symbol destroy** — rebuilt with GSAP: flash -> back-overshoot pop ->
      bursts apart (scale UP + fade + spin) into the ink/ember/paper cloud,
      instead of shrinking to a point. Reads as destruction now.
- [x] **A3 transition** — mist wipe sped up ~40% in+out (tighter stagger, faster
      veil) so it feels decisive instead of a slow drift.
- [x] **A4 FS intro touch-up** — gate rise snappier (1100->750ms) + drifting
      petals for atmosphere (cohesive with bell/celebration).

### Console noise (ANSWERED — not the game)
- ObjectMultiplex / content.js / app-init-liveness / MaxListenersExceeded /
  releaseNoteVersionReceived = a browser wallet EXTENSION (MetaMask-style),
  NOT Ayakashi. "deferred DOM Node" = harmless DevTools detached-node notice.
  No action.

### ANIMATION TOOLING — DECIDED 2026-06-13

What I can drive SOLO (no human/GUI needed):
- **GSAP** — ADOPTED + installed (3.15, motion.ts). Pure code, I own it 100%.
  Use for rebuilt/new choreography (bell, destroy, transition, win sequence).
  Caveat: GSAP's ticker ignores Pixi ticker.speed, so keep hit-stop-coupled
  motion on TweenRunner.
- **Sakuga spritesheets** — ComfyUI(FLUX)→PIL slice→PixiJS AnimatedSprite. I
  generate frames + slice + play end-to-end (proved w/ the coin sheet). This is
  my self-serve AUTHORED-animation path. USE FOR: bell ring, slash arc, foxfire
  burst, symbol destroy. CAVEAT: 8GB GPU is the bottleneck — 1024px jobs
  TIMED OUT this session (brush strokes failed at 1280px). Keep frame sheets
  modest (512-768px grids), generate when nothing else uses the GPU.
- **Theatre.js** — available if a complex sequence needs a timeline; code-driven.

What needs a HUMAN in a GUI editor (I can only wire the runtime):
- **Effekseer** — ADOPTED for combat/win FX (bell, kanabo, foxfire). Max/artist
  authors .efkefc in the free editor; I integrate the WebGL/WASM runtime + fire
  effects. Best FX ceiling. → roadmap: wire runtime, Max authors effects.
- **Live2D / Spine / Rive** — character rigging needs their editors. Parked
  unless Max wants to author an avatar rig (Live2D = best anime-avatar fit).

After Effects connector: only useful if it exposes ExtendScript automation, and
even then AE→sakuga is not a reliable autonomous path. NOT the leverage point —
the ComfyUI→spritesheet pipeline is more controllable by me. Skip for now;
revisit only for Lottie UI motion-graphics later.

PLAN: rebuild A1-A4 using GSAP (timing/choreography) + sakuga spritesheets
(the actual FX frames). Effekseer layered in once Max authors effects.

### (superseded) earlier note: animation library
Procedural PixiJS (Graphics/particles) has a low ceiling — it IS why bell /
destroy / transition read "programmer-art." Reaching Demon-Slayer/JJK bar
needs AUTHORED animation. Researched options (report delivered to Max
2026-06-13): Live2D (avatar), Effekseer (combat FX), Rive (free all-rounder),
Spine (industry slot standard, paid), GSAP (motion engine, now free),
sakuga spritesheets (highest ceiling). Awaiting Max's pick before rebuilding
A1-A4 — the tool choice changes how they're built.

---

## 0. Board alignment & readability  `[x]`
Max's screenshot: frame bg, reel frame (and FS frame) and symbols don't line
up, spill over, hard to see.
- [x] Measured window: 79.64% x 83.29% of art (old guess 86%/82% made the
      window ~7% narrower than the board = border covered outer columns).
      FRAME_RATIOS now 1.02/measured (2% breathing room)
- [x] Panel contrast compressed to 38% + darkened 18% — symbols pop, streaks
      are whispers (flatten-panel.py)
- [x] Screenshot-verified: all 5 columns inside the window, no spill, no red
      edge lines
- [x] FS counter panel placement — good now; closed (R5, Max)

## P1. Post-FX stack  `[x]` (28f83e7)
- [x] pixi-filters 6.1.0 added
- [x] AdvancedBloom threshold 0.55 on board-FX + overlay layers
- [x] Impact kick: 140ms RGBSplit + ZoomBlur via fxBus 'smash'/'bigwin'
- [x] Godray sweep on bigwin + fsintro
- [x] Shock ripple from kanabo impact point (smash now carries global coords)
- [x] Verified live: kick+ripple visibly warp the frame; books play clean

## P2. Time & camera grammar  `[x]` (5ad25bf)
- [x] hitStop() in fx.ts — 85ms ticker freeze on kanabo contact frame
- [x] CameraGrammar: 4px tumble dip / 7px smash dip; 1.035 celebration zoom
      with breathing, pivot-trick on stage, auto-release
- [1★] 3-act bigwin: inhale beat done earlier; full blackout+heartbeat act
      FROZEN (R5, needs heartbeat audio cue) — title slash-reveal would come w/ P4
- [x] Verified: wincap book (36 free spins, $2000) plays through correctly

## Sound audit  `[x]` (5ad25bf)
- [x] All 52 keys diffed — one real gap found: tumble wins were silent.
      updateTumbleWin now plays escalating koto (tumble_win_1..5)
- [x] In-browser: Howler loaded ogg bundle, 52 sprites, ctx running, deferred
      load works, FS music switches
- [x] Volume balance pass — R5 cohesion/mix overhaul (spin bed, ducked reel
      stops, removed per-win blip, BGM −10%). Final loudness taste = Max's ears.

## P3. Textured particles  `[x]` (25b74fa — header was stale; tidied R5)
- [~] Generating: 11 jobs (5 particles, 2 brush strokes, 2 flipbook sheets,
      2 avatar poses). ink-splatter done (4 candidates, black-on-white —
      process script auto-inverts polarity)
- [x] process-particles.py ready: luminance→alpha (auto-polarity), crop,
      downscale, white-body sprites for runtime tinting. PICKS need filling
      after visual review of candidates
- [x] Integration code SHIPPED (78a6819): particleLib registry + all emit-site
      swaps (tumble=ink+paper, dust=smoke, scatter=petals, kanabo=ember/ink/
      smoke, celebration=ember+gold petals). Falls back to glow dot until
      textures land — game safe either way
- [x] PICKS filled, processed, 5 assets.ts entries added, all serve 200,
      registry confirms ink/ember/petal loaded + render. Base-game composite
      screenshot-verified CLEAN: 5 columns inside the frame, no spill/red lines,
      symbols read, bloom on lanterns+foxfire. DONE (25b74fa)

## P4. Brush-stroke reveals  `[1★]`  FROZEN (R5 — only if submission scores 1★)
- [1★] Generate 4-6 wide brush strokes (white on black)
- [1★] TransitionWipe: brush-stroke mask wipe for FS enter/exit
- [1★] WinCelebration title: slash-reveal via stroke mask
- [1★] PaylineHighlight: line drawn as textured brush stroke + ink droplets

## P5. Flipbook FX sheets  `[x]` (resolved as textured-particle foxfire)
- FLUX "flipbook" grids came back as 9 DISTINCT flame doodles, not a smooth
  ignite→dissipate sequence — they won't flipbook cleanly (would jitter). So
  instead of forcing a bad flipbook, repurposed the bespoke flames the RIGHT way:
  sliced the clean 3x3 sheet into 9 alpha flame glyphs (process-foxfire.py),
  promoted one elegant upright flame to `particleFoxfire`, and ENCHANTED it with
  motion — real swaying flame sprites for the FS-intro gate pillars + drifting
  foxfire wisp particles (ParticlePool). Bespoke art + procedural motion, which
  is the design philosophy. The remaining flames are available for future use
  (wild-land foxfire burst, etc.).

## P6. Avatar alive  `[x]` motion / `[deferred]` poses
- [x] Motion pass DONE (ad279a9): weight shift foot-to-foot, head-lean arc on
      hair band, velocity-coupled hair follow-through with upward phase lag
- [x] Pose-swap MECHANISM shipped (c4e6456): texture cut hidden at twirl's
      edge-on frame; setPoses() wired in fxManager (no-op without textures)
- [DEFERRED] img2img pose variants generated (art/generated/avatar-{cheer,wink}/)
      but NOT wired: denoise 0.45-0.5 drifted the OUTFIT and barely changed the
      POSE (still standing, one hand up) — a swap would flicker the costume with
      no payoff. Needs denoise ~0.3 for identity OR ControlNet pose-transfer for
      genuinely different poses (arms-up cheer). Revisit WITH Max (he said
      "curate hard"). Candidates kept for his review.

---

## Done earlier on final-dev
- [x] Load time: WebP conversion (−18.6MB), dead Spine purge (−27MB), audio
      off preload (53a2f7e)
- [x] Frame bg crop + red-scratch mute, panel 1.14→1.05 (240cf43)
- [x] Avatar springs calmed + pirouette on bonus/bigwin (240cf43)
- [x] Yen coin 24-frame spin spritesheet from FLUX art (240cf43)
- [x] Kanji-brush bitmap fonts (Yuji Syuku) ×4 (5362c3e)
- [x] Japanese audio bundle: 52 sprites from 68 Pixabay CC0 files (6218e22)
- [x] Yuji Syuku woff2 subset replaces external Typekit (6218e22)
- [x] WinCelebration anticipation inhale (fff5618)
- [x] EnableSound deferred-load fix (a48d344)
- [x] Tumble onSymbolLand signature fix + TweenRunner null-safety (d944379)

## Known gaps / later
- freeSpinRetrigger has no dedicated celebration
- Reel-stop squash needs per-reel PIXI container plumbing (dormant code path)
- 237 svelte-check errors are pre-existing/environmental (unbuilt workspace pkgs)
- addon-svelte-csf@5.0.5 vs Storybook 9: some stories CSF-parse-error (cosmetic)
- BGM is Pixabay zen-koto/taiko loops — consider commissioned loops eventually
