// Object catalog & derived values — PLAN §7.
// Default params + fidelity maps for each object type, and the derived-value
// definitions (plain formula, KaTeX source, and a canonical-units compute fn).
// This is the single source of truth for "what an object is by default" and
// "how a derived quantity is computed and written".

import type { ObjectType, Quantity, FidelityLevel } from './schema'
import { G, C_LIGHT } from '../units/units'

export interface CatalogEntry {
  defaultParams: Record<string, Quantity>
  defaultFidelity: Record<string, FidelityLevel>
}

// 1 Earth mass in solar masses (PLAN §7). Masses are stored in Msun because the
// unit enum has no Earth-mass unit; command input like `mass=1Me` is resolved
// by the insert-semantics layer (commands/insert.ts), which imports this.
export const EARTH_MASS_MSUN = 3.003e-6

export const CATALOG: Record<ObjectType, CatalogEntry> = {
  // 1 M☉, radius 1 R☉; gravity exact, surface visuals illustrative.
  star: {
    defaultParams: {
      mass: { value: 1, unit: 'Msun' },
      radius: { value: 1, unit: 'Rsun' },
    },
    defaultFidelity: { gravity: 'exact', visuals: 'illustrative' },
  },
  // 1 M⊕; gravity exact.
  planet: {
    defaultParams: { mass: { value: EARTH_MASS_MSUN, unit: 'Msun' } },
    defaultFidelity: { gravity: 'exact' },
  },
  // 0.0123 M⊕; gravity exact.
  moon: {
    defaultParams: {
      mass: { value: 0.0123 * EARTH_MASS_MSUN, unit: 'Msun' },
    },
    defaultFidelity: { gravity: 'exact' },
  },
  // 10 M☉ Newtonian point mass; gravity exact, accretion/lensing illustrative.
  blackhole: {
    defaultParams: { mass: { value: 10, unit: 'Msun' } },
    defaultFidelity: { gravity: 'exact', visuals: 'illustrative' },
  },
}

// Fresh (deep) copies so callers never mutate the shared catalog templates.
export function makeDefaultParams(type: ObjectType): Record<string, Quantity> {
  return structuredClone(CATALOG[type].defaultParams)
}

export function makeDefaultFidelity(
  type: ObjectType,
): Record<string, FidelityLevel> {
  return structuredClone(CATALOG[type].defaultFidelity)
}

// --- Derived values (PLAN §7) ----------------------------------------------
// Each definition carries a plain formula, its KaTeX source (rendered in the
// inspector, step 3.6), and a compute fn. All computes take and return
// CANONICAL units (AU, Msun, yr, AU/yr) — display conversion happens elsewhere.

export const DERIVED = {
  // Schwarzschild radius. M in Msun → r_s in AU. Anchor: 1 M☉ ≈ 1.97×10⁻⁸ AU.
  schwarzschildRadius: {
    name: 'Schwarzschild radius',
    formula: 'r_s = 2GM / c²',
    katex: 'r_s = \\dfrac{2GM}{c^2}',
    compute: (massMsun: number): number => (2 * G * massMsun) / C_LIGHT ** 2,
  },
  // Orbital period of a bound orbit. a in AU, total mass in Msun → T in yr.
  orbitalPeriod: {
    name: 'Orbital period',
    formula: 'T = 2π · √(a³ / G·M_total)',
    katex: 'T = 2\\pi\\sqrt{\\dfrac{a^3}{G\\,M_\\text{total}}}',
    compute: (aAU: number, totalMassMsun: number): number =>
      2 * Math.PI * Math.sqrt(aAU ** 3 / (G * totalMassMsun)),
  },
  // Escape velocity. M in Msun, r in AU → v in AU/yr.
  escapeVelocity: {
    name: 'Escape velocity',
    formula: 'v_esc = √(2GM / r)',
    katex: 'v_\\text{esc} = \\sqrt{\\dfrac{2GM}{r}}',
    compute: (massMsun: number, rAU: number): number =>
      Math.sqrt((2 * G * massMsun) / rAU),
  },
  // Hill radius. a in AU, e dimensionless, m & M in Msun → r_H in AU.
  hillRadius: {
    name: 'Hill radius',
    formula: 'r_H ≈ a(1 − e) · (m / 3M)^(1/3)',
    katex: 'r_H \\approx a(1-e)\\sqrt[3]{\\dfrac{m}{3M}}',
    compute: (
      aAU: number,
      e: number,
      mMsun: number,
      primaryMassMsun: number,
    ): number => aAU * (1 - e) * Math.cbrt(mMsun / (3 * primaryMassMsun)),
  },
}
