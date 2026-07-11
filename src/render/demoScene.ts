// TEMPORARY Phase-2 dev scene (see useEngineDemo). One source of truth for both
// the physics bodies the engine integrates and the render descriptors the
// meshes need (type/temperature/albedo — data the engine doesn't carry).
// Replaced by real SimObject → render derivation with the scene store / presets.

import type { EngineBody } from '../engine/protocol'
import type { ObjectType } from '../scene/schema'
import { G } from '../units/units'

export interface RenderBody {
  id: string
  type: ObjectType
  massMsun: number
  temperatureK?: number // stars
  albedo?: string // planets/moons (hex)
}

// Elliptical orbit about a 1 M☉ star, started at perihelion (real orbits are
// ellipses — Kepler). Vis-viva at perihelion: v = √( G(M+m)(1+e) / (a(1-e)) ),
// and √G = 2π. Varied eccentricities give each planet a distinct ellipse.
function elliptical(
  id: string,
  massMsun: number,
  a: number,
  e: number,
): EngineBody {
  const rPeri = a * (1 - e)
  const vPeri = Math.sqrt((G * (1 + massMsun) * (1 + e)) / (a * (1 - e)))
  return { id, mass: massMsun, pos: [rPeri, 0, 0], vel: [0, vPeri, 0] }
}

interface DemoBody {
  render: RenderBody
  engine: EngineBody
}

const DEMO_SCENE: DemoBody[] = [
  {
    render: { id: 'sun', type: 'star', massMsun: 1, temperatureK: 5772 },
    engine: { id: 'sun', mass: 1, pos: [0, 0, 0], vel: [0, 0, 0] },
  },
  {
    render: { id: 'rocky', type: 'planet', massMsun: 3e-6, albedo: '#b8a488' },
    engine: elliptical('rocky', 3e-6, 1, 0.2), // Mercury-like eccentricity
  },
  {
    render: { id: 'ocean', type: 'planet', massMsun: 6e-6, albedo: '#5a86c0' },
    engine: elliptical('ocean', 6e-6, 1.6, 0.03), // near-circular, Earth-like
  },
  {
    render: { id: 'rust', type: 'planet', massMsun: 3e-6, albedo: '#c1663f' },
    engine: elliptical('rust', 3e-6, 2.4, 0.12), // Mars-like eccentricity
  },
]

export const DEMO_ENGINE_BODIES: EngineBody[] = DEMO_SCENE.map((b) => b.engine)
export const DEMO_RENDER_BODIES: RenderBody[] = DEMO_SCENE.map((b) => b.render)

// The product UX is blank-until-commanded (PLAN §8.5 empty state; the terminal
// that inserts bodies is Phase 3). This dev scene exists ONLY to build/verify
// the Phase-2 visuals against real motion, so it is opt-in via `?demo` and the
// default deploy stays empty as designed.
export function isDemoMode(): boolean {
  return (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('demo')
  )
}
