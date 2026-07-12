// Seeded, deterministic illustrative phenomena (e.g. solar flares) — PURE
// functions of (objectId, sceneSeed, simTimeYr). No Math.random, no wall-clock
// timers: the SAME simTime always produces the SAME visual state, so pausing,
// scrubbing, or replaying a scene never changes what's shown. This is what
// makes "seeded illustrative phenomena" honest rather than a random light show.

// FNV-1a string hash — deterministic, dependency-free (same family as the hash
// already used in the validation harness for state bytes).
function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function objectSeed(objectId: string, sceneSeed: number): number {
  return (hashString(objectId) ^ sceneSeed) >>> 0
}

export interface FlareState {
  active: boolean
  intensity: number // 0 (off) .. 1 (peak), smooth ramp within the event window
  angleRad: number // seeded surface position, fixed per object
}

const FLARE_PERIOD_YR = 0.18 // recurrence cadence, in simulated years
const FLARE_DURATION_YR = 0.03 // how long a single flare lasts

// Deterministic recurring flare state at a given simulated time. Each object
// gets its own seeded phase offset and surface angle (derived once from its id
// + the scene seed), so multiple stars don't flare in lockstep and a re-run
// with the same seed reproduces the identical sequence.
export function flareStateAt(
  objectId: string,
  sceneSeed: number,
  simTimeYr: number,
): FlareState {
  const rng = mulberry32(objectSeed(objectId, sceneSeed))
  const phaseOffset = rng() * FLARE_PERIOD_YR
  const angleRad = rng() * Math.PI * 2

  const raw = (simTimeYr + phaseOffset) % FLARE_PERIOD_YR
  const t = raw < 0 ? raw + FLARE_PERIOD_YR : raw // positive modulo
  const active = t < FLARE_DURATION_YR
  const intensity = active ? Math.sin((t / FLARE_DURATION_YR) * Math.PI) : 0

  return { active, intensity, angleRad }
}
