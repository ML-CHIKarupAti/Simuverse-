import { describe, it, expect } from 'vitest'
import {
  createInitialState,
  handleMessage,
  type EngineState,
} from '../src/engine/engine.core'
import {
  EngineMsg,
  frameTransferables,
  type EngineBody,
  type EngineConfig,
  type EngineOutMessage,
} from '../src/engine/protocol'

const CONFIG: EngineConfig = {
  integrator: 'yoshida4',
  dt: 1e-4,
  softening: 1e-6,
  timescale: 1,
}

function body(id: string, x: number, vy: number): EngineBody {
  return { id, mass: 1, pos: [x, 0, 0], vel: [0, vy, 0] }
}

function inited(bodies: EngineBody[]): EngineState {
  return handleMessage(createInitialState(), EngineMsg.init(CONFIG, bodies)).state
}

function onlyFrame(out: EngineOutMessage[]) {
  expect(out).toHaveLength(1)
  const msg = out[0]
  if (msg.type !== 'frame') throw new Error(`expected frame, got ${msg.type}`)
  return msg
}

describe('engine core — init & snapshot', () => {
  it('init loads bodies, zeroes simTime, adopts config timescale', () => {
    const s = inited([body('sun', 0, 0), body('earth', 1, 6.283)])
    expect(s.bodies.map((b) => b.id)).toEqual(['sun', 'earth'])
    expect(s.simTime).toBe(0)
    expect(s.running).toBe(false)
    expect(s.timescale).toBe(CONFIG.timescale)
  })

  it('requestSnapshot emits a frame with SoA positions/velocities', () => {
    const s = inited([body('sun', 0, 0), body('earth', 1, 6.283)])
    const frame = onlyFrame(handleMessage(s, EngineMsg.requestSnapshot()).out)
    expect(Array.from(frame.positions)).toEqual([0, 0, 0, 1, 0, 0])
    expect(Array.from(frame.velocities)).toEqual([0, 0, 0, 0, 6.283, 0])
    expect(frame.simTime).toBe(0)
  })

  it('emits a fresh Float64Array each frame (transfer-safe)', () => {
    const s = inited([body('sun', 0, 0)])
    const a = onlyFrame(handleMessage(s, EngineMsg.requestSnapshot()).out)
    const b = onlyFrame(handleMessage(s, EngineMsg.requestSnapshot()).out)
    expect(a.positions).not.toBe(b.positions)
    expect(frameTransferables(a)).toEqual([
      a.positions.buffer,
      a.velocities.buffer,
    ])
  })

  it('does not mutate the source bodies (immutability)', () => {
    const bodies = [body('sun', 0, 0)]
    const s = inited(bodies)
    handleMessage(s, EngineMsg.updateBody('sun', { mass: 99 }))
    expect(bodies[0].mass).toBe(1)
  })
})

describe('engine core — transport (1.1 plumbing)', () => {
  it('play/pause/setTimescale set flags without emitting', () => {
    let s = inited([body('sun', 0, 0)])
    let r = handleMessage(s, EngineMsg.play())
    expect(r.state.running).toBe(true)
    expect(r.out).toEqual([])
    s = r.state
    r = handleMessage(s, EngineMsg.pause())
    expect(r.state.running).toBe(false)
    s = handleMessage(s, EngineMsg.setTimescale(1000)).state
    expect(s.timescale).toBe(1000)
  })

  it('stepOnce advances the clock by dt and emits a frame (bodies unchanged)', () => {
    const s = inited([body('earth', 1, 6.283)])
    const r = handleMessage(s, EngineMsg.stepOnce())
    expect(r.state.simTime).toBeCloseTo(CONFIG.dt, 12)
    const frame = onlyFrame(r.out)
    expect(Array.from(frame.positions)).toEqual([1, 0, 0]) // no integrator yet
  })
})

describe('engine core — body management', () => {
  it('addBody appends; duplicate id errors', () => {
    const s = inited([body('sun', 0, 0)])
    const added = handleMessage(s, EngineMsg.addBody(body('earth', 1, 6.283)))
    expect(added.state.bodies.map((b) => b.id)).toEqual(['sun', 'earth'])
    const dup = handleMessage(added.state, EngineMsg.addBody(body('earth', 2, 0)))
    expect(dup.out[0].type).toBe('error')
    expect(dup.state.bodies).toHaveLength(2)
  })

  it('removeBody removes; missing id errors', () => {
    const s = inited([body('sun', 0, 0), body('earth', 1, 6.283)])
    const removed = handleMessage(s, EngineMsg.removeBody('earth'))
    expect(removed.state.bodies.map((b) => b.id)).toEqual(['sun'])
    const missing = handleMessage(s, EngineMsg.removeBody('pluto'))
    expect(missing.out[0].type).toBe('error')
  })

  it('updateBody patches only provided fields; missing id errors', () => {
    const s = inited([body('earth', 1, 6.283)])
    const updated = handleMessage(s, EngineMsg.updateBody('earth', { mass: 5 }))
    expect(updated.state.bodies[0].mass).toBe(5)
    expect(updated.state.bodies[0].pos).toEqual([1, 0, 0]) // unchanged
    const missing = handleMessage(s, EngineMsg.updateBody('mars', { mass: 1 }))
    expect(missing.out[0].type).toBe('error')
  })
})
