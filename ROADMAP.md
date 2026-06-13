# Ayakashi — Polish Roadmap (1★ → comfortable 2★)

Working file. Updated after every completed task so any session can resume cold.
Branch: `final-dev`. Each task = one commit. Max's direction (2026-06-12):
"cinematically perfect animations; generate assets when needed; avatar more alive."

## Status legend
`[ ]` todo · `[~]` in progress · `[x]` done (commit ref)

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
- [~] **FS intro** — A4 done (snappier gate + petals). Wiring the generated
      foxfire flipbook as extras around the gate/title still TODO.
- [ ] **Avatar MORE ALIVE** — voice lines via Japanese speech bubbles
      (「やった！」 win, 「いくよ！」 spin), generated bubble asset shown on events.

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
- [ ] **Q2 loading screen looks horrible** — redesign LoadingScene.
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
- [ ] FS counter panel placement — revisit when FS mode is screenshot-verified

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
- [~] 3-act bigwin: inhale beat done earlier; full blackout+heartbeat act
      deferred (needs heartbeat audio cue) — title slash-reveal comes with P4
- [x] Verified: wincap book (36 free spins, $2000) plays through correctly

## Sound audit  `[x]` (5ad25bf)
- [x] All 52 keys diffed — one real gap found: tumble wins were silent.
      updateTumbleWin now plays escalating koto (tumble_win_1..5)
- [x] In-browser: Howler loaded ogg bundle, 52 sprites, ctx running, deferred
      load works, FS music switches
- [ ] Volume balance pass — needs human ears (Max: listen to a few spins)

## P3. Textured particles  `[~]`  (ComfyUI batch #1 RUNNING — gen-batch-1.py)
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

## P4. Brush-stroke reveals  `[ ]`  (same gen batch)
- [ ] Generate 4-6 wide brush strokes (white on black)
- [ ] TransitionWipe: brush-stroke mask wipe for FS enter/exit
- [ ] WinCelebration title: slash-reveal via stroke mask
- [ ] PaylineHighlight: line drawn as textured brush stroke + ink droplets

## P5. Flipbook FX sheets  `[ ]`  (same gen batch)
- [ ] Generate 6-8 frame sheets: foxfire flame burst, bell shock glyph, slash arc
- [ ] Slice/pack with PIL (like build-coin-sheet.py), play at 12fps
- [ ] Use: scatter land (bell glyph), wild land (foxfire burst), kanabo (slash arc)

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
