// TEMPORARY Phase-2 dev scenes (see useEngineDemo). One source of truth for the
// physics bodies the engine integrates AND the render descriptors the meshes
// need (type/temperature/albedo/visualProfile — data the engine doesn't carry).
// DELETED once the Phase 3 terminal lands: the real product is blank-until-
// commanded, and users insert bodies via commands/presets.
//
// Two nature-oriented variants (owner rule: systems must be plausible — you do
// not find a black hole casually orbiting inside a planetary system):
//   ?demo     — inner solar system with REAL values (PLAN §6.1): Sun, then
//               Mercury (innermost, brown-grey), Venus (orange-gold), Earth
//               (blue), Mars (rust) — correct order, correct identities.
//   ?demo=bh  — black-hole binary: a 10 M☉ black hole and a 1 M☉ companion
//               star orbiting their common barycenter (an X-ray-binary-style
//               pairing — real astrophysics, and the honest way to showcase
//               the black-hole visual profile).

import type { EngineBody } from '../engine/protocol'
import type { ObjectType } from '../scene/schema'
import type { VisualProfileKey } from './visualProfiles/types'
import { G } from '../units/units'

export interface RenderBody {
  id: string
  type: ObjectType
  massMsun: number
  temperatureK?: number // stars
  albedo?: string // planets/moons (hex) — also colours trails/orbit lines
  visualProfile?: VisualProfileKey // explicit identity; falls back to type default
}

interface DemoBody {
  render: RenderBody
  engine: EngineBody
}

export type DemoVariant = 'solar' | 'bh' | null

// Which demo (if any) the URL asks for. The product UX is blank-until-
// commanded (PLAN §8.5 empty state; the terminal that inserts bodies is
// Phase 3), so both scenes are opt-in and the default deploy stays empty.
export function demoVariant(): DemoVariant {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  if (!params.has('demo')) return null
  return params.get('demo') === 'bh' ? 'bh' : 'solar'
}

export function isDemoMode(): boolean {
  return demoVariant() !== null
}

// Elliptical orbit about a primary at the origin, started at perihelion (real
// orbits are ellipses — Kepler). Vis-viva at perihelion:
// v = √( G(M+m)(1+e) / (a(1−e)) ). `phaseDeg` rotates the whole initial state
// (position AND velocity) about +Z, pointing each orbit's major axis a
// different way so the planets don't start stacked on one ray — the physics is
// exact either way; this is purely visual separation (same idea as PLAN §6.1's
// spread anomalies).
function elliptical(
  id: string,
  massMsun: number,
  a: number,
  e: number,
  phaseDeg = 0,
  primaryMassMsun = 1,
): EngineBody {
  const rPeri = a * (1 - e)
  const vPeri = Math.sqrt(
    (G * (primaryMassMsun + massMsun) * (1 + e)) / (a * (1 - e)),
  )
  const phi = (phaseDeg * Math.PI) / 180
  const c = Math.cos(phi)
  const s = Math.sin(phi)
  return {
    id,
    mass: massMsun,
    pos: [rPeri * c, rPeri * s, 0],
    vel: [-vPeri * s, vPeri * c, 0],
  }
}

// ── Variant 1: inner solar system — REAL values (PLAN §6.1) ────────────────
// Masses, semi-major axes, and eccentricities are the real ones; surface looks
// come from each body's visual profile. Phases spread 0/72/144/216 for visual
// separation. (Registry baseColors override albedo on named bodies; albedo
// still colours each body's trail and orbit line.)
const SOLAR_SCENE: DemoBody[] = [
  {
    render: { id: 'sun', type: 'star', massMsun: 1, temperatureK: 5772, visualProfile: 'sun' },
    engine: { id: 'sun', mass: 1, pos: [0, 0, 0], vel: [0, 0, 0] },
  },
  {
    render: {
      id: 'mercury',
      type: 'planet',
      massMsun: 1.66e-7,
      albedo: '#9a8a78',
      visualProfile: 'mercury',
    },
    engine: elliptical('mercury', 1.66e-7, 0.3871, 0.2056, 0),
  },
  {
    render: {
      id: 'venus',
      type: 'planet',
      massMsun: 2.448e-6,
      albedo: '#e0a050',
      visualProfile: 'venus',
    },
    engine: elliptical('venus', 2.448e-6, 0.7233, 0.0068, 72),
  },
  {
    render: {
      id: 'earth',
      type: 'planet',
      massMsun: 3.003e-6,
      albedo: '#5a86c0',
      visualProfile: 'earth',
    },
    engine: elliptical('earth', 3.003e-6, 1.0, 0.0167, 144),
  },
  {
    render: {
      id: 'mars',
      type: 'planet',
      massMsun: 3.227e-7,
      albedo: '#c1663f',
      visualProfile: 'mars',
    },
    engine: elliptical('mars', 3.227e-7, 1.5237, 0.0934, 216),
  },
]

// ── Variant 2: black-hole binary (barycentric, momentum-free) ──────────────
// A 10 M☉ black hole with a 1 M☉ companion star, both placed on their shared
// barycenter with velocities scaled by the opposite mass fraction so total
// momentum is exactly zero — the system orbits in place instead of drifting.
function bhBinaryScene(): DemoBody[] {
  const M = 10 // black hole, M☉
  const m = 1 // companion star, M☉
  const a = 1.6 // AU, relative orbit
  const e = 0.35
  const rPeri = a * (1 - e)
  const vPeri = Math.sqrt((G * (M + m) * (1 + e)) / (a * (1 - e))) // relative speed
  const fBH = m / (M + m) // black hole's share of separation/speed
  const fStar = M / (M + m)
  return [
    {
      render: { id: 'voidheart', type: 'blackhole', massMsun: M, visualProfile: 'black-hole' },
      engine: {
        id: 'voidheart',
        mass: M,
        pos: [-rPeri * fBH, 0, 0],
        vel: [0, -vPeri * fBH, 0],
      },
    },
    {
      render: {
        id: 'companion',
        type: 'star',
        massMsun: m,
        temperatureK: 4300, // orange K-type companion — reads distinct from the Sun
        visualProfile: 'generic-star',
      },
      engine: {
        id: 'companion',
        mass: m,
        pos: [rPeri * fStar, 0, 0],
        vel: [0, vPeri * fStar, 0],
      },
    },
  ]
}

const DEMO_SCENE: DemoBody[] = demoVariant() === 'bh' ? bhBinaryScene() : SOLAR_SCENE

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
// Solar variant only — in the barycentric binary neither body orbits a fixed
// primary at the origin, so the single-primary ellipse derivation doesn't
// apply; the overlay is intentionally absent there rather than wrong.
export const DEMO_ORBITS: DemoOrbitInfo[] =
  demoVariant() === 'bh'
    ? []
    : SOLAR_SCENE.filter((b) => b.render.type !== 'star').map((b) => ({
        id: b.engine.id,
        initialPos: b.engine.pos,
        initialVel: b.engine.vel,
        mu: G * (1 + b.engine.mass),
      }))
