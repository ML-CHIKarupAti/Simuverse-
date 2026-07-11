import { describe, it, expect } from 'vitest'
import { blackbodyRGB } from '../src/render/blackbody'

describe('blackbody colour (PLAN §11 Phase 2 anchors)', () => {
  it('5772 K (Sun) is warm white with R ≥ G ≥ B', () => {
    const [r, g, b] = blackbodyRGB(5772)
    expect(r).toBeGreaterThanOrEqual(g)
    expect(g).toBeGreaterThanOrEqual(b)
    expect(r).toBeCloseTo(1, 5) // red rail at this temperature
    expect(b).toBeGreaterThan(0.7) // still fairly white, not orange
  })

  it('3000 K is red-dominant (red-orange)', () => {
    const [r, g, b] = blackbodyRGB(3000)
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b)
    expect(b).toBeLessThan(0.5) // little blue → orange, not white
  })

  it('30000 K is blue-dominant', () => {
    const [r, , b] = blackbodyRGB(30000)
    expect(b).toBeGreaterThan(r)
    expect(b).toBeCloseTo(1, 5) // blue rail
  })

  it('is monotonic in blue with temperature (cooler = less blue)', () => {
    const cool = blackbodyRGB(2000)[2]
    const mid = blackbodyRGB(5000)[2]
    const hot = blackbodyRGB(10000)[2]
    expect(cool).toBeLessThan(mid)
    expect(mid).toBeLessThan(hot)
  })

  it('clamps to the valid range and always returns [0,1] channels', () => {
    for (const k of [200, 1000, 5772, 40000, 100000]) {
      const rgb = blackbodyRGB(k)
      for (const c of rgb) {
        expect(c).toBeGreaterThanOrEqual(0)
        expect(c).toBeLessThanOrEqual(1)
      }
    }
    expect(blackbodyRGB(200)).toEqual(blackbodyRGB(1000)) // clamped low
    expect(blackbodyRGB(100000)).toEqual(blackbodyRGB(40000)) // clamped high
  })
})
