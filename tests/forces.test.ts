import { describe, it, expect } from 'vitest'
import { computeForces, computeAccelerations } from '../src/engine/forces'
import * as bodyStore from '../src/engine/state'
import type { EngineBody } from '../src/engine/protocol'
import { G } from '../src/units/units'

function body(
  id: string,
  pos: [number, number, number],
  mass = 1,
): EngineBody {
  return { id, mass, pos, vel: [0, 0, 0] }
}

// Negligible softening for the Newtonian-limit checks (ε² ≪ r²).
const EPS = 1e-9

describe('force kernel — degenerate cases', () => {
  it('a single body feels no self-force', () => {
    const s = bodyStore.fromBodies([body('a', [0, 0, 0])])
    computeForces(s, EPS)
    expect(Array.from(s.acc)).toEqual([0, 0, 0])
  })

  it('zero bodies is a no-op', () => {
    const s = bodyStore.fromBodies([])
    computeForces(s, EPS)
    expect(s.acc.length).toBe(0)
  })
})

describe('force kernel — two-body Newtonian limit', () => {
  it('equal masses at 1 AU give ±G along the axis', () => {
    const s = bodyStore.fromBodies([
      body('a', [0, 0, 0], 1),
      body('b', [1, 0, 0], 1),
    ])
    computeForces(s, EPS)
    // a pulled toward b (+x) by G·m_b/r² = G; b pulled toward a (−x) by G.
    expect(s.acc[0]).toBeCloseTo(G, 6)
    expect(s.acc[3]).toBeCloseTo(-G, 6)
    expect([s.acc[1], s.acc[2], s.acc[4], s.acc[5]]).toEqual([0, 0, 0, 0])
  })

  it('acceleration falls off as 1/r²', () => {
    const near = bodyStore.fromBodies([body('a', [0, 0, 0]), body('b', [1, 0, 0])])
    const far = bodyStore.fromBodies([body('a', [0, 0, 0]), body('b', [2, 0, 0])])
    computeForces(near, EPS)
    computeForces(far, EPS)
    // r doubles → acceleration quarters.
    expect(Math.abs(near.acc[0]) / Math.abs(far.acc[0])).toBeCloseTo(4, 6)
  })

  it("obeys Newton's third law for unequal masses (m_i·a_i = m_j·a_j)", () => {
    const mSun = 1
    const mEarth = 3.003e-6
    const s = bodyStore.fromBodies([
      body('sun', [0, 0, 0], mSun),
      body('earth', [1, 0, 0], mEarth),
    ])
    computeForces(s, EPS)
    const forceSun = mSun * Math.abs(s.acc[0])
    const forceEarth = mEarth * Math.abs(s.acc[3])
    expect(forceSun).toBeCloseTo(forceEarth, 12)
    // The Sun barely moves; Earth feels ~G.
    expect(Math.abs(s.acc[3])).toBeCloseTo(G, 6)
  })
})

describe('force kernel — superposition & softening', () => {
  it('symmetric neighbours cancel (linear superposition)', () => {
    const s = bodyStore.fromBodies([
      body('mid', [0, 0, 0], 1),
      body('left', [-1, 0, 0], 1),
      body('right', [1, 0, 0], 1),
    ])
    computeForces(s, EPS)
    // The middle body is pulled equally both ways → net zero.
    expect(s.acc[0]).toBeCloseTo(0, 12)
    expect(s.acc[1]).toBeCloseTo(0, 12)
    expect(s.acc[2]).toBeCloseTo(0, 12)
  })

  it('softening caps the acceleration at tiny separation', () => {
    const mass = new Float64Array([1, 1])
    const r = 1e-8
    const pos = new Float64Array([0, 0, 0, r, 0, 0]) // nearly coincident
    const soft = new Float64Array(6)
    const hard = new Float64Array(6)
    computeAccelerations(2, mass, pos, soft, 1e-3) // ε ≫ r
    computeAccelerations(2, mass, pos, hard, 0) // unsoftened Newtonian ~ G/r²
    for (const a of soft) expect(Number.isFinite(a)).toBe(true)
    // Unsoftened blows up as 1/r²; softening keeps it bounded and far smaller.
    expect(Math.abs(soft[0])).toBeLessThan(Math.abs(hard[0]))
    expect(Math.abs(hard[0])).toBeGreaterThan(1e15 * G) // blows up ~ G/r², r=1e-8
  })
})
