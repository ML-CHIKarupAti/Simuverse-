// Diagnostics — PLAN §8 1.6. The conserved-quantity computations that back the
// drift badge (§4.3) and the validation harness (§1.8):
//
//   Total energy   E = Σ ½ m v²  −  Σ_{i<j} G m_i m_j / √(r² + ε²)
//   Angular mom.   L = Σ m (r × v)          (about the origin)
//   Relative drift |ΔE/E₀|, |ΔL/L₀|         (vs the t=0 baseline)
//
// CRITICAL: the potential uses the SAME √(r²+ε²) softening as the force kernel
// (forces.ts). A softened force derives from a softened potential; pairing a
// softened force with an unsoftened potential would make "energy" drift even
// for a perfect integrator, and the drift diagnostic would be meaningless.

import type { BodyArrays } from './state'
import { G as G_DEFAULT } from '../units/units'

export interface Conserved {
  energy: number // total mechanical energy, canonical
  angularMomentum: number // |L| about the origin, canonical
}

export interface DriftResult {
  energyDriftRel: number // |ΔE / E₀|, dimensionless
  angularMomentumDriftRel: number // |ΔL / L₀|, dimensionless
}

export function totalEnergy(
  store: BodyArrays,
  softening: number,
  gConst: number = G_DEFAULT,
): number {
  const { n, mass, pos, vel } = store
  let ke = 0
  for (let i = 0; i < n; i++) {
    const vx = vel[3 * i]
    const vy = vel[3 * i + 1]
    const vz = vel[3 * i + 2]
    ke += 0.5 * mass[i] * (vx * vx + vy * vy + vz * vz)
  }
  let pe = 0
  const eps2 = softening * softening
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = pos[3 * j] - pos[3 * i]
      const dy = pos[3 * j + 1] - pos[3 * i + 1]
      const dz = pos[3 * j + 2] - pos[3 * i + 2]
      pe -= (gConst * mass[i] * mass[j]) / Math.sqrt(dx * dx + dy * dy + dz * dz + eps2)
    }
  }
  return ke + pe
}

// Total angular momentum vector about the origin: L = Σ m_i (r_i × v_i).
export function angularMomentumVector(
  store: BodyArrays,
): [number, number, number] {
  const { n, mass, pos, vel } = store
  let lx = 0
  let ly = 0
  let lz = 0
  for (let i = 0; i < n; i++) {
    const rx = pos[3 * i]
    const ry = pos[3 * i + 1]
    const rz = pos[3 * i + 2]
    const vx = vel[3 * i]
    const vy = vel[3 * i + 1]
    const vz = vel[3 * i + 2]
    const m = mass[i]
    lx += m * (ry * vz - rz * vy)
    ly += m * (rz * vx - rx * vz)
    lz += m * (rx * vy - ry * vx)
  }
  return [lx, ly, lz]
}

export function angularMomentumMagnitude(store: BodyArrays): number {
  const [lx, ly, lz] = angularMomentumVector(store)
  return Math.sqrt(lx * lx + ly * ly + lz * lz)
}

export function conserved(
  store: BodyArrays,
  softening: number,
  gConst: number = G_DEFAULT,
): Conserved {
  return {
    energy: totalEnergy(store, softening, gConst),
    angularMomentum: angularMomentumMagnitude(store),
  }
}

// Relative drift of the current conserved quantities vs the t=0 baseline. When
// a baseline is exactly 0 (e.g. a system with no net angular momentum), |Δ/X₀|
// is undefined, so we fall back to the absolute difference — finite and still
// meaningful, never Infinity/NaN.
export function relativeDrift(
  current: Conserved,
  baseline: Conserved,
): DriftResult {
  return {
    energyDriftRel: relDiff(current.energy, baseline.energy),
    angularMomentumDriftRel: relDiff(
      current.angularMomentum,
      baseline.angularMomentum,
    ),
  }
}

function relDiff(current: number, baseline: number): number {
  return baseline !== 0
    ? Math.abs((current - baseline) / baseline)
    : Math.abs(current - baseline)
}
