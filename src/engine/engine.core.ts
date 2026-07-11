// Engine core — the PURE reducer + sim-loop step (PLAN §8 1.1, 1.7). No `self`,
// no DOM, no timers: engine.worker.ts owns the real timer and just calls
// `advance` each tick; everything here is unit-tested directly in node.
//
// State is structure-of-arrays (state.ts). The invariant store.acc == a(store.pos)
// is established on init and re-established after any body change, and every
// integrator step preserves it — so the loop costs one force eval per substep.

import type {
  EngineInMessage,
  EngineOutMessage,
  EngineConfig,
} from './protocol'
import * as bodyStore from './state'
import type { BodyArrays } from './state'
import { computeForces } from './forces'
import { integratorStep } from './integrators'
import { conserved, relativeDrift, type Conserved } from './diagnostics'

// Per-tick substep cap (PLAN §1.7): bounds work at extreme timescales so the
// worker can't freeze. If we hit it with time still owed, we report the honest
// effective timescale and drop the backlog (avoid the "spiral of death").
export const MAX_SUBSTEPS = 5000
// Emit diagnostics roughly every this many integrated steps (PLAN §1.6).
export const DIAGNOSTICS_INTERVAL = 100

export interface EngineState {
  config: EngineConfig
  store: BodyArrays
  simTime: number // yr
  running: boolean
  timescale: number // simulated yr per real second
  accumulator: number // sim-years owed but not yet stepped
  stepsSinceDiagnostics: number
  baseline: Conserved | null // E₀,L₀ for drift; reset on body changes
}

export interface HandleResult {
  state: EngineState
  out: EngineOutMessage[]
}

export function createInitialState(): EngineState {
  return {
    config: { integrator: 'yoshida4', dt: 1e-4, softening: 1e-6, timescale: 1 },
    store: bodyStore.fromBodies([]),
    simTime: 0,
    running: false,
    timescale: 1,
    accumulator: 0,
    stepsSinceDiagnostics: 0,
    baseline: null,
  }
}

// Recompute accelerations for a freshly-built store (mutates its acc) and take a
// fresh conserved baseline. Called on init and after every body change so drift
// is always measured from the current configuration, not a stale one.
function primeStore(store: BodyArrays, softening: number): Conserved | null {
  computeForces(store, softening)
  return store.n > 0 ? conserved(store, softening) : null
}

function frameOut(state: EngineState): EngineOutMessage {
  return {
    type: 'frame',
    simTime: state.simTime,
    ...bodyStore.frameArrays(state.store),
  }
}

function diagnosticsOut(
  state: EngineState,
  effectiveTimescale: number,
  capped: boolean,
): EngineOutMessage {
  const current = conserved(state.store, state.config.softening)
  const drift = relativeDrift(current, state.baseline ?? current)
  return {
    type: 'diagnostics',
    simTime: state.simTime,
    energy: current.energy,
    angularMomentum: current.angularMomentum,
    energyDriftRel: drift.energyDriftRel,
    angularMomentumDriftRel: drift.angularMomentumDriftRel,
    effectiveTimescale,
    capped,
  }
}

function errorOut(message: string): EngineOutMessage {
  return { type: 'error', message }
}

// Rebuild-and-reprime helper for the body-mutation handlers.
function withStore(state: EngineState, store: BodyArrays): EngineState {
  return { ...state, store, baseline: primeStore(store, state.config.softening) }
}

