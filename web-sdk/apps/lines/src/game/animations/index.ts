/**
 * Ayakashi animation modules — pure PixiJS, no Spine dependencies.
 *
 * Each module is self-contained: constructor takes the PIXI Application and a
 * parent/effects layer; trigger methods are documented in each file's header
 * with the book/emitter event they correspond to. All modules expose
 * destroy() and release every ticker callback, tween, and display object.
 */

export { PALETTE, easings, delay, hitStop, TweenRunner, ParticlePool, ScreenShaker, RayBurst, flash, makeGlowTexture, makeRayTexture, makeParticleTexture, fxBus, type FxEvent } from './fx';
export { AvatarActor, type AvatarActorOptions } from './avatarFx';
export { WinCelebration, type BigWinAlias, type WinCelebrationOptions, type PlayOptions } from './winCelebration';
export { BonusTriggerAnimation, type BonusTriggerOptions, type BonusTriggerPlayOptions } from './bonusTrigger';
export { FreeSpinsScreen, type FreeSpinsScreenOptions } from './freeSpinsScreen';
export { WildLandingAnimation, type WildLandingOptions } from './wildLanding';
export { ReelSpinFx, type ReelSpinFxOptions } from './reelSpinFx';
export { PaylineHighlight, type PaylineHighlightOptions } from './paylineHighlight';
export { SymbolIdleManager, type IdleProfile } from './symbolIdle';
export { BackgroundAmbient, type BackgroundAmbientOptions } from './backgroundAmbient';
export { SpinButtonFx, BetStepperFx, CollectFx, type SpinButtonFxOptions } from './uiFx';
export { KanaboSmash, type KanaboSmashOptions } from './kanaboSmash';
export { OfudaCharm, type OfudaCharmOptions } from './ofudaCharm';
export { TumbleExplosion, type TumbleExplosionOptions } from './tumbleExplosion';
export { SymbolWinFx, type SymbolTier, type SymbolWinFxOptions } from './symbolWinFx';
export { SymbolWinAnimations, type SymbolWinAnimationsOptions } from './symbolWinAnimations';
export { TransitionWipe, type TransitionWipeOptions } from './transitionWipe';
export { LoaderOrbs, type LoaderOrbsOptions } from './loaderFx';
export { LoadingScene, type LoadingSceneOptions } from './loadingScene';
export { PostFx, type PostFxOptions } from './postFx';
export { CameraGrammar, type CameraGrammarOptions } from './cameraGrammar';
export { setParticleTexture, getParticleTexture, type ParticleName } from './particleLib';
