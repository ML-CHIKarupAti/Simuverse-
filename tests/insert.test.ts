import { describe, it, expect } from 'vitest'
import { parseCommand } from '../src/commands/parser'
import { insertFromParsed } from '../src/commands/insert'
import { applyCommand, CommandError } from '../src/commands/registry'
import {
  LogEventKindSchema,
  SceneDocSchema,
  type SceneDoc,
  type SimObject,
} from '../src/scene/schema'
import { G } from '../src/units/units'

const SUN: SimObject = {
  id: 'star-1',
  type: 'star',
  name: 'sun',
  params: {
    mass: { value: 1, unit: 'Msun' },
    radius: { value: 1, unit: 'Rsun' },
  },
  state: { pos: [0, 0, 0], vel: [0, 0, 0] },
  fidelity: { gravity: 'exact', visuals: 'illustrative' },
  provenance: { source: 'preset' },
}

function makeDoc(objects: SimObject[] = []): SceneDoc {
  return {
    schemaVersion: 1,
    meta: { name: 'test', createdAt: '2026-07-10T00:00:00Z', appVersion: '0.0.0', seed: 1 },
    config: { integrator: 'verlet', dt: 0.001, softening: 0, timescale: 1 },
    objects,
    log: [],
    snapshots: [],
  }
}

function insert(doc: SceneDoc, command: string) {
  return insertFromParsed(doc, parseCommand(command), { t: 0 })
}

describe('Phase 0 acceptance — vis-viva insert', () => {
  const result = insert(makeDoc([SUN]), '\\insert planet mass=1Me a=1AU around=sun')

  it('produces a schema-valid SceneDoc', () => {
    expect(SceneDocSchema.safeParse(result.doc).success).toBe(true)
    expect(result.doc.objects).toHaveLength(2)
  })

  it('resolves mass=1Me to Earth mass in Msun', () => {
    expect(result.object.params.mass.unit).toBe('Msun')
    expect(result.object.params.mass.value).toBeCloseTo(3.003e-6, 12)
  })

  it('places the planet at r = a on +x with |v| = 2π AU/yr (vis-viva, circular)', () => {
    expect(result.object.state.pos[0]).toBeCloseTo(1, 12)
    expect(result.object.state.pos[1]).toBe(0)
    const [vx, vy, vz] = result.object.state.vel
    expect(Math.hypot(vx, vy, vz)).toBeCloseTo(2 * Math.PI, 4)
    expect(vx).toBe(0)
    expect(vz).toBe(0)
  })

  it('logs the insertion and a derived period ≈ 1 yr with its equation', () => {
    expect(result.doc.log).toHaveLength(2)
    const [inserted, derived] = result.doc.log
    expect(inserted.kind).toBe('objectInserted')
    expect(inserted.message).toContain("in orbit around 'sun'")
    expect(derived.kind).toBe('derivedComputed')
    expect(derived.values?.T).toBeCloseTo(1, 4)
    expect(derived.equation).toContain('2\\pi')
  })

  it('undo (the inverse command) removes the object but keeps the log', () => {
    const undone = applyCommand(result.doc, result.inverse)
    expect(undone.doc.objects).toEqual([SUN])
    expect(undone.doc.log).toHaveLength(2)
  })
})

describe('insert defaults and ids', () => {
  it('bare \\insert blackhole takes catalog defaults at the origin', () => {
    const { object } = insert(makeDoc(), '\\insert blackhole')
    expect(object.id).toBe('blackhole-1')
    expect(object.name).toBe('blackhole-1')
    expect(object.params.mass).toEqual({ value: 10, unit: 'Msun' })
    expect(object.fidelity).toEqual({ gravity: 'exact', visuals: 'illustrative' })
    expect(object.state).toEqual({ pos: [0, 0, 0], vel: [0, 0, 0] })
    expect(object.provenance.source).toBe('user')
  })

  it('ids are deterministic type-scoped counters and name= overrides the name', () => {
    const first = insert(makeDoc(), '\\insert star name=Alpha')
    expect(first.object.id).toBe('star-1')
    expect(first.object.name).toBe('Alpha')
    const second = insert(first.doc, 'insert star')
    expect(second.object.id).toBe('star-2')
  })

  it('explicit pos=/vel= tuples are canonical (AU, AU/yr)', () => {
    const { object } = insert(makeDoc(), '\\insert star pos=(1,0,0) vel=(0,2,0)')
    expect(object.state.pos).toEqual([1, 0, 0])
    expect(object.state.vel).toEqual([0, 2, 0])
  })
})

describe('orbital-element insertion details', () => {
  it('eccentric orbit: perihelion r = a(1−e), vis-viva speed', () => {
    const { object } = insert(
      makeDoc([SUN]),
      '\\insert planet a=1AU e=0.5 around=sun',
    )
    expect(object.state.pos[0]).toBeCloseTo(0.5, 12)
    const mu = G * (1 + 3.003e-6)
    const expected = Math.sqrt(mu * (2 / 0.5 - 1))
    expect(object.state.vel[1]).toBeCloseTo(expected, 8)
  })

  it('offsets pos/vel from a moving center', () => {
    const movingSun: SimObject = {
      ...SUN,
      state: { pos: [2, 1, 0], vel: [0, -1, 0] },
    }
    const { object } = insert(
      makeDoc([movingSun]),
      '\\insert planet a=1AU around=sun',
    )
    expect(object.state.pos).toEqual([3, 1, 0])
    expect(object.state.vel[1]).toBeCloseTo(-1 + 2 * Math.PI, 4)
  })

  it('M⊕ alias behaves like Me', () => {
    const a = insert(makeDoc([SUN]), '\\insert planet mass=2Me')
    const b = insert(makeDoc([SUN]), '\\insert planet mass=2M⊕')
    expect(a.object.params.mass).toEqual(b.object.params.mass)
  })
})

describe('insert semantics errors', () => {
  const doc = makeDoc([SUN])
  const cases: [string, RegExp][] = [
    ['\\insert dragon', /unknown object type/],
    ['\\insert planet mass=1parsec', /unknown unit/],
    ['\\insert planet a=1AU', /requires around=/],
    ['\\insert planet around=sun', /requires a=/],
    ['\\insert planet a=1AU around=nemesis', /no object with id or name/],
    ['\\insert planet a=1AU e=1.2 around=sun', /'e' must be in/],
    ['\\insert planet a=1AU around=sun pos=(1,0,0)', /cannot be combined/],
    ['\\insert planet a=-1AU around=sun', /must be positive/],
  ]
  it.each(cases)('%s → CommandError', (command, message) => {
    expect(() => insert(doc, command)).toThrowError(CommandError)
    expect(() => insert(doc, command)).toThrowError(message)
  })
})

describe('objectRemoved log kind (Q2)', () => {
  it('is a legal LogEvent kind', () => {
    expect(LogEventKindSchema.safeParse('objectRemoved').success).toBe(true)
  })
})
