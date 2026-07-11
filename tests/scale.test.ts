import { describe, it, expect } from 'vitest'
import {
  RENDER_SCALE,
  REBASE_THRESHOLD,
  visualRadius,
  worldToRender,
  needsRebase,
  rebase,
} from '../src/render/scale'

const EARTH_MASS_MSUN = 3.003e-6

describe('visual radii (display-only, PLAN §2.3)', () => {
  it('star: 1.4·(M/M☉)^0.25', () => {
    expect(visualRadius('star', 1)).toBeCloseTo(1.4, 12)
    expect(visualRadius('star', 16)).toBeCloseTo(2.8, 12) // 16^0.25 = 2
  })
  it('planet: 0.5·(M/M⊕)^0.15', () => {
    expect(visualRadius('planet', EARTH_MASS_MSUN)).toBeCloseTo(0.5, 12)
  })
  it('moon: fixed 0.3', () => {
    expect(visualRadius('moon', 3.7e-8)).toBe(0.3)
  })
  it('blackhole: 1.0·(M/10 M☉)^0.25', () => {
    expect(visualRadius('blackhole', 10)).toBeCloseTo(1.0, 12)
    expect(visualRadius('blackhole', 160)).toBeCloseTo(2.0, 12) // 16^0.25 = 2
  })
})

describe('worldToRender', () => {
  it('scales AU → render units relative to the origin', () => {
    expect(worldToRender([1, 0, 0], [0, 0, 0])).toEqual([RENDER_SCALE, 0, 0])
    expect(worldToRender([2, -1, 0.5], [0, 0, 0])).toEqual([20, -10, 5])
  })
  it('subtracts the floating-origin offset first', () => {
    expect(worldToRender([100, 0, 0], [99, 0, 0])).toEqual([10, 0, 0])
  })
})

describe('floating origin rebase', () => {
  it('rebases only past the threshold', () => {
    expect(needsRebase([REBASE_THRESHOLD - 1, 0, 0])).toBe(false)
    expect(needsRebase([REBASE_THRESHOLD + 1, 0, 0])).toBe(true)
    expect(needsRebase([4000, 4000, 0])).toBe(true) // 5657 > 5000
  })

  it('recentres the origin and returns the target-cancelling shift', () => {
    const target: [number, number, number] = [6000, 0, 0] // render units
    const { originAU, shift } = rebase([0, 0, 0], target)
    // origin absorbs the shift in AU (6000 render units / 10 = 600 AU)
    expect(originAU).toEqual([600, 0, 0])
    expect(shift).toEqual([6000, 0, 0])
    // after subtracting shift, the target returns to ~0
    expect(target[0] - shift[0]).toBe(0)
  })

  it('a point stays put across a rebase (view is unchanged)', () => {
    // A body at 605 AU, origin 0 → render 6050 (far). Rebase to origin 600 →
    // render 50, but the camera/target also shift by the same 6000, so the
    // body's screen position is identical.
    const bodyAU: [number, number, number] = [605, 0, 0]
    const before = worldToRender(bodyAU, [0, 0, 0]) // [6050,0,0]
    const { originAU, shift } = rebase([0, 0, 0], [6000, 0, 0])
    const after = worldToRender(bodyAU, originAU) // [50,0,0]
    expect(after[0]).toBe(before[0] - shift[0]) // 50 === 6050 - 6000
  })
})
