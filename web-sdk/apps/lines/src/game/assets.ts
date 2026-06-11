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
		src: new URL('../../assets/sprites/background/bg_bg.png', import.meta.url).href,
		preload: true,
	},
	bgFg: {
		type: 'sprite',
		src: new URL('../../assets/sprites/background/bg_fg.png', import.meta.url).href,
		preload: true,
	},
	bgEffect: {
		type: 'sprite',
		src: new URL('../../assets/sprites/background/bg_effect.png', import.meta.url).href,
		preload: true,
	},
	bgMist: {
		type: 'sprite',
		src: new URL('../../assets/sprites/background/bg_mist.png', import.meta.url).href,
		preload: true,
	},
	// Ayakashi avatar (driven by AvatarActor)
	avatar: {
		type: 'sprite',
		src: new URL('../../assets/sprites/avatar/avatar.png', import.meta.url).href,
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
		src: new URL('../../assets/sprites/reelsFrame/frame_bg1.png', import.meta.url).href,
	},
	// hero one-piece red/gold lacquer frame — REQUIRES rembg'd reel_frame.png
	reelFrame: {
		type: 'sprite',
		src: new URL('../../assets/sprites/reelsFrame/reel_frame.png', import.meta.url).href,
	},
	// ornate FS counter panel (oni emblem + foxfire)
	fsCounterPanel: {
		type: 'sprite',
		src: new URL('../../assets/sprites/reelsFrame/Frame_FSCounter2.png', import.meta.url).href,
	},
	payFrame: {
		type: 'sprite',
		src: new URL('../../assets/sprites/payFrame/payFrame.png', import.meta.url).href,
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
	// audio (placeholder reference set)
	sound: {
		type: 'audio',
		src: new URL('../../assets/audio/sounds.json', import.meta.url).href,
		preload: true,
	},
} as const;
