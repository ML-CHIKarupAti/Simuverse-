import { describe, it, expect, beforeAll } from 'vitest'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  runValidations,
  measureBenchmark,
  toValidationMarkdown,
  type ValidationResult,
  type BenchmarkResult,
} from '../src/engine/validation'

// Regression guard, not a tight bar. Dev machine measures ~225 steps/sec for
// 500 bodies; this generous floor survives slower CI while still catching a
// pathological slowdown (e.g. an accidental O(n³) or per-step allocation). The
// honest throughput figure lives in VALIDATION.md's Performance section.
const BENCH_FLOOR_STEPS_PER_SEC = 30

// VALIDATION.md is a committed generated artifact. It is written ONLY when
// UPDATE_VALIDATION is set (regenerate with:
// `UPDATE_VALIDATION=1 pnpm exec vitest run tests/validation.test.ts`), so a
// routine `pnpm test` asserts everything but never rewrites the file — the
// non-deterministic bench number therefore can't churn the repo.
describe('validation harness (PLAN §1.8, §1.9)', () => {
  let results: ValidationResult[]
  let bench: BenchmarkResult

  beforeAll(() => {
    results = runValidations()
    bench = measureBenchmark()
    if (process.env.UPDATE_VALIDATION) {
      writeFileSync(
        join(process.cwd(), 'VALIDATION.md'),
        toValidationMarkdown(results, bench),
        'utf8',
      )
    }
  }, 120_000)

  it('(a) Kepler period is within 0.01% of 1 yr', () => {
    expect(results[0].pass).toBe(true)
  })

  it('(b) Yoshida4 energy drift < 1e-6 over 100 orbits', () => {
    expect(results[1].pass).toBe(true)
  })

  it('(b) Verlet energy drift < 1e-4 over 100 orbits', () => {
    expect(results[2].pass).toBe(true)
  })

  it('(b) Yoshida4 angular-momentum drift < 1e-9', () => {
    expect(results[3].pass).toBe(true)
  })

  it('(b) Verlet angular-momentum drift < 1e-9', () => {
    expect(results[4].pass).toBe(true)
  })

  it('(c) two identical runs hash-match (determinism)', () => {
    expect(results[5].pass).toBe(true)
  })

  it('every validation row passes', () => {
    expect(results.every((r) => r.pass)).toBe(true)
  })

  it('(1.9) 500-body integration sustains real-time throughput', () => {
    expect(bench.bodies).toBe(500)
    expect(bench.stepsPerSec).toBeGreaterThan(BENCH_FLOOR_STEPS_PER_SEC)
  })
})
