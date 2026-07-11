// Validation harness — PLAN §8 1.8. The single source of truth for the physics
// validation results: it RUNS the reference simulations and returns structured
// rows. The test (tests/validation.test.ts) asserts the thresholds and writes
// VALIDATION.md; the Methods page (§6.2) reuses these same results. Kept free of
// node APIs (no fs) so it stays isomorphic — the file write lives in the test.

import * as bodyStore from './state'
import type { BodyArrays } from './state'
import type { EngineBody } from './protocol'
import { computeForces } from './forces'
import { yoshida4Step, integratorStep } from './integrators'
import { conserved, relativeDrift } from './diagnostics'
import type { Integrator } from '../scene/schema'
import { G } from '../units/units'

const DT = 1e-4 // yr
const EPS = 1e-6 // AU
const TWO_PI = 2 * Math.PI

// ---- reference systems ----------------------------------------------------

function circular(): BodyArrays {
  const M = 1
  const m = 1e-9
  const a = 1
  const v = Math.sqrt((G * (M + m)) / a)
  return bodyStore.fromBodies([
    { id: 'star', mass: M, pos: [0, 0, 0], vel: [0, 0, 0] },
    { id: 'planet', mass: m, pos: [a, 0, 0], vel: [0, v, 0] },
  ])
}

function eccentric(): BodyArrays {
  const M = 1
  const m = 1e-9
  const a = 1
  const e = 0.6
  const rPeri = a * (1 - e)
  const vPeri = Math.sqrt((G * (M + m) * (1 + e)) / (a * (1 - e))) // vis-viva at perihelion
  return bodyStore.fromBodies([
    { id: 'star', mass: M, pos: [0, 0, 0], vel: [0, 0, 0] },
    { id: 'planet', mass: m, pos: [rPeri, 0, 0], vel: [0, vPeri, 0] },
  ])
}

// ---- raw measurements -----------------------------------------------------

function planetAngle(s: BodyArrays): number {
  return Math.atan2(s.pos[4] - s.pos[1], s.pos[3] - s.pos[0])
}

// (a) Measure the orbital period by integrating a circular orbit until the
// planet has swept a full 2π, interpolating the exact crossing time.
export function measureKeplerPeriod(): number {
  const s = circular()
  computeForces(s, EPS)
  let t = 0
  let swept = 0
  let prevSwept = 0
  let prevT = 0
  let prevAngle = planetAngle(s)
  for (let i = 0; i < 200_000 && swept < TWO_PI; i++) {
    yoshida4Step(s, DT, EPS)
    t += DT
    const ang = planetAngle(s)
    let d = ang - prevAngle
    if (d < -Math.PI) d += TWO_PI
    if (d > Math.PI) d -= TWO_PI
    prevSwept = swept
    prevT = t - DT
    swept += d
    prevAngle = ang
  }
  // Linear interpolation of the time at which swept angle == 2π.
  return prevT + ((TWO_PI - prevSwept) / (swept - prevSwept)) * DT
}

// (b) Energy & angular-momentum drift over `orbits` of an e=0.6 orbit.
export function measureDrift(
  integrator: Integrator,
  orbits: number,
): { energy: number; angular: number } {
  const s = eccentric()
  const baseline = conserved(s, EPS)
  computeForces(s, EPS)
  const steps = Math.round((orbits * 1) / DT) // T = 1 yr for a=1, M≈1
  for (let i = 0; i < steps; i++) integratorStep(integrator, s, DT, EPS)
  const drift = relativeDrift(conserved(s, EPS), baseline)
  return { energy: drift.energyDriftRel, angular: drift.angularMomentumDriftRel }
}

// FNV-1a over the raw bytes — deterministic, dependency-free (stays isomorphic).
function hashArrays(...arrays: Float64Array[]): string {
  let h = 0x811c9dc5
  for (const arr of arrays) {
    const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)
    for (let i = 0; i < bytes.length; i++) {
      h ^= bytes[i]
      h = Math.imul(h, 0x01000193) >>> 0
    }
  }
  return h.toString(16).padStart(8, '0')
}

// (c) Two runs of an identical config must produce bit-identical state.
export function determinismHashes(): { a: string; b: string } {
  const run = (): string => {
    const s = eccentric()
    computeForces(s, EPS)
    for (let i = 0; i < 5000; i++) integratorStep('yoshida4', s, DT, EPS)
    return hashArrays(s.pos, s.vel)
  }
  return { a: run(), b: run() }
}

// ---- (1.9) benchmark ------------------------------------------------------

// Seeded PRNG (mulberry32) so the benchmark SCENE is reproducible; the timing
// itself is naturally hardware-dependent (determinism §2 applies to the scene).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface BenchmarkResult {
  bodies: number
  stepsPerSec: number
  realYrPerSec: number // stepsPerSec × dt — max sustained timescale before the cap
}

