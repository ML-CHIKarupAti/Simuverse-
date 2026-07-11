// Engine worker protocol — PLAN §4 (architecture) + §8 step 1.1.
// The wire contract between the main thread and the physics worker. The worker
// owns authoritative state and never touches the DOM; the main thread drives it
// with control messages and receives state frames back (PLAN §4). This module
// is PURE TYPES + factory helpers — no `self`, no DOM, no postMessage — so it
// imports cleanly into the worker, the main-thread client (1.1), and tests.
//
// Everything crossing this boundary is CANONICAL float64 (AU, Msun, yr, AU/yr,
// PLAN §5). Unit conversion from stored { value, unit } Quantities happens ABOVE
// this layer (on the main thread, via units.ts) so the worker does pure physics.

import type { Config } from '../scene/schema'

// A body as the engine sees it: canonical numbers only, no Quantity wrappers.
// The main-thread client builds these from SimObjects (toCanonical on mass; the
// state vectors are already canonical in the schema).
export interface EngineBody {
  id: string
  mass: number // Msun
  pos: [number, number, number] // AU
  vel: [number, number, number] // AU/yr
}

// The physics config the worker runs under (PLAN §6 config). Reused verbatim
// from the scene schema so the two can never drift.
export type EngineConfig = Config

// --- Messages IN: main thread → worker (PLAN §8 1.1) ------------------------
// init, play, pause, setTimescale, stepOnce, updateBody, addBody, removeBody,
// requestSnapshot. Discriminated on `type` for exhaustive handling in the
// worker's switch.

export type EngineInMessage =
  | { type: 'init'; config: EngineConfig; bodies: EngineBody[] }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'setTimescale'; timescale: number } // simulated yr per real second
  | { type: 'stepOnce' } // advance exactly one fixed dt, even while paused
  | { type: 'addBody'; body: EngineBody }
  | { type: 'removeBody'; id: string }
  // Partial update of an existing body's mass and/or state. Omitted fields are
  // left unchanged. `\set mass=…` and inspector edits route here.
  | {
      type: 'updateBody'
      id: string
      mass?: number
      pos?: [number, number, number]
      vel?: [number, number, number]
    }
  | { type: 'requestSnapshot' } // post one frame immediately (out-of-band)

// --- Messages OUT: worker → main thread (PLAN §8 1.1) -----------------------
// frame, diagnostics, error. Positions/velocities are transferable Float64
// arrays (PLAN §4) — ownership moves to the main thread on post, so the worker
// must allocate fresh arrays each frame (see FramePayload note).

// Structure-of-arrays state slice (PLAN §8 1.2 layout): index i's body occupies
// positions[3i], [3i+1], [3i+2]. Body id ↔ slot mapping is NOT carried per
// frame (it rarely changes and would bloat every frame); the main-thread client
// tracks it from the init/addBody/removeBody messages it issues. If a later step
// needs the worker to be the source of truth for ordering, add an `ids` field
// here — deliberately deferred to avoid per-frame overhead now.
export interface FramePayload {
  simTime: number // yr
  positions: Float64Array // length 3n, AU
  velocities: Float64Array // length 3n, AU/yr
}

// Conserved-quantity diagnostics (PLAN §1.6, surfaced by §4.3 drift badge).
// `energyDriftRel` is |ΔE/E₀| and `angularMomentumDriftRel` is |ΔL/L₀|, both vs
// the t=0 baseline. The message SHAPE is complete now (incl. the L-drift field
// the 1.8 validation asserts on); step 1.6 fills in the computed values, so
// subscribers never see a shape change.
export interface DiagnosticsPayload {
  simTime: number // yr
  energy: number // total E, canonical
  angularMomentum: number // |L|, canonical
  energyDriftRel: number // |ΔE / E₀|, dimensionless
  angularMomentumDriftRel: number // |ΔL / L₀|, dimensionless
  // Honest reporting of the sim loop's throughput (PLAN §1.7): the actual
  // sim-yr advanced per real-second. Equals the requested timescale unless the
  // per-tick substep cap throttled it, in which case `capped` is true and the
  // UI must show THIS rate, never the requested one.
  effectiveTimescale: number
  capped: boolean
}

export type EngineOutMessage =
  | ({ type: 'frame' } & FramePayload)
  | ({ type: 'diagnostics' } & DiagnosticsPayload)
  | { type: 'error'; message: string; cause?: string }

// The Transferable list to hand to postMessage for a frame, so the two
// Float64Array buffers move (zero-copy) instead of being cloned (PLAN §4).
export function frameTransferables(frame: FramePayload): Transferable[] {
  return [frame.positions.buffer, frame.velocities.buffer]
}

// --- Typed in-message factories --------------------------------------------
// The client (1.1 main-thread wrapper) and tests build messages through these
// rather than hand-writing object literals, so the discriminant is never
// mistyped and refactors are single-point. Each returns the exact union member.

export const EngineMsg = {
  init: (config: EngineConfig, bodies: EngineBody[]): EngineInMessage => ({
    type: 'init',
    config,
    bodies,
  }),
  play: (): EngineInMessage => ({ type: 'play' }),
  pause: (): EngineInMessage => ({ type: 'pause' }),
  setTimescale: (timescale: number): EngineInMessage => ({
    type: 'setTimescale',
    timescale,
  }),
  stepOnce: (): EngineInMessage => ({ type: 'stepOnce' }),
  addBody: (body: EngineBody): EngineInMessage => ({ type: 'addBody', body }),
  removeBody: (id: string): EngineInMessage => ({ type: 'removeBody', id }),
  updateBody: (
    id: string,
    changes: {
      mass?: number
      pos?: [number, number, number]
      vel?: [number, number, number]
    },
  ): EngineInMessage => ({ type: 'updateBody', id, ...changes }),
  requestSnapshot: (): EngineInMessage => ({ type: 'requestSnapshot' }),
} as const
