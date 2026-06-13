# Ayakashi — Polish Roadmap (1★ → comfortable 2★)

Working file. Updated after every completed task so any session can resume cold.
Branch: `final-dev`. Each task = one commit. Max's direction (2026-06-12):
"cinematically perfect animations; generate assets when needed; avatar more alive."

## Status legend
`[ ]` todo · `[~]` in progress · `[x]` done (commit ref)

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
- [ ] Fill PICKS, run processing, add 5 entries to assets.ts, verify visually

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
