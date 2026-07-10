import { describe, it, expect } from 'vitest'
import { SceneDocSchema, type SceneDoc } from '../src/scene/schema'
import { serializeScene, deserializeScene } from '../src/scene/serialize'

// A representative, fully schema-valid document: a Sun with an Earth.
function makeDoc(): SceneDoc {
  return {
    schemaVersion: 1,
    meta: {
      name: 'Sun–Earth',
      createdAt: '2026-07-10T00:00:00.000Z',
      appVersion: '0.0.0',
      seed: 42,
    },
    config: {
      integrator: 'yoshida4',
      dt: 1e-4,
      softening: 1e-6,
      timescale: 1,
    },
    objects: [
      {
        id: 'sun0000000000000000001',
        type: 'star',
        name: 'Sun',
        params: {
          mass: { value: 1, unit: 'Msun' },
          radius: { value: 6.957e5, unit: 'km' },
        },
        state: { pos: [0, 0, 0], vel: [0, 0, 0] },
        fidelity: { gravity: 'exact', visuals: 'illustrative' },
        provenance: { source: 'preset' },
      },
      {
        id: 'earth000000000000000001',
        type: 'planet',
        name: 'Earth',
        params: {
          mass: { value: 3.003e-6, unit: 'Msun' },
          semiMajorAxis: { value: 1, unit: 'AU' },
        },
        state: { pos: [1, 0, 0], vel: [0, 6.283185307179586, 0] },
        fidelity: { gravity: 'exact' },
        provenance: { source: 'user', detail: 'inserted via terminal' },
      },
    ],
    log: [
      {
        t: 1_752_000_000_000,
        simTime: 0,
        kind: 'objectInserted',
        message: 'Inserted planet Earth',
      },
      {
        t: 1_752_000_000_001,
        simTime: 0,
        kind: 'derivedComputed',
        message: 'Orbital period',
        equation: 'T = 2\\pi\\sqrt{a^3 / G M}',
        values: { T: 1.0 },
      },
    ],
    snapshots: [
      {
        simTime: 10,
        objectStates: [
          {
            id: 'sun0000000000000000001',
            state: { pos: [0, 0, 0], vel: [0, 0, 0] },
          },
        ],
      },
    ],
  }
}

describe('scene schema round-trip', () => {
  it('build → serialize → parse → deep-equal', () => {
    const doc = makeDoc()
    const json = serializeScene(doc)
    const restored = deserializeScene(json)
    expect(restored).toEqual(doc)
  })

  it('serializes as pretty-printed JSON', () => {
    const json = serializeScene(makeDoc())
    expect(json).toContain('\n')
    expect(json).toContain('  "schemaVersion": 1')
  })
})

describe('scene schema validation', () => {
  it('rejects an object missing required mass', () => {
    const doc = makeDoc()
    delete (doc.objects[0].params as Record<string, unknown>).mass
    expect(SceneDocSchema.safeParse(doc).success).toBe(false)
  })

  it('rejects an unknown unit', () => {
    const doc = makeDoc()
    // 'parsec' is not in the §5 unit enum ('m' and 'Rsun' now are — Option B).
    ;(doc.objects[0].params.radius as { unit: string }).unit = 'parsec'
    expect(SceneDocSchema.safeParse(doc).success).toBe(false)
  })

  it('rejects unknown top-level keys (strict)', () => {
    const bad = { ...makeDoc(), surprise: true }
    expect(SceneDocSchema.safeParse(bad).success).toBe(false)
  })

  it('reports the offending path for a bad field', () => {
    const doc = makeDoc()
    ;(doc.config as { integrator: string }).integrator = 'euler'
    const result = SceneDocSchema.safeParse(doc)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('config.integrator')
    }
  })
})
