// Engine state layout — PLAN §8 1.2. Structure-of-arrays for the physics state:
// mass[n], pos[3n], vel[3n], acc[3n] as Float64Array, plus the parallel id list.
// Body i occupies mass[i] and pos/vel/acc[3i..3i+2]. This is the layout the
// force kernel (1.3) and integrators (1.4/1.5) read and write directly.
//
// Structural changes (add/remove) REBUILD the arrays (n is small — PLAN §1.2).
// All operations are pure: they return a fresh BodyArrays and never mutate the
// input, so the reducer stays immutable and frames stay transfer-safe.

import type { EngineBody } from './protocol'

export interface BodyArrays {
  n: number
  ids: string[] // length n
  mass: Float64Array // length n, Msun
  pos: Float64Array // length 3n, AU
  vel: Float64Array // length 3n, AU/yr
  acc: Float64Array // length 3n, AU/yr² — zero until the force kernel (1.3)
}

export function fromBodies(bodies: readonly EngineBody[]): BodyArrays {
  const n = bodies.length
  const ids = new Array<string>(n)
  const mass = new Float64Array(n)
  const pos = new Float64Array(3 * n)
  const vel = new Float64Array(3 * n)
  const acc = new Float64Array(3 * n)
  for (let i = 0; i < n; i++) {
    const b = bodies[i]
    ids[i] = b.id
    mass[i] = b.mass
    pos.set(b.pos, 3 * i)
    vel.set(b.vel, 3 * i)
  }
  return { n, ids, mass, pos, vel, acc }
}

export function toBodies(s: BodyArrays): EngineBody[] {
  const out: EngineBody[] = []
  for (let i = 0; i < s.n; i++) {
    out.push({
      id: s.ids[i],
      mass: s.mass[i],
      pos: [s.pos[3 * i], s.pos[3 * i + 1], s.pos[3 * i + 2]],
      vel: [s.vel[3 * i], s.vel[3 * i + 1], s.vel[3 * i + 2]],
    })
  }
  return out
}

export function indexOf(s: BodyArrays, id: string): number {
  return s.ids.indexOf(id)
}

export function addBody(s: BodyArrays, body: EngineBody): BodyArrays {
  const n = s.n + 1
  const ids = [...s.ids, body.id]
  const mass = new Float64Array(n)
  const pos = new Float64Array(3 * n)
  const vel = new Float64Array(3 * n)
  const acc = new Float64Array(3 * n)
  mass.set(s.mass)
  pos.set(s.pos)
  vel.set(s.vel)
  acc.set(s.acc) // preserve existing acc; the new body's stays zero
  mass[s.n] = body.mass
  pos.set(body.pos, 3 * s.n)
  vel.set(body.vel, 3 * s.n)
  return { n, ids, mass, pos, vel, acc }
}

export function removeBody(s: BodyArrays, id: string): BodyArrays {
  const idx = s.ids.indexOf(id)
  if (idx === -1) return s
  const n = s.n - 1
  const ids = s.ids.filter((_, i) => i !== idx)
  const mass = new Float64Array(n)
  const pos = new Float64Array(3 * n)
  const vel = new Float64Array(3 * n)
  const acc = new Float64Array(3 * n)
  let w = 0
  for (let i = 0; i < s.n; i++) {
    if (i === idx) continue
    mass[w] = s.mass[i]
    for (let k = 0; k < 3; k++) {
      pos[3 * w + k] = s.pos[3 * i + k]
      vel[3 * w + k] = s.vel[3 * i + k]
      acc[3 * w + k] = s.acc[3 * i + k]
    }
    w++
  }
  return { n, ids, mass, pos, vel, acc }
}

export function updateBody(
  s: BodyArrays,
  id: string,
  changes: {
    mass?: number
    pos?: [number, number, number]
    vel?: [number, number, number]
  },
): BodyArrays {
  const idx = s.ids.indexOf(id)
  if (idx === -1) return s
  const mass = new Float64Array(s.mass)
  const pos = new Float64Array(s.pos)
  const vel = new Float64Array(s.vel)
  const acc = new Float64Array(s.acc)
  if (changes.mass !== undefined) mass[idx] = changes.mass
  if (changes.pos) pos.set(changes.pos, 3 * idx)
  if (changes.vel) vel.set(changes.vel, 3 * idx)
  return { n: s.n, ids: [...s.ids], mass, pos, vel, acc }
}

// Fresh copies of pos/vel for a frame. Copies (not views) because the buffers
// are transferred (detached) on postMessage — a view would kill the store.
export function frameArrays(s: BodyArrays): {
  positions: Float64Array
  velocities: Float64Array
} {
  return { positions: new Float64Array(s.pos), velocities: new Float64Array(s.vel) }
}

// A deep copy of the store. The sim loop clones once per tick, then the
// integrator mutates the clone in place across substeps (no per-step
// allocation), keeping the reducer externally immutable.
export function cloneStore(s: BodyArrays): BodyArrays {
  return {
    n: s.n,
    ids: [...s.ids],
    mass: new Float64Array(s.mass),
    pos: new Float64Array(s.pos),
    vel: new Float64Array(s.vel),
    acc: new Float64Array(s.acc),
  }
}
