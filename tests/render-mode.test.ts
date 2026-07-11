// Render-mode preset tests — PLAN §11 Phase 2 (automated logic):
// "render-mode presets never touch engine config (assert message types)"
//
// Tests:
// 1. Preset values match PLAN §2.7 approved numbers
// 2. Default mode is cinematic
// 3. setMode changes mode + preset atomically
// 4. Every mode key is covered in the preset table
// 5. No preset references any physics/engine property
// 6. Preset values are reasonable (no white-out, no zero-count, etc.)

import { describe, it, expect, beforeEach } from 'vitest'
import {
  useRenderModeStore,
  RENDER_PRESETS,
  type RenderMode,
  type RenderPreset,
} from '../src/state/renderModeStore'

// Reset the store between tests so they are independent.
beforeEach(() => {
  useRenderModeStore.setState({
    mode: 'cinematic',
    preset: RENDER_PRESETS.cinematic,
  })
})

describe('RENDER_PRESETS', () => {
  it('covers all three modes', () => {
    const modes: RenderMode[] = ['restrained', 'cinematic', 'maximal']
    for (const m of modes) {
      expect(RENDER_PRESETS[m]).toBeDefined()
    }
  })

  it('matches PLAN §2.7 approved bloom intensity values', () => {
    expect(RENDER_PRESETS.restrained.bloom.intensity).toBe(0.25)
    expect(RENDER_PRESETS.cinematic.bloom.intensity).toBe(0.9)
    expect(RENDER_PRESETS.maximal.bloom.intensity).toBe(1.8)
  })

  it('matches PLAN §2.7 approved trail capacity values', () => {
    expect(RENDER_PRESETS.restrained.trails.capacity).toBe(128)
    expect(RENDER_PRESETS.cinematic.trails.capacity).toBe(256)
    expect(RENDER_PRESETS.maximal.trails.capacity).toBe(512)
  })

  it('matches PLAN §2.7 approved star count values', () => {
    expect(RENDER_PRESETS.restrained.starfield.count).toBe(6000)
    expect(RENDER_PRESETS.cinematic.starfield.count).toBe(10000)
    expect(RENDER_PRESETS.maximal.starfield.count).toBe(15000)
  })

  it('has monotonically increasing bloom intensity across modes', () => {
    expect(RENDER_PRESETS.restrained.bloom.intensity)
      .toBeLessThan(RENDER_PRESETS.cinematic.bloom.intensity)
    expect(RENDER_PRESETS.cinematic.bloom.intensity)
      .toBeLessThan(RENDER_PRESETS.maximal.bloom.intensity)
  })

  it('has monotonically increasing trail capacity across modes', () => {
    expect(RENDER_PRESETS.restrained.trails.capacity)
      .toBeLessThan(RENDER_PRESETS.cinematic.trails.capacity)
    expect(RENDER_PRESETS.cinematic.trails.capacity)
      .toBeLessThan(RENDER_PRESETS.maximal.trails.capacity)
  })

  it('has monotonically increasing star count across modes', () => {
    expect(RENDER_PRESETS.restrained.starfield.count)
      .toBeLessThan(RENDER_PRESETS.cinematic.starfield.count)
    expect(RENDER_PRESETS.cinematic.starfield.count)
      .toBeLessThan(RENDER_PRESETS.maximal.starfield.count)
  })

  it('bloom intensity never exceeds 2.0 (prevents white-out)', () => {
    for (const preset of Object.values(RENDER_PRESETS)) {
      expect(preset.bloom.intensity).toBeLessThanOrEqual(2.0)
    }
  })

  it('star count is always positive and reasonable', () => {
    for (const preset of Object.values(RENDER_PRESETS)) {
      expect(preset.starfield.count).toBeGreaterThanOrEqual(1000)
      expect(preset.starfield.count).toBeLessThanOrEqual(50000)
    }
  })

  it('trail capacity is always a power of 2', () => {
    for (const preset of Object.values(RENDER_PRESETS)) {
      const cap = preset.trails.capacity
      expect(cap & (cap - 1)).toBe(0) // power-of-2 check
    }
  })

  it('decorativeGlow is 0 for restrained, positive for cinematic/maximal', () => {
    expect(RENDER_PRESETS.restrained.decorativeGlow).toBe(0)
    expect(RENDER_PRESETS.cinematic.decorativeGlow).toBeGreaterThan(0)
    expect(RENDER_PRESETS.maximal.decorativeGlow).toBeGreaterThan(0)
  })

  it('contains only visual parameters — no physics keys', () => {
    const physicsKeys = [
      'mass', 'position', 'velocity', 'acceleration', 'dt', 'softening',
      'timescale', 'integrator', 'G', 'epsilon',
    ]
    for (const preset of Object.values(RENDER_PRESETS)) {
      const json = JSON.stringify(preset)
      for (const key of physicsKeys) {
        expect(json).not.toContain(`"${key}"`)
      }
    }
  })
})

describe('useRenderModeStore', () => {
  it('defaults to cinematic mode', () => {
    const state = useRenderModeStore.getState()
    expect(state.mode).toBe('cinematic')
    expect(state.preset).toBe(RENDER_PRESETS.cinematic)
  })

  it('setMode switches to restrained', () => {
    useRenderModeStore.getState().setMode('restrained')
    const state = useRenderModeStore.getState()
    expect(state.mode).toBe('restrained')
    expect(state.preset).toBe(RENDER_PRESETS.restrained)
  })

  it('setMode switches to maximal', () => {
    useRenderModeStore.getState().setMode('maximal')
    const state = useRenderModeStore.getState()
    expect(state.mode).toBe('maximal')
    expect(state.preset).toBe(RENDER_PRESETS.maximal)
  })

  it('switching modes preserves preset referential identity', () => {
    // The preset should be the exact object from RENDER_PRESETS, not a copy.
    useRenderModeStore.getState().setMode('restrained')
    expect(useRenderModeStore.getState().preset).toBe(RENDER_PRESETS.restrained)
    useRenderModeStore.getState().setMode('cinematic')
    expect(useRenderModeStore.getState().preset).toBe(RENDER_PRESETS.cinematic)
    useRenderModeStore.getState().setMode('maximal')
    expect(useRenderModeStore.getState().preset).toBe(RENDER_PRESETS.maximal)
  })

  it('round-trip through all modes returns to cinematic', () => {
    const store = useRenderModeStore.getState()
    store.setMode('restrained')
    store.setMode('maximal')
    store.setMode('cinematic')
    const state = useRenderModeStore.getState()
    expect(state.mode).toBe('cinematic')
    expect(state.preset).toBe(RENDER_PRESETS.cinematic)
  })

  it('preset shape matches the RenderPreset type at runtime', () => {
    // Structural check: every preset has all required keys.
    const requiredShape: (keyof RenderPreset)[] = [
      'bloom', 'trails', 'starfield', 'decorativeGlow',
    ]
    for (const mode of ['restrained', 'cinematic', 'maximal'] as const) {
      const preset = RENDER_PRESETS[mode]
      for (const key of requiredShape) {
        expect(preset).toHaveProperty(key)
      }
      expect(preset.bloom).toHaveProperty('intensity')
      expect(preset.bloom).toHaveProperty('luminanceThreshold')
      expect(preset.bloom).toHaveProperty('luminanceSmoothing')
      expect(preset.trails).toHaveProperty('capacity')
      expect(preset.trails).toHaveProperty('opacity')
      expect(preset.trails).toHaveProperty('sampleEveryNFrames')
      expect(preset.starfield).toHaveProperty('count')
      expect(preset.starfield).toHaveProperty('brightnessMultiplier')
    }
  })
})
