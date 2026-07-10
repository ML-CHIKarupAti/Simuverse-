import { describe, it, expect } from 'vitest'
import {
  G,
  C_LIGHT,
  AU_IN_KM,
  MSUN_IN_KG,
  toCanonical,
  fromCanonical,
  formatValue,
  formatQuantity,
} from '../src/units/units'

describe('canonical constants', () => {
  it('G = 4π² ≈ 39.4784176', () => {
    expect(G).toBeCloseTo(39.4784176, 5)
  })
  it('c = 63,197.79 AU/yr', () => {
    expect(C_LIGHT).toBe(63197.79)
  })
})

describe('length: km ↔ AU', () => {
  it('1 AU is AU_IN_KM kilometres', () => {
    expect(fromCanonical(toCanonical({ value: 1, unit: 'AU' }), 'km')).toBeCloseTo(
      AU_IN_KM,
      2,
    )
  })
  it('round-trips 1 AU → km → AU', () => {
    const km = fromCanonical(toCanonical({ value: 1, unit: 'AU' }), 'km')
    expect(toCanonical({ value: km, unit: 'km' })).toBeCloseTo(1, 12)
  })
})

describe('length: m and Rsun (Option B additions)', () => {
  it('1 AU is AU_IN_KM·1000 metres', () => {
    expect(fromCanonical(toCanonical({ value: 1, unit: 'AU' }), 'm')).toBeCloseTo(
      AU_IN_KM * 1000,
      -3,
    )
  })
  it('round-trips 1 AU → m → AU', () => {
    const m = fromCanonical(toCanonical({ value: 1, unit: 'AU' }), 'm')
    expect(toCanonical({ value: m, unit: 'm' })).toBeCloseTo(1, 12)
  })
  it('1 R☉ ≈ 6.957×10⁵ km', () => {
    const km = fromCanonical(toCanonical({ value: 1, unit: 'Rsun' }), 'km')
    expect(km).toBeCloseTo(6.957e5, 0)
  })
  it('round-trips 1 R☉ → AU → R☉', () => {
    const au = toCanonical({ value: 1, unit: 'Rsun' })
    expect(fromCanonical(au, 'Rsun')).toBeCloseTo(1, 12)
  })
})

describe('mass: kg ↔ M☉', () => {
  it('1 M☉ is MSUN_IN_KG kilograms', () => {
    expect(
      fromCanonical(toCanonical({ value: 1, unit: 'Msun' }), 'kg'),
    ).toBeCloseTo(MSUN_IN_KG, -20) // huge magnitude → loose absolute tolerance
  })
  it('round-trips 1 M☉ → kg → M☉', () => {
    const kg = fromCanonical(toCanonical({ value: 1, unit: 'Msun' }), 'kg')
    expect(toCanonical({ value: kg, unit: 'kg' })).toBeCloseTo(1, 12)
  })
})

describe('time', () => {
  it('365.25 days = 1 yr (Julian)', () => {
    expect(toCanonical({ value: 365.25, unit: 'days' })).toBeCloseTo(1, 12)
  })
  it('3.15576e7 s = 1 yr', () => {
    expect(toCanonical({ value: 3.15576e7, unit: 's' })).toBeCloseTo(1, 12)
  })
})

describe('velocity', () => {
  // Earth's mean orbital speed ≈ 29.78 km/s; a circular 1 AU orbit about 1 M☉
  // has speed 2π AU/yr. This cross-checks the km/s → AU/yr factor.
  it("Earth's ~29.78 km/s ≈ 2π AU/yr", () => {
    expect(toCanonical({ value: 29.78, unit: 'km/s' })).toBeCloseTo(
      2 * Math.PI,
      2,
    )
  })
  it('1000 m/s = 1 km/s in canonical', () => {
    expect(toCanonical({ value: 1000, unit: 'm/s' })).toBeCloseTo(
      toCanonical({ value: 1, unit: 'km/s' }),
      12,
    )
  })
})

describe('Schwarzschild radius anchor (PLAN §5)', () => {
  // r_s = 2GM/c². For M = 1 M☉ this should be ≈ 1.97×10⁻⁸ AU ≈ 2.95 km.
  it('r_s(1 M☉) ≈ 2.95 km', () => {
    const M = 1 // Msun
    const rsAU = (2 * G * M) / C_LIGHT ** 2
    expect(rsAU).toBeCloseTo(1.97e-8, 9)
    const rsKm = fromCanonical(rsAU, 'km')
    expect(rsKm).toBeCloseTo(2.95, 1)
  })
})

describe('display formatting (3 sig figs + unit)', () => {
  it('formats to 3 significant figures', () => {
    expect(formatValue(1)).toBe('1.00')
    expect(formatValue(2.9574)).toBe('2.96')
    expect(formatValue(0)).toBe('0.00')
  })
  it('appends the unit suffix', () => {
    expect(formatQuantity({ value: 1, unit: 'AU' })).toBe('1.00 AU')
  })
})
