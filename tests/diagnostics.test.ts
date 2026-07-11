import { describe, it, expect } from 'vitest'
import {
  totalEnergy,
  angularMomentumVector,
  angularMomentumMagnitude,
  conserved,
  relativeDrift,
} from '../src/engine/diagnostics'
import { verletStep, yoshida4Step } from '../src/engine/integrators'
import { computeForces } from '../src/engine/forces'
import * as bodyStore from '../src/engine/state'
import type { BodyArrays } from '../src/engine/state'
import type { EngineBody } from '../src/engine/protocol'
import { G } from '../src/units/units'

const EPS = 1e-6

function store(bodies: EngineBody[]): BodyArrays {
  return bodyStore.fromBodies(bodies)
}

describe('diagnostics — total energy', () => {
  it('two masses at rest: E = potential only ≈ −G/r', () => {
    const s = store([
      { id: 'a', mass: 1, pos: [0, 0, 0], vel: [0, 0, 0] },
      { id: 'b', mass: 1, pos: [1, 0, 0], vel: [0, 0, 0] },
    ])
    expect(totalEnergy(s, EPS)).toBeCloseTo(-G, 4) // −G·1·1/1
  })

  it('adds kinetic energy: E = ½mv² − G/r', () => {
    const s = store([
      { id: 'a', mass: 1, pos: [0, 0, 0], vel: [0, 0, 0] },
      { id: 'b', mass: 1, pos: [1, 0, 0], vel: [0, 1, 0] },
    ])
    expect(totalEnergy(s, EPS)).toBeCloseTo(0.5 - G, 4)
  })

  it('a circular orbit has E = −G·M·m/(2a) (virial)', () => {
    const M = 1
    const m = 1e-3
    const r = 1
    const v = Math.sqrt((G * M) / r) // circular speed of the test particle
    const s = store([
      { id: 'star', mass: M, pos: [0, 0, 0], vel: [0, 0, 0] },
      { id: 'planet', mass: m, pos: [r, 0, 0], vel: [0, v, 0] },
    ])
    expect(totalEnergy(s, EPS)).toBeCloseTo((-G * M * m) / (2 * r), 6)
  })
})

describe('diagnostics — angular momentum', () => {
  it('L = m·(r × v) for a single body', () => {
    const s = store([{ id: 'a', mass: 2, pos: [1, 0, 0], vel: [0, 3, 0] }])
    expect(angularMomentumVector(s)).toEqual([0, 0, 6]) // 2·(1·3) about z
    expect(angularMomentumMagnitude(s)).toBeCloseTo(6, 12)
  })

  it('purely radial motion carries no angular momentum', () => {
    const s = store([{ id: 'a', mass: 1, pos: [1, 0, 0], vel: [5, 0, 0] }])
    expect(angularMomentumMagnitude(s)).toBeCloseTo(0, 12)
  })

  it('sums over bodies', () => {
    const s = store([
      { id: 'a', mass: 1, pos: [1, 0, 0], vel: [0, 1, 0] }, // +1 z
      { id: 'b', mass: 1, pos: [0, 1, 0], vel: [-1, 0, 0] }, // +1 z
    ])
    expect(angularMomentumVector(s)[2]).toBeCloseTo(2, 12)
  })
})

describe('diagnostics — relative drift', () => {
  it('computes |ΔE/E₀| and |ΔL/L₀|', () => {
    const d = relativeDrift(
      { energy: -G * 1.0001, angularMomentum: 6.0006 },
      { energy: -G, angularMomentum: 6 },
    )
    expect(d.energyDriftRel).toBeCloseTo(1e-4, 6)
    expect(d.angularMomentumDriftRel).toBeCloseTo(1e-4, 6)
  })

  it('falls back to absolute difference when a baseline is zero (no NaN/Inf)', () => {
    const d = relativeDrift(
      { energy: 0.001, angularMomentum: 0.002 },
      { energy: 0, angularMomentum: 0 },
    )
    expect(Number.isFinite(d.energyDriftRel)).toBe(true)
    expect(d.energyDriftRel).toBeCloseTo(0.001, 12)
    expect(d.angularMomentumDriftRel).toBeCloseTo(0.002, 12)
  })
})

describe('diagnostics — detects conservation under integration', () => {
  it('sees near-zero drift over an integrated eccentric orbit (Yoshida4)', () => {
    const M = 1
    const m = 1e-9
    const a = 1
    const e = 0.6
    const rPeri = a * (1 - e)
    const vPeri = Math.sqrt((G * (M + m) * (1 + e)) / (a * (1 - e)))
    const s = store([
      { id: 'star', mass: M, pos: [0, 0, 0], vel: [0, 0, 0] },
      { id: 'planet', mass: m, pos: [rPeri, 0, 0], vel: [0, vPeri, 0] },
    ])
    const baseline = conserved(s, EPS)
    computeForces(s, EPS)
    for (let i = 0; i < 20_000; i++) yoshida4Step(s, 1e-4, EPS)
    const drift = relativeDrift(conserved(s, EPS), baseline)
    expect(drift.energyDriftRel).toBeLessThan(1e-6)
    expect(drift.angularMomentumDriftRel).toBeLessThan(1e-9)
  })

  it('sees larger energy drift for lower-order Verlet on the same orbit', () => {
    const mk = (): BodyArrays =>
      store([
        { id: 'star', mass: 1, pos: [0, 0, 0], vel: [0, 0, 0] },
        {
          id: 'planet',
          mass: 1e-9,
          pos: [0.4, 0, 0],
          vel: [0, Math.sqrt((G * 1.000000001 * 1.6) / 0.4), 0],
        },
      ])
    const v = mk()
    const baseline = conserved(v, EPS)
    computeForces(v, EPS)
    for (let i = 0; i < 20_000; i++) verletStep(v, 1e-4, EPS)
    const drift = relativeDrift(conserved(v, EPS), baseline)
    // Still small at 2 orbits, but strictly worse than Yoshida4's ~1e-14.
    expect(drift.energyDriftRel).toBeGreaterThan(1e-13)
  })
})
