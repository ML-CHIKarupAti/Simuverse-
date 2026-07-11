// Engine core — the PURE message reducer (PLAN §8 1.1, split out for testing).
// No `self`, no DOM, no postMessage: engine.worker.ts is a thin glue shell over
// this, and this module is unit-tested directly in node. State transitions are
// immutable; every handler returns the next state plus the messages to post.
//
// State is held as structure-of-arrays (PLAN §8 1.2, see state.ts). SCOPE so far
// is plumbing only: bodies are stored and echoed as frames, but there is NO
// force kernel or integrator yet — those land in 1.3/1.4. `stepOnce` advances
// the clock and emits a frame; bodies start moving once the integrator arrives.

import type {
  EngineInMessage,
  EngineOutMessage,
  EngineConfig,
} from './protocol'
import * as bodyStore from './state'
import type { BodyArrays } from './state'

export interface EngineState {
  config: EngineConfig
  store: BodyArrays
  simTime: number // yr
  running: boolean
  timescale: number // simulated yr per real second
}

export interface HandleResult {
  state: EngineState
  out: EngineOutMessage[]
}

// Placeholder config before `init` arrives; values are the PLAN defaults
// (integrator §1.5, dt §1.4, softening §1.3, timescale §1.7). Overwritten by init.
export function createInitialState(): EngineState {
  return {
    config: { integrator: 'yoshida4', dt: 1e-4, softening: 1e-6, timescale: 1 },
    store: bodyStore.fromBodies([]),
    simTime: 0,
    running: false,
    timescale: 1,
  }
}

function frameOut(state: EngineState): EngineOutMessage {
  return { type: 'frame', simTime: state.simTime, ...bodyStore.frameArrays(state.store) }
}

function errorOut(message: string): EngineOutMessage {
  return { type: 'error', message }
}

export function handleMessage(
  state: EngineState,
  msg: EngineInMessage,
): HandleResult {
  switch (msg.type) {
    case 'init':
      return {
        state: {
          config: msg.config,
          store: bodyStore.fromBodies(msg.bodies),
          simTime: 0,
          running: false,
          timescale: msg.config.timescale,
        },
        out: [],
      }

    case 'play':
      return { state: { ...state, running: true }, out: [] }

    case 'pause':
      return { state: { ...state, running: false }, out: [] }

    case 'setTimescale':
      return { state: { ...state, timescale: msg.timescale }, out: [] }

    case 'stepOnce': {
      // 1.1: no integrator yet (lands 1.4). Advance the clock one dt and emit a
      // frame so the frame path is exercised; bodies are unchanged for now.
      const next = { ...state, simTime: state.simTime + state.config.dt }
      return { state: next, out: [frameOut(next)] }
    }

    case 'addBody':
      if (bodyStore.indexOf(state.store, msg.body.id) !== -1) {
        return {
          state,
          out: [errorOut(`addBody: id '${msg.body.id}' already exists`)],
        }
      }
      return {
        state: { ...state, store: bodyStore.addBody(state.store, msg.body) },
        out: [],
      }

    case 'removeBody':
      if (bodyStore.indexOf(state.store, msg.id) === -1) {
        return { state, out: [errorOut(`removeBody: no body '${msg.id}'`)] }
      }
      return {
        state: { ...state, store: bodyStore.removeBody(state.store, msg.id) },
        out: [],
      }

    case 'updateBody':
      if (bodyStore.indexOf(state.store, msg.id) === -1) {
        return { state, out: [errorOut(`updateBody: no body '${msg.id}'`)] }
      }
      return {
        state: {
          ...state,
          store: bodyStore.updateBody(state.store, msg.id, {
            mass: msg.mass,
            pos: msg.pos,
            vel: msg.vel,
          }),
        },
        out: [],
      }

    case 'requestSnapshot':
      return { state, out: [frameOut(state)] }

    default: {
      // Exhaustiveness guard: a new message type makes this a compile error.
      const unknown: never = msg
      return { state, out: [errorOut(`unknown message: ${JSON.stringify(unknown)}`)] }
    }
  }
}
