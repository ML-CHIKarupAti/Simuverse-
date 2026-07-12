import { describe, it, expect } from 'vitest'
import { deriveOrbitEllipse } from '../src/render/orbitElements'
import { G } from '../src/units/units'
import * as bodyStore from '../src/engine/state'
import { computeForces } from '../src/engine/forces'
import { yoshida4Step } from '../src/engine/integrators'

// Same construction as demoScene.ts's `elliptical()`: start at perihelion with
// the vis-viva speed, so the derived elements should recover a and e exactly.
function perihelionState(
  massMsun: number,
  a: number,
  e: number,
): { pos: [number, number, number]; vel: [number, number, number]; mu: number } {
  const mu = G * (1 + massMsun)
  const rPeri = a * (1 - e)
  const vPeri = Math.sqrt((mu * (1 + e)) / (a * (1 - e)))
  return { pos: [rPeri, 0, 0], vel: [0, vPeri, 0], mu }
}

describe('deriveOrbitEllipse — recovers known construction parameters', () => {
  it('a circular orbit (e=0): centre at the focus, e≈0', () => {
    const { pos, vel, mu } = perihelionState(1e-6, 1, 0)
    const el = deriveOrbitEllipse(pos, vel, mu)
    expect(el.semiMajorAxis).toBeCloseTo(1, 9)
    expect(el.eccentricity).toBeCloseTo(0, 9)
    expect(el.centerX).toBeCloseTo(0, 9)
    expect(el.centerY).toBeCloseTo(0, 9)
  })

  it('a moderately eccentric orbit recovers a and e', () => {
    const { pos, vel, mu } = perihelionState(3e-6, 1.6, 0.55)
    const el = deriveOrbitEllipse(pos, vel, mu)
    expect(el.semiMajorAxis).toBeCloseTo(1.6, 9)
    expect(el.eccentricity).toBeCloseTo(0.55, 9)
  })

  it('periapsis along +X ⇒ rotation ≈ 0 and centre offset is along −X', () => {
    const { pos, vel, mu } = perihelionState(3e-6, 2.4, 0.4)
    const el = deriveOrbitEllipse(pos, vel, mu)
    expect(el.rotation).toBeCloseTo(0, 9)
    expect(el.centerX).toBeCloseTo(-2.4 * 0.4, 9) // −a·e
    expect(el.centerY).toBeCloseTo(0, 9)
  })

  it('the derived ellipse reproduces the exact periapsis distance', () => {
    const a = 1.3
    const e = 0.35
    const { pos, vel, mu } = perihelionState(2e-6, a, e)
    const el = deriveOrbitEllipse(pos, vel, mu)
    // Periapsis distance from the focus = a(1-e), independent of derivation.
    expect(el.semiMajorAxis * (1 - el.eccentricity)).toBeCloseTo(a * (1 - e), 9)
  })

  it('is invariant to the sample point (verified by propagating with the validated engine)', () => {
    // Sample at perihelion vs. partway around the SAME orbit — a, e, and
    // rotation are conserved for an unperturbed two-body orbit. Rather than
    // trust a hand-derived flight-path-angle formula for the second sample,
    // generate it by actually propagating the orbit with the Phase-1 engine
    // (already validated: Kepler period, energy/L drift, determinism).
    const massMsun = 2e-6
    const a = 1.4
    const e = 0.3
    const { pos, vel, mu } = perihelionState(massMsun, a, e)

    const atPeri = deriveOrbitEllipse(pos, vel, mu)

    const softening = 1e-6
    const store = bodyStore.fromBodies([
      { id: 'star', mass: 1, pos: [0, 0, 0], vel: [0, 0, 0] },
      { id: 'planet', mass: massMsun, pos, vel },
    ])
    computeForces(store, softening)
    for (let i = 0; i < 3000; i++) yoshida4Step(store, 1e-4, softening) // ~partway around

    const laterPos: [number, number, number] = [store.pos[3], store.pos[4], store.pos[5]]
    const laterVel: [number, number, number] = [store.vel[3], store.vel[4], store.vel[5]]
    const atLater = deriveOrbitEllipse(laterPos, laterVel, mu)

    expect(atLater.semiMajorAxis).toBeCloseTo(atPeri.semiMajorAxis, 3)
    expect(atLater.eccentricity).toBeCloseTo(atPeri.eccentricity, 3)
    expect(atLater.rotation).toBeCloseTo(atPeri.rotation, 3)
  })
})
