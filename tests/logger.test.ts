import { describe, it, expect } from 'vitest'
import {
  makeLogEvent,
  formatLogLine,
  appendLog,
  exportLogMarkdown,
} from '../src/scene/logger'
import {
  SceneDocSchema,
  LogEventSchema,
  type SceneDoc,
} from '../src/scene/schema'

function makeDoc(): SceneDoc {
  return {
    schemaVersion: 1,
    meta: {
      name: 'Sun–Earth',
      createdAt: '2026-07-10T00:00:00.000Z',
      appVersion: '0.0.0',
      seed: 42,
    },
    config: { integrator: 'yoshida4', dt: 1e-4, softening: 1e-6, timescale: 1 },
    objects: [],
    log: [],
    snapshots: [],
  }
}

describe('makeLogEvent', () => {
  it('builds a schema-valid event', () => {
    const event = makeLogEvent('objectInserted', 0, 'Inserted planet Earth', {
      t: 1_752_000_000_000,
    })
    expect(LogEventSchema.safeParse(event).success).toBe(true)
  })
  it('carries equation and values when provided', () => {
    const event = makeLogEvent('derivedComputed', 0, 'Orbital period', {
      t: 0,
      equation: 'T = 2\\pi\\sqrt{a^3/GM}',
      values: { T: 1 },
    })
    expect(event.equation).toContain('\\pi')
    expect(event.values).toEqual({ T: 1 })
  })
})

describe('formatLogLine', () => {
  it('shows sim time and message', () => {
    const line = formatLogLine(
      makeLogEvent('objectInserted', 1, 'Inserted planet Earth', { t: 0 }),
    )
    expect(line).toContain('1.00')
    expect(line).toContain('Inserted planet Earth')
  })
})

describe('appendLog', () => {
  it('appends immutably and keeps the doc schema-valid', () => {
    const doc = makeDoc()
    const event = makeLogEvent('simStarted', 0, 'Simulation started', { t: 0 })
    const next = appendLog(doc, event)
    expect(doc.log).toHaveLength(0) // original untouched
    expect(next.log).toHaveLength(1)
    expect(next.log[0]).toEqual(event)
    expect(SceneDocSchema.safeParse(next).success).toBe(true)
  })
})

describe('exportLogMarkdown', () => {
  it('includes title, config, and entries with equations in LaTeX fences', () => {
    let doc = makeDoc()
    doc = appendLog(
      doc,
      makeLogEvent('objectInserted', 0, 'Inserted planet Earth', { t: 0 }),
    )
    doc = appendLog(
      doc,
      makeLogEvent('derivedComputed', 0, 'Orbital period', {
        t: 1,
        equation: 'T = 2\\pi\\sqrt{a^3/GM}',
        values: { T: 1 },
      }),
    )
    const md = exportLogMarkdown(doc)
    expect(md).toContain('# Sun–Earth')
    expect(md).toContain('Integrator: yoshida4')
    expect(md).toContain('Inserted planet Earth')
    expect(md).toContain('$$')
    expect(md).toContain('T = 2\\pi\\sqrt{a^3/GM}')
  })
  it('handles an empty log gracefully', () => {
    expect(exportLogMarkdown(makeDoc())).toContain('_(no events)_')
  })
})
