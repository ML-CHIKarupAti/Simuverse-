import { describe, it, expect } from 'vitest'
import {
  CATALOG,
  makeDefaultParams,
  makeDefaultFidelity,
  DERIVED,
} from '../src/scene/catalog'
import { SimObjectSchema, type ObjectType } from '../src/scene/schema'
import { fromCanonical } from '../src/units/units'

const TYPES: ObjectType[] = ['star', 'planet', 'moon', 'blackhole']

function buildObject(type: ObjectType) {
  return {
    id: 'obj00000000000000000001',
    type,
    name: `test-${type}`,
    params: makeDefaultParams(type),
    state: { pos: [0, 0, 0], vel: [0, 0, 0] },
    fidelity: makeDefaultFidelity(type),
    provenance: { source: 'preset' as const },
  }
}

describe('catalog defaults', () => {
  it('every type has a mass and validates as a SimObject', () => {
    for (const type of TYPES) {
      const params = makeDefaultParams(type)
      expect(params.mass).toBeDefined()
      expect(SimObjectSchema.safeParse(buildObject(type)).success).toBe(true)
    }
  })

  it('matches the §7 default masses', () => {
    expect(CATALOG.star.defaultParams.mass).toEqual({ value: 1, unit: 'Msun' })
    expect(CATALOG.blackhole.defaultParams.mass).toEqual({
      value: 10,
      unit: 'Msun',
    })
    expect(CATALOG.planet.defaultParams.mass.value).toBeCloseTo(3.003e-6, 12)
    expect(CATALOG.moon.defaultParams.mass.value).toBeCloseTo(
      0.0123 * 3.003e-6,
      14,
    )
  })

  it('stores the star radius as 1 R☉', () => {
    expect(CATALOG.star.defaultParams.radius).toEqual({ value: 1, unit: 'Rsun' })
  })

  it('matches the §7 fidelity maps', () => {
    expect(makeDefaultFidelity('star')).toEqual({
      gravity: 'exact',
      visuals: 'illustrative',
    })
    expect(makeDefaultFidelity('planet')).toEqual({ gravity: 'exact' })
    expect(makeDefaultFidelity('moon')).toEqual({ gravity: 'exact' })
    expect(makeDefaultFidelity('blackhole')).toEqual({
      gravity: 'exact',
      visuals: 'illustrative',
    })
  })

  it('returns fresh copies (mutation does not leak into the catalog)', () => {
    const params = makeDefaultParams('star')
    params.mass.value = 999
    expect(CATALOG.star.defaultParams.mass.value).toBe(1)
  })
})

describe('derived values', () => {
  it('r_s(1 M☉) ≈ 2.95 km and r_s(10 M☉) ≈ 29.5 km', () => {
    const rs1 = fromCanonical(DERIVED.schwarzschildRadius.compute(1), 'km')
    const rs10 = fromCanonical(DERIVED.schwarzschildRadius.compute(10), 'km')
    expect(rs1).toBeCloseTo(2.95, 1)
    expect(rs10).toBeCloseTo(29.5, 0)
  })

  it('orbital period a=1 AU about 1 M☉ = 1 yr', () => {
    expect(DERIVED.orbitalPeriod.compute(1, 1)).toBeCloseTo(1, 6)
  })

  it('escape velocity at 1 AU about 1 M☉ = √2 × circular speed (2π)', () => {
    expect(DERIVED.escapeVelocity.compute(1, 1)).toBeCloseTo(
      Math.SQRT2 * 2 * Math.PI,
      9,
    )
  })

  it("Earth's Hill radius ≈ 0.0098 AU", () => {
    const rH = DERIVED.hillRadius.compute(1, 0.0167, 3.003e-6, 1)
    expect(rH).toBeCloseTo(0.0098, 3)
  })

  it('every derived definition has a non-empty KaTeX string', () => {
    for (const def of Object.values(DERIVED)) {
      expect(def.katex.length).toBeGreaterThan(0)
      expect(def.formula.length).toBeGreaterThan(0)
    }
  })
})
