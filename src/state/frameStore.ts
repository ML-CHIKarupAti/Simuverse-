// Frame bridge — PLAN §8 2.2. The worker posts state frames on its own ~60 Hz
// tick; the render loop runs on its own rAF cadence. This store keeps the two
// most recent frames and the render layer interpolates between them, so motion
// stays smooth even when the physics rate ≠ the frame rate.
//
// Reactive slices (order) are subscribed normally; the hot per-frame data
// (prev/next positions) is read imperatively via getState() inside useFrame, so
// pushing a frame 60×/s never triggers React re-renders. The interpolated
// output lives in the plain `renderPositions` singleton that the body meshes
// (2.4) read each frame.

import { create } from 'zustand'

export interface Frame {
  simTime: number // yr
  positions: Float64Array // length 3n, AU (owned — transferred from the worker)
}

interface FrameStore {
  prev: Frame | null
  next: Frame | null
  prevArrival: number // performance.now() when prev arrived
  nextArrival: number
  order: readonly string[] // body id per slot i (frame slot 3i..3i+2)
  pushFrame: (frame: Frame) => void
  setOrder: (order: readonly string[]) => void
}

export const useFrameStore = create<FrameStore>()((set) => ({
  prev: null,
  next: null,
  prevArrival: 0,
  nextArrival: 0,
  order: [],
  pushFrame: (frame) =>
    set((s) => ({
      prev: s.next,
      prevArrival: s.nextArrival,
      next: frame,
      nextArrival: performance.now(),
    })),
  setOrder: (order) => set({ order }),
}))

// Imperative render output: the latest interpolated positions, written by
// <FrameBridge> and read by the body meshes. Kept out of the reactive store so
// updating it every frame costs nothing in React.
export const renderPositions: { array: Float64Array; simTime: number } = {
  array: new Float64Array(0),
  simTime: 0,
}

// Interpolation factor for rendering one physics-interval behind: as wall-clock
// advances from nextArrival by up to one observed interval (nextArrival −
// prevArrival), alpha sweeps 0→1, moving the display from `prev` to `next`.
// This one-frame latency is what buys smoothness when frames arrive irregularly
// or slower than the render rate.
export function interpolationAlpha(
  prevArrival: number,
  nextArrival: number,
  now: number,
): number {
  const span = nextArrival - prevArrival
  if (span <= 0) return 0
  const a = (now - nextArrival) / span
  return a < 0 ? 0 : a > 1 ? 1 : a
}

// Linear interpolation of body positions between two frames. Falls back to the
// newest frame when there is no previous frame or the body count changed
// (add/remove) so a size change snaps instead of interpolating garbage. Writes
// into `out` when it is the right size to avoid per-frame allocation.
export function lerpPositions(
  prev: Frame | null,
  next: Frame | null,
  alpha: number,
  out?: Float64Array,
): Float64Array {
  if (!next) return out && out.length === 0 ? out : new Float64Array(0)
  const n = next.positions.length
  const target = out && out.length === n ? out : new Float64Array(n)
  if (!prev || prev.positions.length !== n) {
    target.set(next.positions)
    return target
  }
  const a = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha
  const p = prev.positions
  const q = next.positions
  for (let i = 0; i < n; i++) target[i] = p[i] + a * (q[i] - p[i])
  return target
}
