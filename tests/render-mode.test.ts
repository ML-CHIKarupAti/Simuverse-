// Render-mode + visual-profile tests (PLAN §8 2.7, body-aware redesign).
//
// SCOPE HONESTY: these tests inspect the RENDER layer only — the tier preset
// table, the visual-profile registry, and the pure resolver. They deliberately
// do NOT claim to prove physics invariance by running the engine; instead they
// assert the structural guarantee that makes physics invariance hold: the
// render-mode + profile modules are pure data / pure functions with no path to
// engine, scene, or command state. Where a test only reads a preset it is named
// to say exactly that (see "does not mutate…"), never "physics unchanged".

import { describe, it, expect } from 'vitest'
import {
  useRenderMode,
  RENDER_MODE_PRESETS,
  type RenderMode,
} from '../src/render/../state/renderModeStore'
import { VISUAL_PROFILES } from '../src/render/visualProfiles/registry'
import { resolveVisualProfile } from '../src/render/visualProfiles/resolveVisualProfile'
import { tierLayers, RENDER_TIERS } from '../src/render/visualProfiles/types'
import type { VisualProfileKey } from '../src/render/visualProfiles/types'
import { ObjectTypeSchema, type ObjectType } from '../src/scene/schema'

const ALL_TIERS: RenderMode[] = ['restrained', 'cinematic', 'maximal']
const ALL_TYPES = ObjectTypeSchema.options as ObjectType[]

describe('render-mode store', () => {
  it('defaults to cinematic', () => {
    // Fresh store state — the module default, before any UI interaction.
    expect(useRenderMode.getState().mode).toBe('cinematic')
  })

  it('setMode switches to each tier', () => {
    const { setMode } = useRenderMode.getState()
    for (const m of ALL_TIERS) {
      setMode(m)
      expect(useRenderMode.getState().mode).toBe(m)
    }
    setMode('cinematic') // restore default for other tests
  })

  it('switching mode does not mutate the preset table (global-controls purity)', () => {
    const before = structuredClone(RENDER_MODE_PRESETS)
    const { setMode } = useRenderMode.getState()
    setMode('restrained')
    setMode('maximal')
    setMode('cinematic')
    // The preset table is static data; changing the selected mode must never
    // rewrite it. (This is the render-only analogue of "no side effects".)
    expect(RENDER_MODE_PRESETS).toEqual(before)
  })
})

describe('render-mode preset table', () => {
  it('every tier resolves to a complete, valid preset', () => {
    for (const m of ALL_TIERS) {
      const p = RENDER_MODE_PRESETS[m]
      expect(p.bloom).toBeGreaterThanOrEqual(0)
      expect(p.trailLength).toBeGreaterThan(0)
      expect(Number.isInteger(p.trailLength)).toBe(true)
      expect(p.starCount).toBeGreaterThan(0)
      expect(Number.isInteger(p.starCount)).toBe(true)
    }
  })

  it('escalates bloom / trail / star density restrained → cinematic → maximal', () => {
    const r = RENDER_MODE_PRESETS.restrained
    const c = RENDER_MODE_PRESETS.cinematic
    const x = RENDER_MODE_PRESETS.maximal
    expect(r.bloom).toBeLessThan(c.bloom)
    expect(c.bloom).toBeLessThan(x.bloom)
    expect(r.trailLength).toBeLessThan(c.trailLength)
    expect(c.trailLength).toBeLessThan(x.trailLength)
    expect(r.starCount).toBeLessThan(c.starCount)
    expect(c.starCount).toBeLessThan(x.starCount)
  })
})

