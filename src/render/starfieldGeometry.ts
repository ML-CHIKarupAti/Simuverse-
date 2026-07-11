// Starfield generation — PLAN §8 2.5. Pure, seeded, testable: given a seed and
// count, produces the same star field every time (determinism §2). Positions
// are on a far sphere (radius handled by the component); size/brightness/tint
// vary per star for a non-repeating look. Badge: illustrative.

// mulberry32 — small, fast, deterministic PRNG (same choice as the bench, 1.9).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface StarfieldGeometry {
  positions: Float32Array // length 3n, unit sphere directions
  sizes: Float32Array // length n
  colors: Float32Array // length 3n, RGB in [0,1]
}

// A subtle, mostly-white palette with occasional warm/cool tint — reads as a
// real sky (stars vary slightly in color) without becoming a light show.
function starTint(u: number): [number, number, number] {
  if (u < 0.75) return [1, 1, 1] // most stars: neutral white
  if (u < 0.88) return [1, 0.92, 0.8] // warm (K/M-type tint)
  return [0.8, 0.88, 1] // cool blue-white (O/B-type tint)
}

export function generateStarfield(
  count: number,
  seed: number,
): StarfieldGeometry {
  const rng = mulberry32(seed)
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    // Uniform point on a unit sphere (avoids pole clustering from naive
    // spherical-coordinate sampling): z uniform in [-1,1], azimuth uniform.
    const z = rng() * 2 - 1
    const theta = rng() * Math.PI * 2
    const r = Math.sqrt(1 - z * z)
    positions[3 * i] = r * Math.cos(theta)
    positions[3 * i + 1] = r * Math.sin(theta)
    positions[3 * i + 2] = z

    // Skewed toward small: most stars are faint points, a few are brighter.
    sizes[i] = 0.4 + Math.pow(rng(), 3) * 2.2

    const [cr, cg, cb] = starTint(rng())
    colors[3 * i] = cr
    colors[3 * i + 1] = cg
    colors[3 * i + 2] = cb
  }

  return { positions, sizes, colors }
}
