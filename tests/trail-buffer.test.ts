import { describe, it, expect } from 'vitest'
import { appendTrailPoint, fillTrailFade } from '../src/render/trailBuffer'

describe('appendTrailPoint', () => {
  it('fills up to capacity, incrementing the count', () => {
    const cap = 3
    const pos = new Float32Array(cap * 3)
    let n = 0
    n = appendTrailPoint(pos, n, cap, 1, 2, 3)
    n = appendTrailPoint(pos, n, cap, 4, 5, 6)
    expect(n).toBe(2)
    expect(Array.from(pos.slice(0, 6))).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('drops the oldest and appends newest once full (ring), constant length', () => {
    const cap = 3
    const pos = new Float32Array(cap * 3)
    let n = 0
    for (const x of [1, 2, 3]) n = appendTrailPoint(pos, n, cap, x, 0, 0)
    expect(n).toBe(3)
    expect(Array.from(pos)).toEqual([1, 0, 0, 2, 0, 0, 3, 0, 0])

    n = appendTrailPoint(pos, n, cap, 4, 0, 0) // full → drop the "1"
    expect(n).toBe(3) // count never exceeds cap
    expect(pos.length).toBe(9) // buffer never grows
    expect(Array.from(pos)).toEqual([2, 0, 0, 3, 0, 0, 4, 0, 0])

    appendTrailPoint(pos, n, cap, 5, 0, 0)
    expect(Array.from(pos)).toEqual([3, 0, 0, 4, 0, 0, 5, 0, 0])
  })

  it('never allocates a new buffer across many appends (memory stable)', () => {
    const cap = 4
    const pos = new Float32Array(cap * 3)
    let n = 0
    for (let i = 0; i < 10_000; i++) n = appendTrailPoint(pos, n, cap, i, 0, 0)
    expect(pos.length).toBe(cap * 3)
    expect(n).toBe(cap)
    // holds the last `cap` points
    expect(Array.from(pos)).toEqual([9996, 0, 0, 9997, 0, 0, 9998, 0, 0, 9999, 0, 0])
  })
})

describe('fillTrailFade', () => {
  it('fades from dim tail (oldest) to full head (newest)', () => {
    const colors = new Float32Array(3 * 3)
    fillTrailFade(colors, 3, 1, 0.5, 0.25)
    // index 0 (oldest) → f = 1/3; index 2 (newest) → f = 1 (full colour)
    expect(colors[0]).toBeCloseTo(1 / 3, 6)
    expect(colors[6]).toBeCloseTo(1, 6)
    expect(colors[7]).toBeCloseTo(0.5, 6)
    expect(colors[8]).toBeCloseTo(0.25, 6)
  })
})
