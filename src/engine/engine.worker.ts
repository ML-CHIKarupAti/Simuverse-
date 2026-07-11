// Engine worker — thin glue only (PLAN §8 1.1). All logic lives in the pure
// engine.core reducer; this file just owns the worker's mutable state and pipes
// messages in/out. Not unit-tested (it is I/O wiring); engine.core is.
//
// We cast the DOM `self` (typed as Window under the app's DOM lib) to a minimal
// worker-scope shape rather than pulling in the WebWorker lib, which would
// conflict with DOM's global declarations.

import { createInitialState, handleMessage } from './engine.core'
import {
  frameTransferables,
  type EngineInMessage,
  type EngineOutMessage,
} from './protocol'

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<EngineInMessage>) => void) | null
  postMessage: (message: EngineOutMessage, transfer?: Transferable[]) => void
}

let state = createInitialState()

ctx.onmessage = (event) => {
  const result = handleMessage(state, event.data)
  state = result.state
  for (const message of result.out) {
    if (message.type === 'frame') {
      ctx.postMessage(message, frameTransferables(message))
    } else {
      ctx.postMessage(message)
    }
  }
}
