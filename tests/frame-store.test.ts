import { describe, it, expect, beforeEach } from 'vitest'
import {
  useFrameStore,
  interpolationAlpha,
  lerpPositions,
  type Frame,
} from '../src/state/frameStore'

function frame(simTime: number, positions: number[]): Frame {
  return { simTime, positions: new Float64Array(positions) }
}

describe('interpolationAlpha', () => {
  it('is 0 at nextArrival (renders one interval behind)', () => {
    expect(interpolationAlpha(100, 200, 200)).toBe(0)
  })
  it('sweeps 0→1 over one observed interval', () => {
    expect(interpolationAlpha(100, 200, 250)).toBeCloseTo(0.5, 12) // span 100, +50
    expect(interpolationAlpha(100, 200, 300)).toBe(1)
  })
  it('clamps past one interval and handles a non-positive span', () => {
    expect(interpolationAlpha(100, 200, 999)).toBe(1)
    expect(interpolationAlpha(200, 200, 250)).toBe(0) // span 0
  })
})

describe('lerpPositions', () => {
  it('snaps to the newest frame when there is no previous', () => {
    const out = lerpPositions(null, frame(1, [1, 2, 3]), 0.5)
    expect(Array.from(out)).toEqual([1, 2, 3])
  })
  it('snaps when the body count changed (length mismatch)', () => {
    const out = lerpPositions(frame(0, [0, 0, 0]), frame(1, [9, 9, 9, 8, 8, 8]), 0.5)
    expect(Array.from(out)).toEqual([9, 9, 9, 8, 8, 8])
  })
  it('interpolates linearly at alpha 0, 0.5, 1', () => {
    const prev = frame(0, [0, 0, 0])
    const next = frame(1, [10, 20, 30])
    expect(Array.from(lerpPositions(prev, next, 0))).toEqual([0, 0, 0])
    expect(Array.from(lerpPositions(prev, next, 0.5))).toEqual([5, 10, 15])
    expect(Array.from(lerpPositions(prev, next, 1))).toEqual([10, 20, 30])
  })
  it('clamps alpha to [0,1]', () => {
    const prev = frame(0, [0])
    const next = frame(1, [10])
    expect(Array.from(lerpPositions(prev, next, -3))).toEqual([0])
    expect(Array.from(lerpPositions(prev, next, 3))).toEqual([10])
  })
  it('reuses the out buffer when the size matches (no allocation)', () => {
    const out = new Float64Array(3)
    const result = lerpPositions(frame(0, [0, 0, 0]), frame(1, [2, 4, 6]), 0.5, out)
    expect(result).toBe(out)
    expect(Array.from(out)).toEqual([1, 2, 3])
  })
})

describe('useFrameStore.pushFrame', () => {
  beforeEach(() => {
    useFrameStore.setState({
      prev: null,
      next: null,
      prevArrival: 0,
      nextArrival: 0,
    })
  })

  it('shifts next → prev as new frames arrive', () => {
    const f1 = frame(0.1, [1, 0, 0])
    const f2 = frame(0.2, [2, 0, 0])
    useFrameStore.getState().pushFrame(f1)
    expect(useFrameStore.getState().prev).toBeNull()
    expect(useFrameStore.getState().next).toBe(f1)
    useFrameStore.getState().pushFrame(f2)
    expect(useFrameStore.getState().prev).toBe(f1)
    expect(useFrameStore.getState().next).toBe(f2)
    expect(useFrameStore.getState().nextArrival).toBeGreaterThanOrEqual(
      useFrameStore.getState().prevArrival,
    )
  })
})