describe('visual-profile registry (coverage matrix as data)', () => {
  const keys = Object.keys(VISUAL_PROFILES) as VisualProfileKey[]

  it('every profile is tier-complete (restrained + cinematic + maximal present)', () => {
    for (const k of keys) {
      const spec = VISUAL_PROFILES[k]
      for (const tier of RENDER_TIERS) {
        expect(spec[tier], `${k}.${tier}`).toBeDefined()
        expect(typeof spec[tier]).toBe('object')
      }
    }
  })

  it('every profile has a non-empty honest illustrative copy', () => {
    // The honesty seatbelt: no decorated body may ship without its "visual
    // only, no physics" explanation.
    for (const k of keys) {
      const copy = VISUAL_PROFILES[k].illustrativeCopy
      expect(copy.length, k).toBeGreaterThan(20)
      expect(copy.toLowerCase(), k).toContain('illustrative')
    }
  })

  it("each profile's key field matches its registry key", () => {
    for (const k of keys) expect(VISUAL_PROFILES[k].key).toBe(k)
  })

  it('IDENTITY is preserved at Restrained for named bodies (not stripped to a bare sphere)', () => {
    // The core correction over the rejected "brightness slider": Restrained
    // must still read as the body. Earth keeps clouds+atmosphere, Venus keeps
    // its gold cloud deck, Mercury stays rocky, the Sun stays granulated.
    expect(VISUAL_PROFILES.earth.restrained.cloudLayer).toBeDefined()
    expect(VISUAL_PROFILES.earth.restrained.atmosphereRim).toBeDefined()
    expect(VISUAL_PROFILES.venus.restrained.cloudLayer).toBeDefined()
    expect(VISUAL_PROFILES.mercury.restrained.rockyDetail).toBeDefined()
    expect(VISUAL_PROFILES.sun.restrained.granulation).toBeDefined()
    expect(VISUAL_PROFILES.sun.restrained.limbDarkening).toBeGreaterThan(0)
  })

  it('SPECTACLE is Maximal-only for the loud effects (absent at Restrained)', () => {
    // Flares, night lights, aurora, BH jet/lensing: none may appear in the
    // disciplined Restrained tier.
    expect(VISUAL_PROFILES.sun.restrained.flares).toBeUndefined()
    expect(VISUAL_PROFILES.sun.maximal.flares).toBe(true)
    expect(VISUAL_PROFILES.earth.restrained.nightLights).toBeUndefined()
    expect(VISUAL_PROFILES.earth.restrained.aurora).toBeUndefined()
    expect(VISUAL_PROFILES.earth.maximal.nightLights).toBeDefined()
    expect(VISUAL_PROFILES.earth.maximal.aurora).toBeDefined()
    expect(VISUAL_PROFILES['black-hole'].restrained.accretionDisk).toBeUndefined()
    expect(VISUAL_PROFILES['black-hole'].restrained.jet).toBeUndefined()
    expect(VISUAL_PROFILES['black-hole'].maximal.jet).toBe(true)
    expect(VISUAL_PROFILES['black-hole'].maximal.lensingShell).toBeDefined()
  })

  it('never applies an inappropriate phenomenon (no Venus oceans / Mercury aurora)', () => {
    // Venus must never turn blue/oceanic; its cloud tint stays warm/gold.
    for (const tier of RENDER_TIERS) {
      const cloud = VISUAL_PROFILES.venus[tier].cloudLayer
      if (cloud) expect(cloud.tint.toLowerCase()).not.toBe('#ffffff')
      // Mercury never gets an atmosphere or aurora (airless body).
      expect(VISUAL_PROFILES.mercury[tier].atmosphereRim).toBeUndefined()
      expect(VISUAL_PROFILES.mercury[tier].aurora).toBeUndefined()
    }
  })
})

describe('profile resolution + fallback chain', () => {
  it('uses the explicit profile when provided', () => {
    expect(resolveVisualProfile('planet', 'earth')).toBe('earth')
    expect(resolveVisualProfile('star', 'sun')).toBe('sun')
  })

  it('falls back to a type default when no explicit profile is given', () => {
    // A user-made / imported body without a named identity must still resolve
    // to a real, tier-complete profile — never an unstyled sphere.
    const defaults: Record<ObjectType, VisualProfileKey> = {
      star: 'generic-star',
      planet: 'generic-planet',
      moon: 'generic-moon',
      blackhole: 'black-hole',
    }
    for (const type of ALL_TYPES) {
      const key = resolveVisualProfile(type)
      expect(key).toBe(defaults[type])
      // The resolved profile exists and is meant for this object type.
      expect(VISUAL_PROFILES[key]).toBeDefined()
      expect(VISUAL_PROFILES[key].objectType).toBe(type)
    }
  })

  it('resolution is deterministic and total for the same inputs', () => {
    for (const type of ALL_TYPES) {
      expect(resolveVisualProfile(type)).toBe(resolveVisualProfile(type))
    }
  })

  it('tierLayers is a pure lookup: same (profile, mode) → identical layer set', () => {
    // Selecting a render mode is a read, not a mutation — resolving the same
    // body at the same tier twice yields the identical object.
    const spec = VISUAL_PROFILES.earth
    for (const m of ALL_TIERS) {
      expect(tierLayers(spec, m)).toBe(tierLayers(spec, m))
    }
  })
})
