import { describe, it, expect, beforeEach } from 'vitest'
import { useSelectionStore } from '../src/state/selectionStore'

describe('selection store', () => {
  beforeEach(() => useSelectionStore.setState({ selectedId: null }))

  it('starts with nothing selected', () => {
    expect(useSelectionStore.getState().selectedId).toBeNull()
  })

  it('select sets the id; clear resets it', () => {
    useSelectionStore.getState().select('sun')
    expect(useSelectionStore.getState().selectedId).toBe('sun')
    useSelectionStore.getState().select('earth')
    expect(useSelectionStore.getState().selectedId).toBe('earth')
    useSelectionStore.getState().clear()
    expect(useSelectionStore.getState().selectedId).toBeNull()
  })
})
