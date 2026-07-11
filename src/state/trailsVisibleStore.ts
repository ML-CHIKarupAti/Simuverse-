// Trails on/off — TEMPORARY dev toggle for testing Phase-2 visuals. The real
// `\trails on|off` command (PLAN §7) arrives with the terminal in Phase 3 and
// will replace this; kept as its own tiny store so that swap is a one-line change.

import { create } from 'zustand'

interface TrailsVisibleStore {
  visible: boolean
  toggle: () => void
}

export const useTrailsVisible = create<TrailsVisibleStore>()((set) => ({
  visible: true,
  toggle: () => set((s) => ({ visible: !s.visible })),
}))