// Measure raw integrator throughput for a dense random N-body cloud (PLAN §1.9).
// Uses a fixed time budget so the measurement is stable and bounded regardless
// of machine speed.
export function measureBenchmark(
  nBodies = 500,
  seed = 0xc0ffee,
): BenchmarkResult {
  const rng = mulberry32(seed)
  const bodies: EngineBody[] = []
  for (let i = 0; i < nBodies; i++) {
    bodies.push({
      id: `b${i}`,
      mass: 1e-3 + rng() * 1e-2,
      pos: [(rng() - 0.5) * 20, (rng() - 0.5) * 20, (rng() - 0.5) * 20],
      vel: [(rng() - 0.5) * 0.2, (rng() - 0.5) * 0.2, (rng() - 0.5) * 0.2],
    })
  }
  const s = bodyStore.fromBodies(bodies)
  computeForces(s, EPS)
  for (let i = 0; i < 30; i++) yoshida4Step(s, DT, EPS) // warm up the JIT

  const budgetMs = 150
  let steps = 0
  const t0 = performance.now()
  while (performance.now() - t0 < budgetMs) {
    yoshida4Step(s, DT, EPS)
    steps++
  }
  const stepsPerSec = steps / ((performance.now() - t0) / 1000)
  return { bodies: nBodies, stepsPerSec, realYrPerSec: stepsPerSec * DT }
}

// ---- assembled results ----------------------------------------------------

export interface ValidationResult {
  test: string
  target: string
  measured: string
  pass: boolean
}

export function runValidations(): ValidationResult[] {
  const period = measureKeplerPeriod()
  const periodErrRel = Math.abs(period - 1) // vs 1 yr
  const y = measureDrift('yoshida4', 100)
  const v = measureDrift('verlet', 100)
  const det = determinismHashes()

  return [
    {
      test: 'Kepler period (circular, a=1 AU, 1 M☉)',
      target: 'within 0.01% of 1 yr',
      measured: `${period.toFixed(7)} yr (${(periodErrRel * 100).toExponential(2)}% error)`,
      pass: periodErrRel < 1e-4,
    },
    {
      test: 'Energy drift — Yoshida4 (e=0.6, 100 orbits)',
      target: '|ΔE/E₀| < 1e-6',
      measured: y.energy.toExponential(2),
      pass: y.energy < 1e-6,
    },
    {
      test: 'Energy drift — Verlet (e=0.6, 100 orbits)',
      target: '|ΔE/E₀| < 1e-4',
      measured: v.energy.toExponential(2),
      pass: v.energy < 1e-4,
    },
    {
      test: 'Angular-momentum drift — Yoshida4 (100 orbits)',
      target: '|ΔL/L₀| < 1e-9',
      measured: y.angular.toExponential(2),
      pass: y.angular < 1e-9,
    },
    {
      test: 'Angular-momentum drift — Verlet (100 orbits)',
      target: '|ΔL/L₀| < 1e-9',
      measured: v.angular.toExponential(2),
      pass: v.angular < 1e-9,
    },
    {
      test: 'Determinism (two runs, same config)',
      target: 'identical Float64 state',
      measured: `${det.a} == ${det.b}`,
      pass: det.a === det.b,
    },
  ]
}

export function toValidationMarkdown(
  rows: ValidationResult[],
  bench?: BenchmarkResult,
): string {
  const lines = [
    '# Simuverse — Validation',
    '',
    '_Auto-generated by the validation harness (`tests/validation.test.ts`). Do not edit by hand._',
    '',
    'Canonical units: **AU, M☉, yr**. G = 4π². Plummer softening ε = 1e-6 AU. Fixed timestep dt = 1e-4 yr. Integrators: velocity-Verlet (2nd order), Yoshida 4th-order (default).',
    '',
    '| Test | Target | Measured | Result |',
    '| --- | --- | --- | --- |',
    ...rows.map(
      (r) =>
        `| ${r.test} | ${r.target} | ${r.measured} | ${r.pass ? '**PASS**' : '**FAIL**'} |`,
    ),
  ]
  if (bench) {
    lines.push(
      '',
      '## Performance',
      '',
      `${bench.bodies}-body N-body step (Yoshida4, dt = 1e-4 yr), measured on the development machine — indicative, hardware-dependent:`,
      '',
      `- **${Math.round(bench.stepsPerSec)} steps/sec** (≈ **${bench.realYrPerSec.toFixed(2)} simulated yr/sec** real-time before the substep cap)`,
    )
  }
  lines.push('')
  return lines.join('\n')
}
