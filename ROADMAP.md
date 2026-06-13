# Ayakashi — Polish Roadmap (1★ → comfortable 2★)

Working file. Updated after every completed task so any session can resume cold.
Branch: `final-dev`. Each task = one commit. Max's direction (2026-06-12):
"cinematically perfect animations; generate assets when needed; avatar more alive."

## Status legend
`[ ]` todo · `[~]` in progress · `[x]` done (commit ref)

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
- [ ] **U1 betting UI redesign + custom assets** — current UI bar overlaps/covers
      the reel frame bottom. Needs a proper Ayakashi-themed control bar (spin,
      bet +/-, auto, turbo, menu, buy bonus, balance/win/bet panels) as custom
      generated assets, positioned so it never covers the frame.
- [x] **U2 move reel frame + avatar toward center** (this session)

### Art quality (likely needs regen / new assets — see ANIMATION LIBRARY note)
- [x] **Q1 reel frame** — regenerated (HQ cloud square-window frame), live.
- [ ] **Q2 loading screen looks horrible** — redesign LoadingScene.
- [x] **Q3 symbols** — all 14 regenerated HQ + normalized, cohesive set, live.
- [x] **Q4 coins** — WinCoins boosted: ~2x denser (frequency x0.45), 1.7x scale,
      2.5x maxParticles, longer life. Reads as a real gold shower now.

### Animations to REDO from the ground up (procedural Graphics = the problem)
- [ ] **A1 BELL / scatter animation — CATASTROPHIC, redo fully.**
- [x] **A2 symbol destroy** — rebuilt with GSAP: flash -> back-overshoot pop ->
      bursts apart (scale UP + fade + spin) into the ink/ember/paper cloud,
      instead of shrinking to a point. Reads as destruction now.
- [ ] **A3 transition still not good** — redo (mist wipe not landing).
- [ ] **A4 free-spins intro/outro touch-up** — maybe new assets.

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
