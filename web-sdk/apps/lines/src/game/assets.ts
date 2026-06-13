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
	pressToContinueText: {
		type: 'sprites',
		src: new URL('../../assets/sprites/pressToContinueText/MM_pressanywhere.json', import.meta.url).href,
		preload: true,
	},
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
	bgFg: {
		type: 'sprite',
		src: new URL('../../assets/sprites/background/bg_fg.webp', import.meta.url).href,
		preload: true,
	},
	bgEffect: {
		type: 'sprite',
		src: new URL('../../assets/sprites/background/bg_effect.webp', import.meta.url).href,
		preload: true,
	},
	bgMist: {
		type: 'sprite',
		src: new URL('../../assets/sprites/background/bg_mist.webp', import.meta.url).href,
		preload: true,
	},
	// Ayakashi avatar (driven by AvatarActor)
	avatar: {
		type: 'sprite',
		src: new URL('../../assets/sprites/avatar/avatar.webp', import.meta.url).href,
	},
	// Ayakashi logo (SVG — rasterised by Pixi at load)
	logo: {
		type: 'sprite',
		src: new URL('../../assets/sprites/logo/ayakashi_logo.svg', import.meta.url).href,
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
	// fonts (placeholder reference bitmap fonts)
	goldFont: {
		type: 'font',
		src: new URL('../../assets/fonts/goldFont/mm_gold.xml', import.meta.url).href,
	},
	goldBlur: {
		type: 'font',
		src: new URL('../../assets/fonts/goldBlur/miningfont_gold_blur.xml', import.meta.url).href,
	},
	silverFont: {
		type: 'font',
		src: new URL('../../assets/fonts/silverFont/mm_silver.xml', import.meta.url).href,
	},
	purpleFont: {
		type: 'font',
		src: new URL('../../assets/fonts/purpleFont/mm_purple.xml', import.meta.url).href,
	},
	// ── Betting-UI lacquer set (U1) — bespoke RunComfy art, cut to alpha ──
	// Consumed by the core components-ui-pixi components via UiSprite key lookup:
	//   bet         → ornate spin-button medallion (ButtonBet)
	//   base_button → standard lacquer button plate (UiButton dark variant)
	//   base_ticker → balance/win/bet readout plaque (UiLabel)
	bet: {
		type: 'sprite',
		src: new URL('../../assets/sprites/uiSlotsAssetsBespoke/spin_medallion.webp', import.meta.url).href,
		preload: true,
	},
	base_button: {
		type: 'sprite',
		src: new URL('../../assets/sprites/uiSlotsAssetsBespoke/base_button.webp', import.meta.url).href,
		preload: true,
	},
	base_ticker: {
		type: 'sprite',
		src: new URL('../../assets/sprites/uiSlotsAssetsBespoke/base_ticker.webp', import.meta.url).href,
		preload: true,
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
	winSmall: {
		type: 'sprites',
		src: new URL('../../assets/sprites/winSmall/MM_Localisation_winsmall.json', import.meta.url).href,
	},
	coins: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/coin/SD2_Coin.json', import.meta.url).href,
	},
	// FLUX-generated textured particles (white-body alpha sprites; ParticlePool
	// tints them per effect). Not preloaded — modules fall back to the glow dot
	// until these arrive in phase 2.
	particleInk: {
		type: 'sprite',
		src: new URL('../../assets/sprites/particles/ink_splat.webp', import.meta.url).href,
	},
	particlePetal: {
		type: 'sprite',
		src: new URL('../../assets/sprites/particles/petal.webp', import.meta.url).href,
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
	// sumi-e brush banner (white-on-black alpha) — tinted behind the win-
	// celebration title/amount. Background-loaded; the celebration falls back to
	// a procedural plaque until this resolves.
	brushWide: {
		type: 'sprite',
		src: new URL('../../assets/sprites/particles/brush_wide.webp', import.meta.url).href,
	},
	// audio (placeholder reference set) — NOT preloaded: ~4MB of audio must not
	// block first paint. It background-loads (phase 2) and is ready before the
	// loading bar fills, so the first interactive frame appears far sooner.
	sound: {
		type: 'audio',
		src: new URL('../../assets/audio/sounds.json', import.meta.url).href,
	},
} as const;
