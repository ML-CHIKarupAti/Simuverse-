// Render-mode presets — PLAN §2.7. ONE typed source of truth for every visual
// parameter that changes across modes. The store is zustand so any component
// can subscribe to the active preset reactively. Render modes NEVER affect
// physics — they control only postprocessing, trail capacity, starfield
// density, and decorative glow.

import { create } from 'zustand'

// ── Types ────────────────────────────────────────────────────────────────────

export type RenderMode = 'restrained' | 'cinematic' | 'maximal'

export interface RenderPreset {
  bloom: {
    /** Overall bloom intensity (EffectComposer Bloom strength). */
    intensity: number
    /** Luminance threshold — pixels below this value are not bloomed. */
    luminanceThreshold: number
    /** Smoothing applied to the luminance threshold transition. */
    luminanceSmoothing: number
  }
  trails: {
    /** Ring-buffer capacity (max trail points per body). */
    capacity: number
    /** Peak opacity at the trail head (maxIntensity in fillTrailFade). */
    opacity: number
    /** Sample every N render frames (lower = denser trail). */
    sampleEveryNFrames: number
  }
  starfield: {
    /** Total background star count. */
    count: number
    /** Multiplier applied to per-star brightness in the shader. */
    brightnessMultiplier: number
  }
  /** Decorative glow intensity (accretion disks, etc.). 0 = off. */
  decorativeGlow: number
}

// ── Preset table (PLAN §2.7 approved values) ────────────────────────────────
// bloom.intensity values match PLAN: 0.25 / 0.9 / 1.8
// trails.capacity values match PLAN: 128 / 256 / 512
// starfield.count values match PLAN: 6000 / 10000 / 15000

export const RENDER_PRESETS: Record<RenderMode, RenderPreset> = {
  restrained: {
    bloom: {
      intensity: 0.25,
      luminanceThreshold: 0.95,
      luminanceSmoothing: 0.1,
    },
    trails: {
      capacity: 128,
      opacity: 0.35,
      sampleEveryNFrames: 4,
    },
    starfield: {
      count: 6000,
      brightnessMultiplier: 0.5,
    },
    decorativeGlow: 0,
  },

  cinematic: {
    bloom: {
      intensity: 0.9,
      luminanceThreshold: 0.6,
      luminanceSmoothing: 0.4,
    },
    trails: {
      capacity: 256,
      opacity: 0.6,
      sampleEveryNFrames: 4,
    },
    starfield: {
      count: 10000,
      brightnessMultiplier: 0.75,
    },
    decorativeGlow: 0.5,
  },

  maximal: {
    bloom: {
      intensity: 1.8,
      luminanceThreshold: 0.35,
      luminanceSmoothing: 0.6,
    },
    trails: {
      capacity: 512,
      opacity: 0.8,
      sampleEveryNFrames: 3,
    },
    starfield: {
      count: 15000,
      brightnessMultiplier: 1.0,
    },
    decorativeGlow: 1.0,
  },
} as const

// ── Zustand store ────────────────────────────────────────────────────────────

export interface RenderModeState {
  mode: RenderMode
  preset: RenderPreset
  setMode: (mode: RenderMode) => void
}

export const useRenderModeStore = create<RenderModeState>((set) => ({
  mode: 'cinematic',
  preset: RENDER_PRESETS.cinematic,
  setMode: (mode: RenderMode) =>
    set({ mode, preset: RENDER_PRESETS[mode] }),
}))
