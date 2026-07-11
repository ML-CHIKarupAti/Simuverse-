// Engine core — the PURE message reducer (PLAN §8 1.1, split out for testing).
// No `self`, no DOM, no postMessage: engine.worker.ts is a thin glue shell over
// this, and this module is unit-tested directly in node. State transitions are
// immutable; every handler returns the next state plus the messages to post.
//
// SCOPE (1.1): plumbing only. Bodies are stored and echoed as frames, but there
// is NO force kernel or integrator yet — those land in 1.3/1.4. `stepOnce`
// advances the clock and emits a frame so the frame/transfer path is exercised;
// bodies start actually moving once the integrator arrives.

import type {
  EngineInMessage,
  EngineOutMessage,
  EngineBody,
  EngineConfig,
  FramePayload,
} from './protocol'

export interface EngineState {
  config: EngineConfig
  bodies: EngineBody[]
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
    bodies: [],
    simTime: 0,
    running: false,
    timescale: 1,
  }
}

function cloneBody(b: EngineBody): EngineBody {
  return { id: b.id, mass: b.mass, pos: [...b.pos], vel: [...b.vel] }
}

// Build a fresh frame. Fresh Float64Arrays every call because the buffers are
// transferred (detached) on postMessage — reusing them would post a dead buffer.
function buildFrame(state: EngineState): FramePayload {
  const n = state.bodies.length
  const positions = new Float64Array(3 * n)
  const velocities = new Float64Array(3 * n)
  for (let i = 0; i < n; i++) {
    const b = state.bodies[i]
    positions[3 * i] = b.pos[0]
    positions[3 * i + 1] = b.pos[1]
    positions[3 * i + 2] = b.pos[2]
    velocities[3 * i] = b.vel[0]
    velocities[3 * i + 1] = b.vel[1]
    velocities[3 * i + 2] = b.vel[2]
  }
  return { simTime: state.simTime, positions, velocities }
}

function frameOut(state: EngineState): EngineOutMessage {
  return { type: 'frame', ...buildFrame(state) }
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
          bodies: msg.bodies.map(cloneBody),
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
      if (state.bodies.some((b) => b.id === msg.body.id)) {
        return {
          state,
          out: [errorOut(`addBody: id '${msg.body.id}' already exists`)],
        }
      }
      return {
        state: { ...state, bodies: [...state.bodies, cloneBody(msg.body)] },
        out: [],
      }

    case 'removeBody':
      if (!state.bodies.some((b) => b.id === msg.id)) {
        return { state, out: [errorOut(`removeBody: no body '${msg.id}'`)] }
      }
      return {
        state: { ...state, bodies: state.bodies.filter((b) => b.id !== msg.id) },
        out: [],
      }

    case 'updateBody': {
      const index = state.bodies.findIndex((b) => b.id === msg.id)
      if (index === -1) {
        return { state, out: [errorOut(`updateBody: no body '${msg.id}'`)] }
      }
      const current = state.bodies[index]
      const updated: EngineBody = {
        id: current.id,
        mass: msg.mass ?? current.mass,
        pos: msg.pos ? [...msg.pos] : [...current.pos],
        vel: msg.vel ? [...msg.vel] : [...current.vel],
      }
      return {
        state: {
          ...state,
          bodies: state.bodies.map((b, i) => (i === index ? updated : b)),
        },
        out: [],
      }
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
