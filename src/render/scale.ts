// Render scale & floating origin — PLAN §8 2.3.
//
// Physics is in AU; the render world is in "render units" at RENDER_SCALE units
// per AU. three.js uses float32 for positions, which loses precision far from
// the origin and makes distant objects jitter. The FLOATING ORIGIN keeps
// rendered coordinates near zero: everything is drawn relative to `floatingOrigin`
// (an offset in AU), and when the camera target drifts past REBASE_THRESHOLD the
// offset is recentred (see FloatingOrigin.tsx).

import type { ObjectType } from '../scene/schema'

export const RENDER_SCALE = 10 // render units per AU
export const REBASE_THRESHOLD = 5000 // render units — recentre past this

const EARTH_MASS_MSUN = 3.003e-6 // 1 M⊕ in M☉ (PLAN §7)

// The current floating-origin offset in AU. Meshes subtract this before scaling;
// mutated in place on rebase so reads stay allocation-free.
export const floatingOrigin: { au: [number, number, number] } = {
  au: [0, 0, 0],
}

// Display-only body radius in RENDER UNITS — NOT physical (real radii are
// invisibly small at solar-system scale). The Methods page labels this
// "display scaling — illustrative" (PLAN §2.3). Note the differing mass bases:
// star uses M☉, planet uses M⊕, blackhole uses 10 M☉.
export function visualRadius(type: ObjectType, massMsun: number): number {
  switch (type) {
    case 'star':
      return 1.4 * Math.pow(massMsun, 0.25)
    case 'planet':
      return 0.5 * Math.pow(massMsun / EARTH_MASS_MSUN, 0.15)
    case 'moon':
      return 0.3
    case 'blackhole':
      return 1.0 * Math.pow(massMsun / 10, 0.25)
  }
}

// World position (AU) → render units, relative to a floating-origin offset (AU).
export function worldToRender(
  worldAU: readonly [number, number, number],
  originAU: readonly [number, number, number] = floatingOrigin.au,
): [number, number, number] {
  return [
    (worldAU[0] - originAU[0]) * RENDER_SCALE,
    (worldAU[1] - originAU[1]) * RENDER_SCALE,
    (worldAU[2] - originAU[2]) * RENDER_SCALE,
  ]
}

// Has the camera target (render units, relative to the current origin) drifted
// far enough to warrant a rebase?
export function needsRebase(
  targetRenderUnits: readonly [number, number, number],
): boolean {
  const [x, y, z] = targetRenderUnits
  return x * x + y * y + z * z > REBASE_THRESHOLD * REBASE_THRESHOLD
}

// Compute the recentred origin and the render-unit shift to subtract from the
// camera and controls target so the view does not jump. After applying `shift`,
// the target returns to ~0 and the new origin (AU) absorbs the difference.
export function rebase(
  originAU: readonly [number, number, number],
  targetRenderUnits: readonly [number, number, number],
): {
  originAU: [number, number, number]
  shift: [number, number, number]
} {
  return {
    originAU: [
      originAU[0] + targetRenderUnits[0] / RENDER_SCALE,
      originAU[1] + targetRenderUnits[1] / RENDER_SCALE,
      originAU[2] + targetRenderUnits[2] / RENDER_SCALE,
    ],
    shift: [targetRenderUnits[0], targetRenderUnits[1], targetRenderUnits[2]],
  }
}
