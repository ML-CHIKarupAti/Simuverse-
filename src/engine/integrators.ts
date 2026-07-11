// Integrators — PLAN §8 1.4 (velocity-Verlet). Symplectic, fixed-dt.
//
// Velocity-Verlet in kick-drift-kick (KDK) form:
//   v ← v + ½·dt·a(x)        (half kick)
//   x ← x + dt·v             (drift)
//   a ← a(x)                 (recompute forces at new positions)
//   v ← v + ½·dt·a(x)        (half kick)
//
// PRECONDITION: store.acc holds a(store.pos) at entry (call computeForces once
// before the first step). The step leaves store.acc = a(new pos), so repeated
// calls chain with a SINGLE force evaluation per step — important for the long
// validation runs (1.8) and the bench (1.9). Mutates the store in place.

import { computeForces } from './forces'
import type { BodyArrays } from './state'
import { G as G_DEFAULT } from '../units/units'

export function verletStep(
  store: BodyArrays,
  dt: number,
  softening: number,
  gConst: number = G_DEFAULT,
): void {
  const { n, pos, vel, acc } = store
  const len = 3 * n
  const halfDt = 0.5 * dt

  // half kick
  for (let k = 0; k < len; k++) vel[k] += halfDt * acc[k]
  // drift
  for (let k = 0; k < len; k++) pos[k] += dt * vel[k]
  // recompute a(x) at the new positions (writes store.acc, same array as `acc`)
  computeForces(store, softening, gConst)
  // half kick with the updated acceleration
  for (let k = 0; k < len; k++) vel[k] += halfDt * acc[k]
}

// Yoshida 4th-order (PLAN §8 1.5) — a composition of THREE Verlet substeps with
// scaled sub-timesteps (w₁, w₀, w₁), a standard technique for building a
// higher-order symplectic integrator out of a lower-order one. The sub-steps
// sum to the full dt (2w₁ + w₀ = 1 exactly) and each verletStep call leaves
// store.acc primed for the next, so the three chain with no extra glue.
//
// w₁ = 1 / (2 − 2^{1/3}),  w₀ = −2^{1/3} / (2 − 2^{1/3})
const CBRT2 = Math.cbrt(2)
export const YOSHIDA_W1 = 1 / (2 - CBRT2)
export const YOSHIDA_W0 = -CBRT2 / (2 - CBRT2)

export function yoshida4Step(
  store: BodyArrays,
  dt: number,
  softening: number,
  gConst: number = G_DEFAULT,
): void {
  verletStep(store, YOSHIDA_W1 * dt, softening, gConst)
  verletStep(store, YOSHIDA_W0 * dt, softening, gConst)
  verletStep(store, YOSHIDA_W1 * dt, softening, gConst)
}
