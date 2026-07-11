import { describe, it, expect } from 'vitest'
import * as bodyStore from '../src/engine/state'
import type { EngineBody } from '../src/engine/protocol'

function body(
  id: string,
  pos: [number, number, number],
  vel: [number, number, number],
  mass = 1,
): EngineBody {
  return { id, mass, pos, vel }
}

const SUN = body('sun', [0, 0, 0], [0, 0, 0], 1)
const EARTH = body('earth', [1, 0, 0], [0, 6.283, 0], 3.003e-6)
const MOON = body('moon', [1.003, 0, 0], [0, 6.5, 0], 3.7e-8)

describe('BodyArrays — fromBodies / toBodies', () => {
  it('lays bodies out as structure-of-arrays', () => {
    const s = bodyStore.fromBodies([SUN, EARTH])
    expect(s.n).toBe(2)
    expect(s.ids).toEqual(['sun', 'earth'])
    expect(Array.from(s.mass)).toEqual([1, 3.003e-6])
    expect(Array.from(s.pos)).toEqual([0, 0, 0, 1, 0, 0])
    expect(Array.from(s.vel)).toEqual([0, 0, 0, 0, 6.283, 0])
    expect(Array.from(s.acc)).toEqual([0, 0, 0, 0, 0, 0]) // zero until 1.3
  })

  it('round-trips through toBodies', () => {
    const s = bodyStore.fromBodies([SUN, EARTH, MOON])
    expect(bodyStore.toBodies(s)).toEqual([SUN, EARTH, MOON])
  })

  it('indexOf locates a body, -1 when absent', () => {
    const s = bodyStore.fromBodies([SUN, EARTH])
    expect(bodyStore.indexOf(s, 'earth')).toBe(1)
    expect(bodyStore.indexOf(s, 'pluto')).toBe(-1)
  })
})

describe('BodyArrays — add / remove rebuild the arrays', () => {
  it('addBody appends and preserves existing slots', () => {
    const s = bodyStore.addBody(bodyStore.fromBodies([SUN, EARTH]), MOON)
    expect(s.n).toBe(3)
    expect(s.ids).toEqual(['sun', 'earth', 'moon'])
    expect(Array.from(s.pos.slice(6, 9))).toEqual([1.003, 0, 0])
    expect(s.mass[2]).toBe(3.7e-8)
  })

  it('removeBody compacts out the middle body', () => {
    const s = bodyStore.removeBody(bodyStore.fromBodies([SUN, EARTH, MOON]), 'earth')
    expect(s.n).toBe(2)
    expect(s.ids).toEqual(['sun', 'moon'])
    expect(Array.from(s.pos)).toEqual([0, 0, 0, 1.003, 0, 0])
    expect(Array.from(s.vel)).toEqual([0, 0, 0, 0, 6.5, 0])
  })

  it('is pure — the source arrays are not mutated', () => {
    const s0 = bodyStore.fromBodies([SUN, EARTH])
    const before = Array.from(s0.pos)
    bodyStore.addBody(s0, MOON)
    bodyStore.removeBody(s0, 'sun')
    expect(Array.from(s0.pos)).toEqual(before)
    expect(s0.n).toBe(2)
  })
})

describe('BodyArrays — updateBody patches offsets', () => {
  it('updates only the provided fields at the right slot', () => {
    const s0 = bodyStore.fromBodies([SUN, EARTH])
    const s = bodyStore.updateBody(s0, 'earth', {
      mass: 5,
      vel: [0, 7, 0],
    })
    expect(s.mass[1]).toBe(5)
    expect(Array.from(s.vel.slice(3, 6))).toEqual([0, 7, 0])
    expect(Array.from(s.pos.slice(3, 6))).toEqual([1, 0, 0]) // pos untouched
    expect(s.mass[0]).toBe(1) // sun untouched
  })
})

describe('BodyArrays — frameArrays', () => {
  it('returns fresh copies (not views) of pos/vel', () => {
    const s = bodyStore.fromBodies([SUN, EARTH])
    const frame = bodyStore.frameArrays(s)
    expect(Array.from(frame.positions)).toEqual([0, 0, 0, 1, 0, 0])
    expect(frame.positions.buffer).not.toBe(s.pos.buffer)
    expect(frame.velocities.buffer).not.toBe(s.vel.buffer)
  })
})
