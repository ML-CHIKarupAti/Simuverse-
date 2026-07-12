// TEMPORARY Phase-2 dev scene (see useEngineDemo). One source of truth for the
// physics bodies the engine integrates AND the render descriptors the meshes
// need (type/temperature/albedo/visualProfile — data the engine doesn't carry).
// Replaced by real SimObject → render derivation once presets/commands exist.
//
// Showcases the 5 priority visual profiles (owner-approved, 2.7 body-aware
// redesign) so they're visible and reviewable NOW rather than dormant until
// Phase 6 presets exist: sun, earth, venus, mercury, black-hole.

import type { EngineBody } from '../engine/protocol'
import type { ObjectType } from '../scene/schema'
import type { VisualProfileKey } from './visualProfiles/types'
import { G } from '../units/units'

export interface RenderBody {
  id: string
  type: ObjectType
  massMsun: number
  temperatureK?: number // stars
  albedo?: string // planets/moons (hex) — restrained-tier / no-profile fallback colour
  visualProfile?: VisualProfileKey // explicit identity; falls back to type default
}

// Elliptical orbit about a 1 M☉ star, started at perihelion (real orbits are
// ellipses — Kepler). Vis-viva at perihelion: v = √( G(M+m)(1+e) / (a(1-e)) ),
// and √G = 2π. Assumes the companion's mass is small enough that the star
// stays effectively fixed (true for all bodies below — see the black hole's
// deliberately small demo mass).
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
    render: { id: 'sun', type: 'star', massMsun: 1, temperatureK: 5772, visualProfile: 'sun' },
    engine: { id: 'sun', mass: 1, pos: [0, 0, 0], vel: [0, 0, 0] },
  },
  {
    // Deliberately near-circular — this is what Earth's REAL orbit (e=0.0167)
    // actually looks like. Physically honest, not a rendering shortfall.
    render: {
      id: 'earth',
      type: 'planet',
      massMsun: 6e-6,
      albedo: '#5a86c0',
      visualProfile: 'earth',
    },
    engine: elliptical('earth', 6e-6, 1, 0.03),
  },
  {
    // Pale gold, matching Venus's real cloud-deck colour.
    render: {
      id: 'venus',
      type: 'planet',
      massMsun: 8e-6,
      albedo: '#d9c68a',
      visualProfile: 'venus',
    },
    engine: elliptical('venus', 8e-6, 1.6, 0.1),
  },
  {
    // Exaggerated eccentricity on purpose (real Mercury is 0.2056) so the
    // ellipse (star offset at a focus, not centered) reads at a glance.
    render: {
      id: 'mercury',
      type: 'planet',
      massMsun: 3e-6,
      albedo: '#9c9490',
      visualProfile: 'mercury',
    },
    engine: elliptical('mercury', 3e-6, 2.2, 0.55),
  },
  {
    // Small demo mass (not the catalog's real 10 M☉ default) so it stays a
    // negligible-mass companion like the planets above, rather than pulling
    // the star into a visible binary wobble — this is purely a visual-identity
    // showcase, not a physically tuned binary (that's Phase 6's bh-binary
    // preset, using the already-validated engine with real masses).
    render: { id: 'voidling', type: 'blackhole', massMsun: 0.05, visualProfile: 'black-hole' },
    engine: elliptical('voidling', 0.05, 3.2, 0.2),
  },
]

export const DEMO_ENGINE_BODIES: EngineBody[] = DEMO_SCENE.map((b) => b.engine)
export const DEMO_RENDER_BODIES: RenderBody[] = DEMO_SCENE.map((b) => b.render)

export interface DemoOrbitInfo {
  id: string
  initialPos: [number, number, number]
  initialVel: [number, number, number]
  mu: number // G·(M_primary + m_body); primary = 'sun', 1 M☉
}

// For the "show full orbit path" overlay: a, e are conserved, so the INITIAL
// state alone is enough to derive the exact ellipse (orbitElements.ts).
export const DEMO_ORBITS: DemoOrbitInfo[] = DEMO_SCENE.filter(
  (b) => b.render.type !== 'star',
).map((b) => ({
  id: b.engine.id,
  initialPos: b.engine.pos,
  initialVel: b.engine.vel,
  mu: G * (1 + b.engine.mass),
}))

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
