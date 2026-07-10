import { describe, it, expect } from 'vitest'
import { CommandBus } from '../src/commands/bus'
import { CommandError, type BusEvent } from '../src/commands/registry'
import type { SceneDoc, SimObject } from '../src/scene/schema'

function makeObject(id: string, name: string): SimObject {
  return {
    id,
    type: 'star',
    name,
    params: { mass: { value: 1, unit: 'Msun' } },
    state: { pos: [0, 0, 0], vel: [0, 0, 0] },
    fidelity: { gravity: 'exact' },
    provenance: { source: 'user' },
  }
}

function makeDoc(objects: SimObject[] = []): SceneDoc {
  return {
    schemaVersion: 1,
    meta: {
      name: 'Test',
      createdAt: '2026-07-10T00:00:00.000Z',
      appVersion: '0.0.0',
      seed: 1,
    },
    config: { integrator: 'yoshida4', dt: 1e-4, softening: 1e-6, timescale: 1 },
    objects,
    log: [],
    snapshots: [],
  }
}

describe('command bus — insert / undo / redo', () => {
  it('insert adds the object and emits objectInserted', () => {
    const bus = new CommandBus(makeDoc())
    const event = bus.dispatch({ kind: 'insert', object: makeObject('a', 'A') })
    expect(event.type).toBe('objectInserted')
    expect(bus.getDoc().objects.map((o) => o.id)).toEqual(['a'])
  })

  it('does not mutate the original document (immutability)', () => {
    const original = makeDoc()
    const bus = new CommandBus(original)
    bus.dispatch({ kind: 'insert', object: makeObject('a', 'A') })
    expect(original.objects).toEqual([]) // untouched
  })

  it('insert → undo restores the prior doc EXACTLY (acceptance)', () => {
    const base = makeDoc([makeObject('sun', 'Sun')])
    const bus = new CommandBus(base)
    const before = structuredClone(bus.getDoc())
    bus.dispatch({ kind: 'insert', object: makeObject('b', 'B') })
    bus.undo()
    expect(bus.getDoc()).toEqual(before)
  })

  it('undo then redo re-applies the action', () => {
    const bus = new CommandBus(makeDoc())
    bus.dispatch({ kind: 'insert', object: makeObject('a', 'A') })
    bus.undo()
    expect(bus.getDoc().objects).toEqual([])
    bus.redo()
    expect(bus.getDoc().objects.map((o) => o.id)).toEqual(['a'])
  })

  it('a fresh dispatch clears the redo history', () => {
    const bus = new CommandBus(makeDoc())
    bus.dispatch({ kind: 'insert', object: makeObject('a', 'A') })
    bus.undo()
    expect(bus.canRedo()).toBe(true)
    bus.dispatch({ kind: 'insert', object: makeObject('c', 'C') })
    expect(bus.canRedo()).toBe(false)
  })
})

describe('command bus — set / remove inverses', () => {
  it('set changes a param and undo restores the previous value', () => {
    const base = makeDoc([makeObject('sun', 'Sun')])
    const bus = new CommandBus(base)
    const before = structuredClone(bus.getDoc())
    bus.dispatch({
      kind: 'set',
      id: 'sun',
      key: 'mass',
      value: { value: 10, unit: 'Msun' },
    })
    expect(bus.getDoc().objects[0].params.mass.value).toBe(10)
    bus.undo()
    expect(bus.getDoc()).toEqual(before)
  })

  it('remove of a middle object → undo restores order exactly', () => {
    const base = makeDoc([
      makeObject('a', 'A'),
      makeObject('b', 'B'),
      makeObject('c', 'C'),
    ])
    const bus = new CommandBus(base)
    const before = structuredClone(bus.getDoc())
    bus.dispatch({ kind: 'remove', id: 'b' })
    expect(bus.getDoc().objects.map((o) => o.id)).toEqual(['a', 'c'])
    bus.undo()
    expect(bus.getDoc()).toEqual(before)
  })
})

describe('command bus — validation errors leave state untouched', () => {
  it('rejects a duplicate id', () => {
    const bus = new CommandBus(makeDoc([makeObject('a', 'A')]))
    const before = structuredClone(bus.getDoc())
    expect(() =>
      bus.dispatch({ kind: 'insert', object: makeObject('a', 'A2') }),
    ).toThrow(CommandError)
    expect(bus.getDoc()).toEqual(before)
    expect(bus.canUndo()).toBe(false)
  })

  it('rejects removing a missing object', () => {
    const bus = new CommandBus(makeDoc())
    expect(() => bus.dispatch({ kind: 'remove', id: 'nope' })).toThrow(
      CommandError,
    )
  })

  it('rejects setting a missing param', () => {
    const bus = new CommandBus(makeDoc([makeObject('a', 'A')]))
    expect(() =>
      bus.dispatch({
        kind: 'set',
        id: 'a',
        key: 'radius',
        value: { value: 1, unit: 'km' },
      }),
    ).toThrow(CommandError)
  })
})

describe('command bus — event subscription', () => {
  it('notifies subscribers and stops after unsubscribe', () => {
    const bus = new CommandBus(makeDoc())
    const seen: BusEvent[] = []
    const unsub = bus.subscribe((e) => seen.push(e))
    bus.dispatch({ kind: 'insert', object: makeObject('a', 'A') })
    unsub()
    bus.dispatch({ kind: 'insert', object: makeObject('b', 'B') })
    expect(seen).toHaveLength(1)
    expect(seen[0].type).toBe('objectInserted')
  })
})
