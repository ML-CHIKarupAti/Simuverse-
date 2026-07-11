import { describe, it, expect } from 'vitest'
import {
  createInitialState,
  handleMessage,
  advance,
  MAX_SUBSTEPS,
  DIAGNOSTICS_INTERVAL,
  type EngineState,
} from '../src/engine/engine.core'
import {
  EngineMsg,
  type EngineBody,
  type EngineConfig,
  type EngineOutMessage,
} from '../src/engine/protocol'
import * as bodyStore from '../src/engine/state'
import { computeForces } from '../src/engine/forces'
import { yoshida4Step } from '../src/engine/integrators'
import { G } from '../src/units/units'

const DT = 1e-4
const EPS = 1e-6

function config(timescale: number): EngineConfig {
  return { integrator: 'yoshida4', dt: DT, softening: EPS, timescale }
}

function running(bodies: EngineBody[], timescale: number): EngineState {
  let s = handleMessage(createInitialState(), EngineMsg.init(config(timescale), bodies)).state
  s = handleMessage(s, EngineMsg.play()).state
  return s
}

function drifter(): EngineBody[] {
  // Single body, no other mass → no forces → free drift by v·dt.
  return [{ id: 'p', mass: 1, pos: [0, 0, 0], vel: [1, 0, 0] }]
}

function twoBodyCircular(): EngineBody[] {
  const M = 1
  const m = 1e-6
  const r = 1
  const v = Math.sqrt((G * (M + m)) / r)
  return [
    { id: 'star', mass: M, pos: [0, 0, 0], vel: [0, 0, 0] },
    { id: 'planet', mass: m, pos: [r, 0, 0], vel: [0, v, 0] },
  ]
}

function diagnostics(out: EngineOutMessage[]) {
  return out.find((m) => m.type === 'diagnostics')
}

describe('sim loop — advance no-ops', () => {
  it('does nothing when paused', () => {
    const paused = handleMessage(createInitialState(), EngineMsg.init(config(1), drifter())).state
    const r = advance(paused, 1)
    expect(r.out).toEqual([])
    expect(r.state).toBe(paused)
  })

  it('does nothing with an empty scene', () => {
    const s = running([], 1)
    expect(advance(s, 1).out).toEqual([])
  })

  it('does nothing for non-positive elapsed time', () => {
    const s = running(drifter(), 1)
    expect(advance(s, 0).out).toEqual([])
  })
})

describe('sim loop — fixed-timestep accumulator', () => {
  it('consumes owed sim-time in whole dt steps (timescale-exact)', () => {
    const s = running(drifter(), 1) // 1 sim-yr per real-second
    const r = advance(s, 0.005) // owe 0.005 yr → 50 steps
    expect(Math.round(r.state.simTime / DT)).toBe(50)
    expect(r.out.some((m) => m.type === 'frame')).toBe(true)
    expect(diagnostics(r.out)).toBeUndefined() // 50 < DIAGNOSTICS_INTERVAL
  })

  it('carries the sub-dt remainder to the next tick', () => {
    const s = running(drifter(), 1)
    const r1 = advance(s, 1.5 * DT) // owe 1.5·dt → 1 step, 0.5·dt left over
    expect(Math.round(r1.state.simTime / DT)).toBe(1)
    expect(r1.state.accumulator).toBeCloseTo(0.5 * DT, 15)
    const r2 = advance(r1.state, 1.5 * DT) // 0.5·dt + 1.5·dt = 2·dt → 2 steps
    expect(Math.round(r2.state.simTime / DT)).toBe(3)
    expect(r2.state.accumulator).toBeCloseTo(0, 15)
  })

  it('emits diagnostics once ~DIAGNOSTICS_INTERVAL steps have accrued', () => {
    const s = running(drifter(), 1)
    const r = advance(s, DIAGNOSTICS_INTERVAL * DT) // exactly the interval
    const diag = diagnostics(r.out)
    expect(diag).toBeDefined()
    expect(r.state.stepsSinceDiagnostics).toBe(0) // counter reset
  })
})

describe('sim loop — honest substep cap (PLAN §1.7)', () => {
  it('caps runaway timescales and reports the true effective rate', () => {
    const s = running(drifter(), 1e9) // absurd timescale
    const r = advance(s, 1) // owes 1e9 yr; way past the cap
    expect(Math.round(r.state.simTime / DT)).toBe(MAX_SUBSTEPS)
    const diag = diagnostics(r.out)
    expect(diag).toBeDefined()
    if (diag && diag.type === 'diagnostics') {
      expect(diag.capped).toBe(true)
      // achieved = MAX_SUBSTEPS·dt / realSeconds, nowhere near the requested 1e9
      expect(diag.effectiveTimescale).toBeCloseTo((MAX_SUBSTEPS * DT) / 1, 9)
      expect(diag.effectiveTimescale).toBeLessThan(1e9)
    }
    expect(r.state.accumulator).toBe(0) // backlog dropped, no spiral
  })
})

describe('sim loop — trajectory matches the integrator exactly', () => {
  it('advance() equals calling yoshida4Step directly for the same step count', () => {
    const bodies = twoBodyCircular()
    const s = running(bodies, 1)
    const r = advance(s, 0.02) // ~200 steps
    const steps = Math.round(r.state.simTime / DT)

    const manual = bodyStore.fromBodies(bodies)
    computeForces(manual, EPS) // same priming as init
    for (let i = 0; i < steps; i++) yoshida4Step(manual, DT, EPS)

    expect(Array.from(r.state.store.pos)).toEqual(Array.from(manual.pos))
    expect(Array.from(r.state.store.vel)).toEqual(Array.from(manual.vel))
  })

  it('reports small energy drift for a real orbit', () => {
    const s = running(twoBodyCircular(), 1)
    const r = advance(s, DIAGNOSTICS_INTERVAL * DT)
    const diag = diagnostics(r.out)
    expect(diag).toBeDefined()
    if (diag && diag.type === 'diagnostics') {
      expect(diag.energyDriftRel).toBeLessThan(1e-6)
    }
  })
})