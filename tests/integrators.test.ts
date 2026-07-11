import { describe, it, expect } from 'vitest'
import { verletStep } from '../src/engine/integrators'
import { computeForces } from '../src/engine/forces'
import * as bodyStore from '../src/engine/state'
import type { BodyArrays } from '../src/engine/state'
import type { EngineBody } from '../src/engine/protocol'
import { G } from '../src/units/units'

const DT = 1e-4 // yr (PLAN §1.4 default)
const EPS = 1e-6 // AU (PLAN §1.3 default softening)
const STEPS_PER_ORBIT = 10_000 // 1 yr / dt

// A near-test-particle circular orbit: a heavy central mass and a light planet
// at 1 AU with circular speed v = √(G(M+m)/r). Period ≈ 1 yr (√G = 2π).
function circularSystem(): BodyArrays {
  const M = 1
  const m = 1e-9
  const r = 1
  const v = Math.sqrt((G * (M + m)) / r)
  const bodies: EngineBody[] = [
    { id: 'star', mass: M, pos: [0, 0, 0], vel: [0, 0, 0] },
    { id: 'planet', mass: m, pos: [r, 0, 0], vel: [0, v, 0] },
  ]
  return bodyStore.fromBodies(bodies)
}

function planetRadius(s: BodyArrays): number {
  const dx = s.pos[3] - s.pos[0]
  const dy = s.pos[4] - s.pos[1]
  const dz = s.pos[5] - s.pos[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function totalEnergy(s: BodyArrays, softening: number): number {
  let ke = 0
  for (let i = 0; i < s.n; i++) {
    const vx = s.vel[3 * i]
    const vy = s.vel[3 * i + 1]
    const vz = s.vel[3 * i + 2]
    ke += 0.5 * s.mass[i] * (vx * vx + vy * vy + vz * vz)
  }
  let pe = 0
  const eps2 = softening * softening
  for (let i = 0; i < s.n; i++) {
    for (let j = i + 1; j < s.n; j++) {
      const dx = s.pos[3 * j] - s.pos[3 * i]
      const dy = s.pos[3 * j + 1] - s.pos[3 * i + 1]
      const dz = s.pos[3 * j + 2] - s.pos[3 * i + 2]
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz + eps2)
      pe -= (G * s.mass[i] * s.mass[j]) / r
    }
  }
  return ke + pe
}

function totalMomentum(s: BodyArrays): [number, number, number] {
  const p: [number, number, number] = [0, 0, 0]
  for (let i = 0; i < s.n; i++) {
    p[0] += s.mass[i] * s.vel[3 * i]
    p[1] += s.mass[i] * s.vel[3 * i + 1]
    p[2] += s.mass[i] * s.vel[3 * i + 2]
  }
  return p
}

function run(s: BodyArrays, steps: number): void {
  computeForces(s, EPS) // prime a(x₀)
  for (let i = 0; i < steps; i++) verletStep(s, DT, EPS)
}

describe('velocity-Verlet — circular orbit', () => {
  it('returns to its starting point after one period', () => {
    const s = circularSystem()
    run(s, STEPS_PER_ORBIT)
    const dx = s.pos[3] - 1
    const dy = s.pos[4] - 0
    expect(Math.hypot(dx, dy)).toBeLessThan(0.01) // within 0.01 AU of start
  })

  it('keeps the orbital radius ~1 AU throughout', () => {
    const s = circularSystem()
    computeForces(s, EPS)
    for (let i = 0; i < STEPS_PER_ORBIT; i++) {
      verletStep(s, DT, EPS)
      if (i % 1000 === 0) expect(planetRadius(s)).toBeCloseTo(1, 2)
    }
  })
})

describe('velocity-Verlet — conservation', () => {
  it('conserves energy to < 1e-4 (relative) over two orbits', () => {
    const s = circularSystem()
    computeForces(s, EPS)
    const e0 = totalEnergy(s, EPS)
    for (let i = 0; i < 2 * STEPS_PER_ORBIT; i++) verletStep(s, DT, EPS)
    const e1 = totalEnergy(s, EPS)
    expect(Math.abs((e1 - e0) / e0)).toBeLessThan(1e-4)
  })

  it('conserves total linear momentum (no external forces)', () => {
    const s = circularSystem()
    const p0 = totalMomentum(s)
    run(s, STEPS_PER_ORBIT)
    const p1 = totalMomentum(s)
    expect(p1[0]).toBeCloseTo(p0[0], 12)
    expect(p1[1]).toBeCloseTo(p0[1], 12)
    expect(p1[2]).toBeCloseTo(p0[2], 12)
  })
})

describe('velocity-Verlet — determinism', () => {
  it('two identical runs produce bit-identical state', () => {
    const a = circularSystem()
    const b = circularSystem()
    run(a, 5000)
    run(b, 5000)
    expect(Array.from(a.pos)).toEqual(Array.from(b.pos))
    expect(Array.from(a.vel)).toEqual(Array.from(b.vel))
  })
})
