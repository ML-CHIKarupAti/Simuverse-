// Selection — PLAN §8 2.4 / 3.7. One selection store, written by three paths
// (canvas raycast now; list-row click and `\inspect` in Phase 3), read by the
// inspector. Keeping it here means the canvas and the future inspector share a
// single source of truth for "what is selected".

import { create } from 'zustand'

interface SelectionStore {
  selectedId: string | null
  select: (id: string) => void
  clear: () => void
}

export const useSelectionStore = create<SelectionStore>()((set) => ({
  selectedId: null,
  select: (id) => set({ selectedId: id }),
  clear: () => set({ selectedId: null }),
}))
