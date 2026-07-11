// Engine worker — thin glue only (PLAN §8 1.1, 1.7). All logic lives in the
// pure engine.core reducer/advance; this file owns the mutable state and the
// real-time timer, and pipes messages in/out. Not unit-tested (I/O + timing);
// engine.core is.
//
// We cast the DOM `self` (typed as Window under the app's DOM lib) to a minimal
// worker-scope shape rather than pulling in the WebWorker lib, which would
// conflict with DOM's global declarations.

import { createInitialState, handleMessage, advance } from './engine.core'
import {
  frameTransferables,
  type EngineInMessage,
  type EngineOutMessage,
} from './protocol'

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<EngineInMessage>) => void) | null
  postMessage: (message: EngineOutMessage, transfer?: Transferable[]) => void
}

// ~60 Hz tick. Physics is decoupled from this via the fixed-timestep
// accumulator, so the tick rate only affects frame cadence, not the trajectory.
const TICK_MS = 16

let state = createInitialState()
let lastTime = Date.now()

function emit(out: EngineOutMessage[]): void {
  for (const message of out) {
    if (message.type === 'frame') {
      ctx.postMessage(message, frameTransferables(message))
    } else {
      ctx.postMessage(message)
    }
  }
}

ctx.onmessage = (event) => {
  const result = handleMessage(state, event.data)
  state = result.state
  emit(result.out)
}

// Drive the sim loop. We reset lastTime every tick (even while paused) so a long
// pause never turns into one giant catch-up step on resume.
setInterval(() => {
  const now = Date.now()
  const realSeconds = (now - lastTime) / 1000
  lastTime = now
  if (!state.running) return
  const result = advance(state, realSeconds)
  state = result.state
  emit(result.out)
}, TICK_MS)
