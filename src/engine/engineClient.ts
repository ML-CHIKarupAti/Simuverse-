// Engine client — typed main-thread wrapper around the worker (PLAN §8 1.1).
// Sends control messages through the EngineMsg factories and routes worker
// output to typed subscribers. Also tracks the id↔slot order so callers can map
// a frame's flat arrays back to bodies (the frame itself omits ids by design —
// see protocol.ts). Raw postMessage; no Comlink.

import {
  EngineMsg,
  type EngineInMessage,
  type EngineOutMessage,
  type EngineBody,
  type EngineConfig,
  type FramePayload,
  type DiagnosticsPayload,
} from './protocol'

// Minimal surface the client needs from a Worker. Real Worker satisfies it;
// tests inject a fake that loops messages through the pure core.
export interface WorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void
  onmessage: ((event: MessageEvent) => void) | null
  terminate(): void
}

export type Unsubscribe = () => void
type Handler<T> = (payload: T) => void
export type EngineError = { message: string; cause?: string }

export class EngineClient {
  private readonly worker: WorkerLike
  private order: string[] = []
  private readonly frameHandlers = new Set<Handler<FramePayload>>()
  private readonly diagnosticsHandlers = new Set<Handler<DiagnosticsPayload>>()
  private readonly errorHandlers = new Set<Handler<EngineError>>()

  // Pass a worker (real or fake) for injection; otherwise spawn the module
  // worker via Vite's URL form.
  constructor(worker?: WorkerLike) {
    this.worker =
      worker ??
      new Worker(new URL('./engine.worker.ts', import.meta.url), {
        type: 'module',
      })
    this.worker.onmessage = (event) =>
      this.dispatch(event.data as EngineOutMessage)
  }

  private dispatch(message: EngineOutMessage): void {
    switch (message.type) {
      case 'frame':
        for (const h of this.frameHandlers) h(message)
        break
      case 'diagnostics':
        for (const h of this.diagnosticsHandlers) h(message)
        break
      case 'error':
        for (const h of this.errorHandlers) h(message)
        break
    }
  }

  private send(message: EngineInMessage): void {
    this.worker.postMessage(message)
  }

  // --- control API ---------------------------------------------------------
  init(config: EngineConfig, bodies: EngineBody[]): void {
    this.order = bodies.map((b) => b.id)
    this.send(EngineMsg.init(config, bodies))
  }
  play(): void {
    this.send(EngineMsg.play())
  }
  pause(): void {
    this.send(EngineMsg.pause())
  }
  setTimescale(timescale: number): void {
    this.send(EngineMsg.setTimescale(timescale))
  }
  stepOnce(): void {
    this.send(EngineMsg.stepOnce())
  }
  addBody(body: EngineBody): void {
    this.order.push(body.id)
    this.send(EngineMsg.addBody(body))
  }
  removeBody(id: string): void {
    this.order = this.order.filter((x) => x !== id)
    this.send(EngineMsg.removeBody(id))
  }
  updateBody(
    id: string,
    changes: {
      mass?: number
      pos?: [number, number, number]
      vel?: [number, number, number]
    },
  ): void {
    this.send(EngineMsg.updateBody(id, changes))
  }
  requestSnapshot(): void {
    this.send(EngineMsg.requestSnapshot())
  }

  // Current body id order; frame slot i corresponds to order[i].
  getOrder(): readonly string[] {
    return this.order
  }

  // --- subscriptions -------------------------------------------------------
  onFrame(handler: Handler<FramePayload>): Unsubscribe {
    this.frameHandlers.add(handler)
    return () => this.frameHandlers.delete(handler)
  }
  onDiagnostics(handler: Handler<DiagnosticsPayload>): Unsubscribe {
    this.diagnosticsHandlers.add(handler)
    return () => this.diagnosticsHandlers.delete(handler)
  }
  onError(handler: Handler<EngineError>): Unsubscribe {
    this.errorHandlers.add(handler)
    return () => this.errorHandlers.delete(handler)
  }

  terminate(): void {
    this.worker.terminate()
  }
}
