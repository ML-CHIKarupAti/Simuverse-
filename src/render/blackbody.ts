// Blackbody colour — PLAN §8 2.4. Maps a star's temperature (Kelvin) to an
// approximate display RGB. Fidelity: `approximate` — this is a well-known
// curve-fit to blackbody chromaticity (Tanner Helland's approximation, valid
// ~1000–40000 K), NOT a spectral radiance integral against the CIE colour-
// matching functions. Good enough that 5772 K reads warm-white and 3000 K reads
// red-orange, which is the honest claim.
//
// Source of the fit: T. Helland, "How to Convert Temperature (K) to RGB".

const MIN_K = 1000
const MAX_K = 40000

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

// Returns [r, g, b] each in [0, 1].
export function blackbodyRGB(kelvin: number): [number, number, number] {
  const t = Math.min(MAX_K, Math.max(MIN_K, kelvin)) / 100

  let r: number
  let g: number
  let b: number

  // Red
  if (t <= 66) {
    r = 255
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592)
  }

  // Green
  if (t <= 66) {
    g = 99.4708025861 * Math.log(t) - 161.1195681661
  } else {
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492)
  }

  // Blue
  if (t >= 66) {
    b = 255
  } else if (t <= 19) {
    b = 0
  } else {
    b = 138.5177312231 * Math.log(t - 10) - 305.0447927307
  }

  return [clamp01(r / 255), clamp01(g / 255), clamp01(b / 255)]
}
