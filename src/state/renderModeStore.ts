// Render modes — PLAN §8 2.7. Three visual presets; PURELY postprocessing/
// particle-count parameters. Render mode NEVER affects physics or simulation
// state — the same engine runs underneath every mode (verified in 2.7's tests).

import { create } from 'zustand'

export type RenderMode = 'restrained' | 'cinematic' | 'maximal'

export interface RenderModePreset {
  bloom: number
  trailLength: number
  starCount: number
}

// Exact preset table (PLAN §8 2.7 / §8.5).
export const RENDER_MODE_PRESETS: Record<RenderMode, RenderModePreset> = {
  restrained: { bloom: 0.25, trailLength: 128, starCount: 6000 },
  cinematic: { bloom: 0.9, trailLength: 256, starCount: 10000 },
  maximal: { bloom: 1.8, trailLength: 512, starCount: 15000 },
}

interface RenderModeStore {
  mode: RenderMode
  setMode: (mode: RenderMode) => void
}

export const useRenderMode = create<RenderModeStore>()((set) => ({
  mode: 'cinematic', // default per PLAN
  setMode: (mode) => set({ mode }),
}))
