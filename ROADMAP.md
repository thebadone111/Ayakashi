# Ayakashi — Polish Roadmap (1★ → comfortable 2★)

Working file. Updated after every completed task so any session can resume cold.
Branch: `final-dev`. Each task = one commit. Max's direction (2026-06-12):
"cinematically perfect animations; generate assets when needed; avatar more alive."

## Status legend
`[ ]` todo · `[~]` in progress · `[x]` done (commit ref)

---

## 0. Board alignment & readability  `[~]`
Max's screenshot: frame bg, reel frame (and FS frame) and symbols don't line
up, spill over, hard to see.
- [ ] Measure reel_frame.webp's actual transparent-window bbox with PIL; bake
      exact scale+offset into BoardFrame (replace FRAME_RATIOS guesswork — the
      window is NOT centered in the art, hence right-edge symbol cut)
- [ ] Flatten frameBgPanel texture further (streaks cross symbols) — near-flat
      dark panel, or generate a clean washi-texture panel in the gen batch
- [ ] Check the masked board rect vs frame window after fix (screenshot verify)
- [ ] Same treatment for the FS counter panel placement

## P1. Post-FX stack  `[ ]`
- [ ] `pnpm add pixi-filters` (workspace: apps/lines)
- [ ] AdvancedBloom (high threshold, subtle) on board-FX + overlay layers
- [ ] Impact kick: 80ms RGBSplit + ZoomBlur pulse, fired via fxBus 'smash'/'bigwin'
- [ ] Godray sweep during WinCelebration + FS intro
- [ ] ShockwaveFilter ripple on kanabo slam (replace/augment Graphics ring)

## P2. Time & camera grammar  `[ ]`
- [ ] Hit-stop helper in fx.ts (ticker.speed dip ~4 frames) — kanabo contact
- [ ] Camera container wrapping board+bg: 4px dip per tumble wave, 1.0→1.04
      celebration zoom, backOut settle
- [ ] WinCelebration 3-act: blackout+heartbeat → title slash-reveal → count-up
      + yen-coin fountain

## Sound audit  `[ ]`
- [ ] Diff every `soundOnce`/`soundMusic`/`soundLoop` name in src against
      sounds.json sprite keys
- [ ] In-browser: confirm Howler loads the new bundle (deferred, not preloaded),
      bgm_main loops, reel stops fire
- [ ] Volume pass: bgm at -8dB vs sfx at -3dB — check balance feels right

## P3. Textured particles  `[ ]`  (ComfyUI batch #1)
- [ ] Generate: ink splatter ×3, sakura petal, paper shred, ember flake,
      smoke wisp, brush speed-line (white/light on black, 256-512px)
- [ ] PIL: luminance→alpha, crop, pack small atlas
- [ ] Wire: tumble = ink+paper · scatter = petal+foxfire · kanabo = ink+ember
      · reel dust = smoke wisp · win sparkle = ember+petal

## P4. Brush-stroke reveals  `[ ]`  (same gen batch)
- [ ] Generate 4-6 wide brush strokes (white on black)
- [ ] TransitionWipe: brush-stroke mask wipe for FS enter/exit
- [ ] WinCelebration title: slash-reveal via stroke mask
- [ ] PaylineHighlight: line drawn as textured brush stroke + ink droplets

## P5. Flipbook FX sheets  `[ ]`  (same gen batch)
- [ ] Generate 6-8 frame sheets: foxfire flame burst, bell shock glyph, slash arc
- [ ] Slice/pack with PIL (like build-coin-sheet.py), play at 12fps
- [ ] Use: scatter land (bell glyph), wild land (foxfire burst), kanabo (slash arc)

## P6. Avatar alive  `[ ]`  (same gen batch, img2img)
- [ ] img2img pose variants of avatar.png at denoise ~0.5: wink, cheer (arms up),
      surprised — keep outfit/colors identical, curate hard
- [ ] Crossfade pose swap on bigwin/bonus (mesh idle stays the base)
- [ ] Motion pass: slower head-tilt arc, hair follow-through wave phase offset

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
