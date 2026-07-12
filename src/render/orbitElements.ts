// Kepler orbital elements from a two-body state vector — supports the "show
// full orbit path" feature (owner request, folded into 2.7). Derives the exact
// geometric ellipse (semi-major axis, eccentricity, orientation, centre) from a
// single position+velocity sample, rather than sampling many simulated points —
// a is e are CONSERVED quantities of an unperturbed two-body orbit, so any one
// sample (e.g. the initial condition) recovers the true, unchanging ellipse.
// Standard astrodynamics formulas (e.g. Vallado, "Fundamentals of Astrodynamics
// and Applications"). Assumes a planar orbit in the XY plane (z ≈ 0) — matches
// how Simuverse's few-body scenes are currently constructed.

export interface OrbitEllipse {
  semiMajorAxis: number // AU
  eccentricity: number
  centerX: number // AU, relative to the primary (focus)
  centerY: number
  rotation: number // radians, major-axis orientation from +X
}

// mu = G · (M_primary + m_body), canonical units.
export function deriveOrbitEllipse(
  pos: readonly [number, number, number],
  vel: readonly [number, number, number],
  mu: number,
): OrbitEllipse {
  const [rx, ry] = pos
  const [vx, vy] = vel
  const r = Math.hypot(rx, ry)
  const v2 = vx * vx + vy * vy

  const energy = v2 / 2 - mu / r
  const semiMajorAxis = -mu / (2 * energy)

  // Eccentricity vector points from the focus toward periapsis; its magnitude
  // is the eccentricity: e = ((v² − μ/r)·r − (r·v)·v) / μ.
  const rDotV = rx * vx + ry * vy
  const k = v2 - mu / r
  const ex = (k * rx - rDotV * vx) / mu
  const ey = (k * ry - rDotV * vy) / mu
  const eccentricity = Math.hypot(ex, ey)
  const rotation = Math.atan2(ey, ex)

  // The ellipse's geometric centre sits toward apoapsis, offset from the focus
  // by a·e along the (negative) periapsis direction.
  const centerX = -semiMajorAxis * eccentricity * Math.cos(rotation)
  const centerY = -semiMajorAxis * eccentricity * Math.sin(rotation)

  return { semiMajorAxis, eccentricity, centerX, centerY, rotation }
}
