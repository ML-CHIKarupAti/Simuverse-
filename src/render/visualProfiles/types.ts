// Visual profile types — body-aware render identity, separate from render TIER
// (restrained/cinematic/maximal, in renderModeStore.ts) and separate from
// global controls (bloom/starfield/trail scalars). This is category (1) of the
// three orthogonal axes: object identity, render tier, global controls.
//
// NEVER imported by src/engine/*, src/commands/*, or src/scene/*. Render-only.
//
// Design law (PLAN §8 2.7 body-aware redesign): a tier is a complete VISUAL
// LANGUAGE, not a brightness knob. IDENTITY layers (baseColor, limbDarkening,
// cloudLayer, atmosphereRim, rockyDetail) are present at EVERY tier including
// Restrained — Earth stays blue-and-clouded, Venus stays pale-gold-clouded,
// Mercury stays rocky, a Sun stays temperature-tinted. SPECTACLE layers
// (flares, nightLights, aurora, jet, lensingShell, and the loud end of
// corona/accretionDisk) escalate Cinematic → Maximal and are ABSENT in
// Restrained. That is what makes the three tiers read as different within
// three seconds by material and composition rather than by exposure.

import type { ObjectType } from '../../scene/schema'
import type { RenderMode } from '../../state/renderModeStore'

// Stable identity key. NOT derived from display name at render time (names are
// user-editable via \rename) — only assigned by object-construction code
// (the temporary demo scene now; real presets in Phase 6) or defaulted by type.
export type VisualProfileKey =
  | 'sun'
  | 'generic-star'
  | 'earth'
  | 'venus'
  | 'mercury'
  | 'mars'
  | 'gas-giant'
  | 'ringed-gas-giant'
  | 'rocky-moon'
  | 'icy-moon'
  | 'black-hole'
  | 'generic-planet'
  | 'generic-moon'

// ── Layer config shapes ─────────────────────────────────────────────────────
// Each is a small typed record so a tier declares its treatment as data, never
// as a magic boolean whose meaning is buried in a component.

/** Star photosphere — procedural granulation shell. IDENTITY (all tiers). */
export interface GranulationConfig {
  /** Spatial frequency of the granule cells (higher = finer). */
  scale: number
  /** Bright-centre vs dark-lane contrast, 0..1. */
  contrast: number
  /** Convective drift speed (multiplies simTime, deterministic). */
  flowSpeed: number
}

/** Star corona — layered fresnel halo. SPECTACLE (cinematic+, escalates). */
export interface CoronaConfig {
  /** Peak rim opacity, 0..1. */
  intensity: number
  /** Outer shell radius as a multiple of the star radius. */
  size: number
}

/** Cloud shell — Earth, Venus, gas giants. IDENTITY (all tiers, tuned down). */
export interface CloudConfig {
  tint: string
  /** Coverage fraction, 0..1. */
  density: number
  /** Noise warping / banding strength. */
  turbulence: number
  /** Drift speed (multiplies simTime). Default 1. */
  flowSpeed?: number
  /** Draw as latitudinal bands (gas giants) instead of scattered cells. */
  banded?: boolean
}

/** Fresnel atmosphere halo — Earth, Venus, icy moons. IDENTITY (all tiers). */
export interface AtmosphereConfig {
  color: string
  intensity: number
  /** Fresnel exponent — higher = thinner rim. Default 2.5. */
  power?: number
}

/** Rocky/cratered surface cue — Mercury, Mars, rocky moons. IDENTITY. */
export interface RockyConfig {
  /** Surface roughness noise contrast, 0..1. */
  contrast: number
}

/** Night-side artificial lights — Earth Maximal only. SPECTACLE. */
export interface NightLightsConfig {
  color: string
  /** Fraction of surface that lights up, 0..1. */
  density: number
}

/** Polar aurora ribbons — Earth Maximal only. SPECTACLE. */
export interface AuroraConfig {
  color: string
  intensity: number
}

/** Accretion disk — black hole. SPECTACLE (cinematic+, escalates). */
export interface AccretionConfig {
  innerColor: string
  outerColor: string
  /** Overall disk brightness multiplier. */
  brightness: number
}

/** Illustrative gravitational-lensing halo — black hole Maximal. SPECTACLE. */
export interface LensingConfig {
  color: string
  intensity: number
}

// What each tier enables for a given profile. Every field is optional so a
// profile can declare only what it supports — the "intentionally unavailable"
// half of the coverage matrix is just an omitted key, not a disabled flag.
export interface TierLayers {
  /** Fallback tint used only when the instance itself has no albedo/colour. */
  baseColor?: string
  // ── Star ──
  /** Edge darkening for stars, 0 (off) .. 1. Identity — present every tier. */
  limbDarkening?: number
  granulation?: GranulationConfig
  corona?: CoronaConfig
  /** Seeded prominence arcs — Maximal spectacle. */
  flares?: boolean
  // ── Planet / atmosphere ──
  cloudLayer?: CloudConfig
  atmosphereRim?: AtmosphereConfig
  nightLights?: NightLightsConfig
  aurora?: AuroraConfig
  // ── Rocky ──
  rockyDetail?: RockyConfig
  // ── Black hole ──
  accretionDisk?: AccretionConfig
  lensingShell?: LensingConfig
  jet?: boolean
}

export interface VisualProfileSpec {
  key: VisualProfileKey
  objectType: ObjectType // which SimObject type this profile applies to
  restrained: TierLayers
  cinematic: TierLayers
  maximal: TierLayers
  // Verbatim honesty copy for every non-physical layer this profile ever
  // enables at any tier (PLAN §2/§8.5 fidelity pattern — inspector only).
  illustrativeCopy: string
}

export const RENDER_TIERS = ['restrained', 'cinematic', 'maximal'] as const

export function tierLayers(spec: VisualProfileSpec, mode: RenderMode): TierLayers {
  return spec[mode]
}
