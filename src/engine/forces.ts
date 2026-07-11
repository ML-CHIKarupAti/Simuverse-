// Force kernel — PLAN §8 1.3. Pairwise Newtonian gravity with Plummer softening:
//
//   a_i = Σ_{j≠i} G m_j (r_j − r_i) / (|r_j − r_i|² + ε²)^{3/2}
//
// Softening ε (config.softening, default 1e-6 AU) removes the 1/r² singularity
// at tiny separations. We accumulate each pair once and apply it to both bodies
// via Newton's third law, so the loop is n(n-1)/2, not n². This is the engine's
// hot path: it WRITES accelerations in place (no per-call allocation) so the
// integrator (1.4/1.5) can call it every substep.

import { G as G_DEFAULT } from '../units/units'
import type { BodyArrays } from './state'

// Fill `acc` (length 3n) with the gravitational acceleration of each body given
// `mass` (n) and `pos` (3n). All canonical units (AU, Msun, yr).
export function computeAccelerations(
  n: number,
  mass: Float64Array,
  pos: Float64Array,
  acc: Float64Array,
  softening: number,
  gConst: number = G_DEFAULT,
): void {
  acc.fill(0)
  const eps2 = softening * softening
  for (let i = 0; i < n; i++) {
    const ix = 3 * i
    for (let j = i + 1; j < n; j++) {
      const jx = 3 * j
      const dx = pos[jx] - pos[ix]
      const dy = pos[jx + 1] - pos[ix + 1]
      const dz = pos[jx + 2] - pos[ix + 2]
      const r2 = dx * dx + dy * dy + dz * dz + eps2
      const inv = 1 / (r2 * Math.sqrt(r2)) // (|d|² + ε²)^{-3/2}
      const gInv = gConst * inv
      // a_i gets +G·m_j·d/den; a_j gets −G·m_i·d/den (equal & opposite force).
      const fi = gInv * mass[j]
      const fj = gInv * mass[i]
      acc[ix] += fi * dx
      acc[ix + 1] += fi * dy
      acc[ix + 2] += fi * dz
      acc[jx] -= fj * dx
      acc[jx + 1] -= fj * dy
      acc[jx + 2] -= fj * dz
    }
  }
}

// Recompute a store's accelerations in place (mutates store.acc). Convenience
// for the integrator, which owns a working store during a step.
export function computeForces(
  store: BodyArrays,
  softening: number,
  gConst: number = G_DEFAULT,
): void {
  computeAccelerations(
    store.n,
    store.mass,
    store.pos,
    store.acc,
    softening,
    gConst,
  )
}
