/**
 * Ayakashi assets — Spine-free.
 *
 * All animation is procedural PixiJS (see ./animations + ./fxManager).
 * Reference Spine assets removed; symbol art comes from the Ayakashi
 * symbolsStatic atlas (14 frames: h1–h5, l1–l5, s, w, x, x2).
 *
 * Sounds and bitmap fonts are still the reference (mining) set as agreed
 * placeholders — swap the files when Ayakashi audio/fonts land; keys stay.
 */

export default {
	// pressToContinueText removed 2026-07-03 (MM_pressanywhere was a reference
	// asset) — PressToContinue.svelte renders a Yuji Syuku Text instead.
	symbolsStatic: {
		type: 'sprites',
		src: new URL('../../assets/sprites/symbolsStatic/symbolsStatic.json', import.meta.url).href,
	},
	// Ayakashi background layers (driven by BackgroundAmbient)
	bgBg: {
		type: 'sprite',
		src: new URL('../../assets/sprites/background/bg_bg.webp', import.meta.url).href,
		preload: true,
	},
	// bgFg dropped 2026-06-27: cherry branches are now baked into bg_bg.
	// bgEffect/bgMist are no longer composited by BackgroundAmbient (the new
	// bg_bg carries its own bokeh + mist). bgMist still feeds TransitionWipe's
	// fog, which constructs lazily — neither needs to block first paint.
	bgEffect: {
		type: 'sprite',
		src: new URL('../../assets/sprites/background/bg_effect.webp', import.meta.url).href,
	},
	bgMist: {
		type: 'sprite',
		src: new URL('../../assets/sprites/background/bg_mist.webp', import.meta.url).href,
	},
	// Ayakashi avatar (driven by AvatarActor)
	avatar: {
		type: 'sprite',
		src: new URL('../../assets/sprites/avatar/avatar.webp', import.meta.url).href,
	},
	// Wan I2V avatar animation sheets (green-screen renders 2026-07-04, baked
	// by art/bake_avatar_sheets.py — 4x4 keyed frames). Idle loops on the mesh;
	// cheer plays through the pose-hold on big wins.
	avatarIdleSheet: {
		type: 'sprite',
		src: new URL('../../assets/sprites/avatar/avatar_idle.webp', import.meta.url).href,
	},
	avatarCheerSheet: {
		type: 'sprite',
		src: new URL('../../assets/sprites/avatar/avatar_cheer.webp', import.meta.url).href,
	},
	// Ayakashi logo — baked PNG/webp (NinjaKage brush title + 妖かし). Baked with
	// real fonts via bake-logo.py because PIXI can't apply web fonts to SVG text.
	logo: {
		type: 'sprite',
		src: new URL('../../assets/sprites/logo/ayakashi_logo.webp', import.meta.url).href,
		preload: true,
	},
	// board chrome
	reelsFrame: {
		type: 'sprites',
		src: new URL('../../assets/sprites/reelsFrame/reels_frame.json', import.meta.url).href,
	},
	// lacquered ink-cloud panel behind the reels (Max's frame_bg1)
	frameBgPanel: {
		type: 'sprite',
		src: new URL('../../assets/sprites/reelsFrame/frame_bg1.webp', import.meta.url).href,
	},
	// hero one-piece red/gold lacquer frame — REQUIRES rembg'd reel_frame.png
	reelFrame: {
		type: 'sprite',
		src: new URL('../../assets/sprites/reelsFrame/reel_frame.webp', import.meta.url).href,
	},
	// ornate FS counter panel (oni emblem + foxfire)
	fsCounterPanel: {
		type: 'sprite',
		src: new URL('../../assets/sprites/reelsFrame/Frame_FSCounter2.webp', import.meta.url).href,
	},
	payFrame: {
		type: 'sprite',
		src: new URL('../../assets/sprites/payFrame/payFrame.webp', import.meta.url).href,
	},
	// Bitmap fonts removed 2026-07-03: no runtime consumer remained (all text
	// renders through PixiJS TextStyle with the licensed Yuji Syuku face), and
	// the mm_* filenames read as reference-game assets to reviewers. The
	// build-fonts.py pipeline still exists if a bitmap face is ever needed.
	// ── Betting-UI icon set ──
	// icon_menu      → hamburger menu (black/transparent, tinted white in-engine)
	// icon_bolt_slow → thin outline lightning bolt (turbo mode 0 = normal)
	// icon_bolt_med  → solid black bolt (turbo mode 1 = medium)
	// icon_bolt_fast → gold bolt (turbo mode 2 = fast)
	// icon_arrow_up  → up arrow; reused rotated 180° for decrease
	// icon_autospin  → circular arrows for AutoSpin button
	iconMenu: {
		type: 'sprite',
		src: new URL('../../assets/sprites/uiSlotsAssetsBespoke/icon_menu.webp', import.meta.url).href,
		preload: true,
	},
	iconBoltSlow: {
		type: 'sprite',
		src: new URL('../../assets/sprites/uiSlotsAssetsBespoke/icon_bolt_slow.webp', import.meta.url).href,
		preload: true,
	},
	iconBoltMed: {
		type: 'sprite',
		src: new URL('../../assets/sprites/uiSlotsAssetsBespoke/icon_bolt_med.webp', import.meta.url).href,
		preload: true,
	},
	iconBoltFast: {
		type: 'sprite',
		src: new URL('../../assets/sprites/uiSlotsAssetsBespoke/icon_bolt_fast.webp', import.meta.url).href,
		preload: true,
	},
	iconArrowUp: {
		type: 'sprite',
		src: new URL('../../assets/sprites/uiSlotsAssetsBespoke/icon_arrow_up.webp', import.meta.url).href,
		preload: true,
	},
	iconAutospin: {
		type: 'sprite',
		src: new URL('../../assets/sprites/uiSlotsAssetsBespoke/icon_autospin.webp', import.meta.url).href,
		preload: true,
	},
	iconSpin: {
		type: 'sprite',
		src: new URL('../../assets/sprites/uiSlotsAssetsBespoke/icon_spin.webp', import.meta.url).href,
		preload: true,
	},
	// legacy bespoke assets (no longer used by UI buttons — kept to avoid 404)
	bet: {
		type: 'sprite',
		src: new URL('../../assets/sprites/uiSlotsAssetsBespoke/spin_medallion.webp', import.meta.url).href,
	},
	base_button: {
		type: 'sprite',
		src: new URL('../../assets/sprites/uiSlotsAssetsBespoke/base_button.webp', import.meta.url).href,
	},
	base_ticker: {
		type: 'sprite',
		src: new URL('../../assets/sprites/uiSlotsAssetsBespoke/base_ticker.webp', import.meta.url).href,
	},
	// loading + ui sprites
	progressBar: {
		type: 'sprites',
		src: new URL('../../assets/sprites/progressBar/progressBar.json', import.meta.url).href,
		preload: true,
	},
	freeSpins: {
		type: 'sprites',
		src: new URL('../../assets/sprites/freeSpins/freeSpins.json', import.meta.url).href,
	},
	// winSmall (MM_Localisation_winsmall) removed 2026-07-03 — reference asset
	// with no consumer.
	// bespoke 24-frame spinning yen coin (build-coin-sheet.py) — renamed off the
	// reference SD2_Coin filename 2026-07-03
	coins: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/coin/ayakashi_coin.json', import.meta.url).href,
	},
	// ── Symbol win flipbooks (Wan 2.2 I2V, baked 2026-07-04) ──
	// 4x4 sheets, 16 frames @256px, background chroma-keyed at bake time
	// (art/bake_win_sheets.py). Sliced by game/symbolWinFrames.ts; played
	// in-place by SymbolSprite on the 'win' state (ping-pong, returns to rest).
	// Not preloaded — SymbolSprite falls back to the procedural pop until they
	// arrive in phase 2.
	winH1: { type: 'sprite', src: new URL('../../assets/sprites/symbols/h1_win.webp', import.meta.url).href },
	winH2: { type: 'sprite', src: new URL('../../assets/sprites/symbols/h2_win.webp', import.meta.url).href },
	winH3: { type: 'sprite', src: new URL('../../assets/sprites/symbols/h3_win.webp', import.meta.url).href },
	winH4: { type: 'sprite', src: new URL('../../assets/sprites/symbols/h4_win.webp', import.meta.url).href },
	winL1: { type: 'sprite', src: new URL('../../assets/sprites/symbols/l1_win.webp', import.meta.url).href },
	winL2: { type: 'sprite', src: new URL('../../assets/sprites/symbols/l2_win.webp', import.meta.url).href },
	winL3: { type: 'sprite', src: new URL('../../assets/sprites/symbols/l3_win.webp', import.meta.url).href },
	winL4: { type: 'sprite', src: new URL('../../assets/sprites/symbols/l4_win.webp', import.meta.url).href },
	winL5: { type: 'sprite', src: new URL('../../assets/sprites/symbols/l5_win.webp', import.meta.url).href },
	winW: { type: 'sprite', src: new URL('../../assets/sprites/symbols/w_win.webp', import.meta.url).href },
	winS: { type: 'sprite', src: new URL('../../assets/sprites/symbols/s_win.webp', import.meta.url).href },
	winM: { type: 'sprite', src: new URL('../../assets/sprites/symbols/m_win.webp', import.meta.url).href },
	winX: { type: 'sprite', src: new URL('../../assets/sprites/symbols/x_win.webp', import.meta.url).href },
	// FLUX-generated textured particles (white-body alpha sprites; ParticlePool
	// tints them per effect). Not preloaded — modules fall back to the glow dot
	// until these arrive in phase 2.
	particleInk: {
		type: 'sprite',
		src: new URL('../../assets/sprites/particles/ink_splat.webp', import.meta.url).href,
	},
	// Petal flipbook — five 4x4 Wan/Hailuo I2V sheets (16 frames each, 256 px /
	// frame). fxManager slices each sheet into 16 Textures at load time and
	// registers all five with particleLib; pickParticleAnim() then random-picks
	// a sheet PER PARTICLE at emit time so a falling swarm reads varied, not
	// mechanical. Each particle also starts on a random frame within its sheet.
	particlePetal1: {
		type: 'sprite',
		src: new URL('../../assets/sprites/particles/petals/petal_v1_wan.webp', import.meta.url).href,
	},
	particlePetal2: {
		type: 'sprite',
		src: new URL('../../assets/sprites/particles/petals/petal_v1_hailuo.webp', import.meta.url).href,
	},
	particlePetal3: {
		type: 'sprite',
		src: new URL('../../assets/sprites/particles/petals/petal_v3_hailuo.webp', import.meta.url).href,
	},
	particlePetal4: {
		type: 'sprite',
		src: new URL('../../assets/sprites/particles/petals/petal_v5_wan.webp', import.meta.url).href,
	},
	particlePetal5: {
		type: 'sprite',
		src: new URL('../../assets/sprites/particles/petals/petal_v5_hailuo.webp', import.meta.url).href,
	},
	particlePetal6: {
		type: 'sprite',
		src: new URL('../../assets/sprites/particles/petals/petal_v3_wan.webp', import.meta.url).href,
	},
	particlePetal7: {
		type: 'sprite',
		src: new URL('../../assets/sprites/particles/petals/petal_v4_hailuo.webp', import.meta.url).href,
	},
	particlePetal8: {
		type: 'sprite',
		src: new URL('../../assets/sprites/particles/petals/petal_v2_wan.webp', import.meta.url).href,
	},
	particlePaper: {
		type: 'sprite',
		src: new URL('../../assets/sprites/particles/paper.webp', import.meta.url).href,
	},
	particleEmber: {
		type: 'sprite',
		src: new URL('../../assets/sprites/particles/ember.webp', import.meta.url).href,
	},
	particleSmoke: {
		type: 'sprite',
		src: new URL('../../assets/sprites/particles/smoke.webp', import.meta.url).href,
	},
	// Wan-rendered ink-burst flipbook (4x4, keyed) — tumble explosion clip;
	// replaces the procedural glow/particle spray (2026-07-04 feedback)
	fxInkBurst: {
		type: 'sprite',
		src: new URL('../../assets/sprites/particles/fx_ink_burst.webp', import.meta.url).href,
	},
	// bespoke blue-white foxfire flame (RunComfy) — FS-intro pillars + drifting
	// wisps. Tinted spirit-blue by ParticlePool; falls back to the glow dot.
	particleFoxfire: {
		type: 'sprite',
		src: new URL('../../assets/sprites/particles/foxfire/foxfire_0.webp', import.meta.url).href,
		preload: true, // tiny; preloaded so FS-intro pillars never miss the flame
	},
	// bespoke torii gate (RunComfy) for the FS intro — replaces the procedural
	// silhouette. Preloaded so the intro never shows the fallback.
	torii: {
		type: 'sprite',
		src: new URL('../../assets/sprites/uiSlotsAssetsBespoke/torii.webp', import.meta.url).href,
		preload: true,
	},
	// sumi-e brush banner (white-on-black alpha) — tinted behind the win-
	// celebration title/amount. Preloaded so the first big win never shows the
	// procedural rounded-rect fallback (read as an "orange blob" behind the
	// total win text). Asset is ~30 KB so the preload cost is negligible.
	brushWide: {
		type: 'sprite',
		src: new URL('../../assets/sprites/particles/brush_wide.webp', import.meta.url).href,
		preload: true,
	},
	// audio (placeholder reference set) — NOT preloaded: ~4MB of audio must not
	// block first paint. It background-loads (phase 2) and is ready before the
	// loading bar fills, so the first interactive frame appears far sooner.
	sound: {
		type: 'audio',
		src: new URL('../../assets/audio/sounds.json', import.meta.url).href,
	},
} as const;
