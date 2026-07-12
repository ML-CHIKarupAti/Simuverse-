// Seeded illustrative phenomena (PLAN §2 determinism). These effects are the
// only "animated" part of the render layer, so they carry the strictest honesty
// bar: the SAME (objectId, sceneSeed, simTime) must ALWAYS produce the SAME
// visual state. That is what lets a paused / scrubbed / replayed scene look
// identical every time — no Math.random, no wall-clock. These tests inspect the
// pure schedule function only; they make no claim about the physics engine.

import { describe, it, expect } from 'vitest'
import {
  flareStateAt,
  FLARE_PERIOD_YR,
} from '../src/render/visualProfiles/seededPhenomena'

describe('flareStateAt — deterministic seeded schedule', () => {
  it('is a pure function of (objectId, seed, simTime)', () => {
    const a = flareStateAt('sun', 1337, 0.5)
    const b = flareStateAt('sun', 1337, 0.5)
    expect(a).toEqual(b)
  })

  it('reproduces the identical sequence on a replay (same seed)', () => {
    const times = [0, 0.05, 0.1, 0.18, 0.37, 1.234]
    const run1 = times.map((t) => flareStateAt('sun', 42, t))
    const run2 = times.map((t) => flareStateAt('sun', 42, t))
    expect(run1).toEqual(run2)
  })

  it('gives each object its own fixed surface angle (independent schedules)', () => {
    const sun = flareStateAt('sun', 1337, 0)
    const other = flareStateAt('sun#flare2', 1337, 0)
    // Different ids seed different angles, so stars/plumes do not flare in
    // lockstep. (Extremely unlikely to collide; guards against a constant seed.)
    expect(sun.angleRad).not.toBeCloseTo(other.angleRad, 5)
  })

  it('the surface angle is stable over time for a given object', () => {
    const t0 = flareStateAt('earth', 7, 0)
    const t1 = flareStateAt('earth', 7, 3.5)
    expect(t1.angleRad).toBeCloseTo(t0.angleRad, 12)
  })

  it('intensity stays within [0,1] and the schedule is periodic', () => {
    const PERIOD = FLARE_PERIOD_YR
    for (let i = 0; i < 200; i++) {
      const t = i * 0.011
      const s = flareStateAt('sun', 99, t)
      expect(s.intensity).toBeGreaterThanOrEqual(0)
      expect(s.intensity).toBeLessThanOrEqual(1)
      // One full period later, the state repeats (deterministic recurrence).
      const s2 = flareStateAt('sun', 99, t + PERIOD)
      expect(s2.active).toBe(s.active)
      expect(s2.intensity).toBeCloseTo(s.intensity, 10)
    }
  })

  it('handles negative simTime (scrubbing before t=0) without NaN', () => {
    const s = flareStateAt('sun', 1337, -0.5)
    expect(Number.isFinite(s.intensity)).toBe(true)
    expect(s.intensity).toBeGreaterThanOrEqual(0)
    expect(s.intensity).toBeLessThanOrEqual(1)
  })
})
