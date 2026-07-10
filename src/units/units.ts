// Units & constants — PLAN §5.
// Internal math is ALWAYS canonical: AU (length), Msun (mass), yr (time),
// and AU/yr (velocity). This module is the only place unit conversion happens;
// stored/display quantities carry a { value, unit } and convert through here.

import type { Unit, Quantity } from '../scene/schema'

// --- Canonical constants (PLAN §5) -----------------------------------------

// Gravitational constant in canonical units. G = 4π² exactly by Kepler's third
// law for AU·Msun·yr (PLAN §5 lists the decimal ≈ 39.4784176). Using 4π²
// directly is the exact value the Kepler/determinism tests rely on.
export const G = 4 * Math.PI ** 2

// Speed of light in AU/yr (PLAN §5).
export const C_LIGHT = 63197.79

// Display-conversion anchors (PLAN §5). Julian year.
export const AU_IN_KM = 1.495978707e8 // 1 AU = 1.495978707×10¹¹ m = ×10⁸ km
export const MSUN_IN_KG = 1.98892e30 // 1 Msun in kg
export const YR_IN_S = 3.15576e7 // 1 Julian year in seconds
export const DAY_IN_S = 86400 // 1 day in seconds

// --- Unit → canonical factors ----------------------------------------------
// Multiply a value in `unit` by its factor to get the canonical value for that
// unit's dimension. Every factor is derived from the base constants above so
// there is no hand-transcribed arithmetic to get wrong. Typed as a complete
// Record<Unit, …> so a missing unit is a compile error.

export const UNIT_TO_CANONICAL: Record<Unit, number> = {
  // length → AU
  AU: 1,
  km: 1 / AU_IN_KM,
  // mass → Msun
  Msun: 1,
  kg: 1 / MSUN_IN_KG,
  // time → yr
  yr: 1,
  s: 1 / YR_IN_S,
  days: DAY_IN_S / YR_IN_S,
  // velocity → AU/yr
  'm/s': YR_IN_S / (AU_IN_KM * 1000),
  'km/s': YR_IN_S / AU_IN_KM,
}

// Convert a stored quantity to its canonical value (AU, Msun, yr, or AU/yr
// depending on the unit's dimension).
export function toCanonical(q: Quantity): number {
  return q.value * UNIT_TO_CANONICAL[q.unit]
}

// Convert a canonical value into `unit`. Caller is responsible for passing a
// canonical value of the same dimension as `unit`.
export function fromCanonical(canonicalValue: number, unit: Unit): number {
  return canonicalValue / UNIT_TO_CANONICAL[unit]
}

// --- Display formatting (PLAN §8.5: 3 significant figures + unit) -----------

export function formatValue(value: number, sigFigs = 3): string {
  if (!Number.isFinite(value)) return String(value)
  if (value === 0) return (0).toFixed(sigFigs - 1)
  return value.toPrecision(sigFigs)
}

export function formatQuantity(q: Quantity, sigFigs = 3): string {
  return `${formatValue(q.value, sigFigs)} ${q.unit}`
}
