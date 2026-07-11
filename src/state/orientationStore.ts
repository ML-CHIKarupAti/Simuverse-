// Current camera orientation label (owner request). Set by OrientationReadout
// (inside the Canvas) when the camera is snapped to a coordinate axis, read by
// the HTML overlay. Null when free-orbiting.

import { create } from 'zustand'

interface OrientationStore {
  view: string | null
  setView: (view: string | null) => void
}

export const useOrientationStore = create<OrientationStore>()((set) => ({
  view: null,
  setView: (view) => set({ view }),
}))
