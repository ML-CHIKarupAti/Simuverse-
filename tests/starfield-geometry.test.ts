import { describe, it, expect } from 'vitest'
import { generateStarfield } from '../src/render/starfieldGeometry'

describe('generateStarfield — determinism (PLAN §2)', () => {
  it('the same seed produces bit-identical output', () => {
    const a = generateStarfield(500, 42)
    const b = generateStarfield(500, 42)
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions))
    expect(Array.from(a.sizes)).toEqual(Array.from(b.sizes))
    expect(Array.from(a.colors)).toEqual(Array.from(b.colors))
  })

  it('different seeds produce different fields', () => {
    const a = generateStarfield(500, 1)
    const b = generateStarfield(500, 2)
    expect(Array.from(a.positions)).not.toEqual(Array.from(b.positions))
  })
})

describe('generateStarfield — geometry validity', () => {
  it('returns arrays of the requested length', () => {
    const f = generateStarfield(1000, 7)
    expect(f.positions.length).toBe(3000)
    expect(f.sizes.length).toBe(1000)
    expect(f.colors.length).toBe(3000)
  })

  it('every star lies on the unit sphere', () => {
    const f = generateStarfield(2000, 7)
    for (let i = 0; i < 2000; i++) {
      const x = f.positions[3 * i]
      const y = f.positions[3 * i + 1]
      const z = f.positions[3 * i + 2]
      const r = Math.sqrt(x * x + y * y + z * z)
      expect(r).toBeCloseTo(1, 5)
    }
  })

  it('positions are not clustered at the poles (uniform sampling check)', () => {
    // With naive (theta, phi) sampling, |z| would skew toward the poles. With
    // correct uniform-sphere sampling, mean |z| should be close to 0.5.
    const f = generateStarfield(5000, 7)
    let sumAbsZ = 0
    for (let i = 0; i < 5000; i++) sumAbsZ += Math.abs(f.positions[3 * i + 2])
    expect(sumAbsZ / 5000).toBeCloseTo(0.5, 1)
  })

  it('sizes and colors are finite and in sane ranges', () => {
    const f = generateStarfield(3000, 7)
    for (let i = 0; i < 3000; i++) {
      expect(f.sizes[i]).toBeGreaterThan(0)
      expect(Number.isFinite(f.sizes[i])).toBe(true)
    }
    for (let i = 0; i < f.colors.length; i++) {
      expect(f.colors[i]).toBeGreaterThanOrEqual(0)
      expect(f.colors[i]).toBeLessThanOrEqual(1)
    }
  })
})