export function handleMessage(
  state: EngineState,
  msg: EngineInMessage,
): HandleResult {
  switch (msg.type) {
    case 'init': {
      const store = bodyStore.fromBodies(msg.bodies)
      const baseline = primeStore(store, msg.config.softening)
      return {
        state: {
          config: msg.config,
          store,
          simTime: 0,
          running: false,
          timescale: msg.config.timescale,
          accumulator: 0,
          stepsSinceDiagnostics: 0,
          baseline,
        },
        out: [],
      }
    }

    case 'play':
      return { state: { ...state, running: true }, out: [] }

    case 'pause':
      return { state: { ...state, running: false }, out: [] }

    case 'setTimescale':
      return { state: { ...state, timescale: msg.timescale }, out: [] }

    case 'stepOnce': {
      // One real integrator step (PLAN §1.7 — stepping is now physical).
      const store = bodyStore.cloneStore(state.store)
      if (store.n > 0) {
        integratorStep(state.config.integrator, store, state.config.dt, state.config.softening)
      }
      const next = { ...state, store, simTime: state.simTime + state.config.dt }
      return { state: next, out: [frameOut(next), diagnosticsOut(next, next.timescale, false)] }
    }

    case 'addBody':
      if (bodyStore.indexOf(state.store, msg.body.id) !== -1) {
        return {
          state,
          out: [errorOut(`addBody: id '${msg.body.id}' already exists`)],
        }
      }
      return {
        state: withStore(state, bodyStore.addBody(state.store, msg.body)),
        out: [],
      }

    case 'removeBody':
      if (bodyStore.indexOf(state.store, msg.id) === -1) {
        return { state, out: [errorOut(`removeBody: no body '${msg.id}'`)] }
      }
      return {
        state: withStore(state, bodyStore.removeBody(state.store, msg.id)),
        out: [],
      }

    case 'updateBody':
      if (bodyStore.indexOf(state.store, msg.id) === -1) {
        return { state, out: [errorOut(`updateBody: no body '${msg.id}'`)] }
      }
      return {
        state: withStore(
          state,
          bodyStore.updateBody(state.store, msg.id, {
            mass: msg.mass,
            pos: msg.pos,
            vel: msg.vel,
          }),
        ),
        out: [],
      }

    case 'requestSnapshot':
      return { state, out: [frameOut(state)] }

    default: {
      const unknown: never = msg
      return { state, out: [errorOut(`unknown message: ${JSON.stringify(unknown)}`)] }
    }
  }
}

// Advance the simulation by `realSeconds` of wall-clock time (PLAN §1.7). Pure:
// the worker's timer measures the elapsed time and calls this. Fixed-timestep
// accumulator — owed sim-time = realSeconds × timescale is consumed in whole dt
// steps; the remainder carries to the next tick so motion is timescale-exact
// and frame-rate independent. Emits a frame each tick and diagnostics every
// ~DIAGNOSTICS_INTERVAL steps (or immediately if the substep cap engaged).
export function advance(state: EngineState, realSeconds: number): HandleResult {
  if (!state.running || state.store.n === 0 || realSeconds <= 0) {
    return { state, out: [] }
  }

  const { dt, softening, integrator } = state.config
  const store = bodyStore.cloneStore(state.store)
  let accumulator = state.accumulator + realSeconds * state.timescale
  let simTime = state.simTime
  let steps = 0

  while (accumulator >= dt && steps < MAX_SUBSTEPS) {
    integratorStep(integrator, store, dt, softening)
    accumulator -= dt
    simTime += dt
    steps++
  }

  let capped = false
  let effectiveTimescale = state.timescale
  if (steps === MAX_SUBSTEPS && accumulator >= dt) {
    capped = true
    effectiveTimescale = (steps * dt) / realSeconds // honest achieved rate
    accumulator = 0 // drop the backlog rather than spiral trying to catch up
  }

  const stepsSinceDiagnostics = state.stepsSinceDiagnostics + steps
  const next: EngineState = { ...state, store, simTime, accumulator, stepsSinceDiagnostics }
  const out: EngineOutMessage[] = [frameOut(next)]

  if (stepsSinceDiagnostics >= DIAGNOSTICS_INTERVAL || capped) {
    out.push(diagnosticsOut(next, effectiveTimescale, capped))
    next.stepsSinceDiagnostics = 0
  }

  return { state: next, out }
}
