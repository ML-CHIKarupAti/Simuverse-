// Full-orbit-path overlay on/off — owner-requested feature (folded into 2.7).
// TEMPORARY: real UI control arrives with the terminal/top-bar in Phase 3.

import { create } from 'zustand'

interface OrbitPathVisibleStore {
  visible: boolean
  toggle: () => void
}

export const useOrbitPathVisible = create<OrbitPathVisibleStore>()((set) => ({
  visible: false, // off by default — the dynamic trail is the default look
  toggle: () => set((s) => ({ visible: !s.visible })),
}))
