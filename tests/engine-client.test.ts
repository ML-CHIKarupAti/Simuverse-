import { describe, it, expect } from 'vitest'
import { EngineClient, type WorkerLike } from '../src/engine/engineClient'
import {
  createInitialState,
  handleMessage,
  type EngineState,
} from '../src/engine/engine.core'
import {
  type EngineBody,
  type EngineConfig,
  type EngineInMessage,
  type FramePayload,
} from '../src/engine/protocol'

const CONFIG: EngineConfig = {
  integrator: 'yoshida4',
  dt: 1e-4,
  softening: 1e-6,
  timescale: 1,
}

function body(id: string, x: number): EngineBody {
  return { id, mass: 1, pos: [x, 0, 0], vel: [0, 0, 0] }
}

// A synchronous in-process worker: pipes each posted message through the real
// pure core and delivers outputs back via onmessage. Lets us test the client
// without a real Web Worker (unavailable in node).
class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent) => void) | null = null
  private state: EngineState = createInitialState()
  postMessage(message: unknown): void {
    const result = handleMessage(this.state, message as EngineInMessage)
    this.state = result.state
    for (const out of result.out) {
      this.onmessage?.({ data: out } as MessageEvent)
    }
  }
  terminate(): void {}
}

describe('EngineClient — order tracking', () => {
  it('tracks id↔slot order across init/add/remove', () => {
    const client = new EngineClient(new FakeWorker())
    client.init(CONFIG, [body('sun', 0), body('earth', 1)])
    expect(client.getOrder()).toEqual(['sun', 'earth'])
    client.addBody(body('moon', 1.003))
    expect(client.getOrder()).toEqual(['sun', 'earth', 'moon'])
    client.removeBody('earth')
    expect(client.getOrder()).toEqual(['sun', 'moon'])
  })
})

describe('EngineClient — subscriptions', () => {
  it('delivers frames to onFrame subscribers', () => {
    const client = new EngineClient(new FakeWorker())
    const frames: FramePayload[] = []
    client.onFrame((f) => frames.push(f))
    client.init(CONFIG, [body('sun', 0), body('earth', 1)])
    client.requestSnapshot()
    expect(frames).toHaveLength(1)
    expect(Array.from(frames[0].positions)).toEqual([0, 0, 0, 1, 0, 0])
  })

  it('unsubscribe stops delivery', () => {
    const client = new EngineClient(new FakeWorker())
    let count = 0
    const unsub = client.onFrame(() => count++)
    client.init(CONFIG, [body('sun', 0)])
    client.requestSnapshot()
    unsub()
    client.requestSnapshot()
    expect(count).toBe(1)
  })

  it('routes worker errors to onError (e.g. removing a missing body)', () => {
    const client = new EngineClient(new FakeWorker())
    const errors: string[] = []
    client.onError((e) => errors.push(e.message))
    client.init(CONFIG, [body('sun', 0)])
    client.removeBody('pluto')
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('pluto')
  })

  it('stepOnce advances simTime in the delivered frame', () => {
    const client = new EngineClient(new FakeWorker())
    const frames: FramePayload[] = []
    client.onFrame((f) => frames.push(f))
    client.init(CONFIG, [body('earth', 1)])
    client.stepOnce()
    expect(frames).toHaveLength(1)
    expect(frames[0].simTime).toBeCloseTo(CONFIG.dt, 12)
  })
})
