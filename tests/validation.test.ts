import { describe, it, expect, beforeAll } from 'vitest'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  runValidations,
  toValidationMarkdown,
  type ValidationResult,
} from '../src/engine/validation'

// The heavy reference sims run once; then we both assert the thresholds AND
// write VALIDATION.md so the file always reflects the measured reality (even a
// failing run is recorded honestly, never hidden).
describe('validation harness (PLAN §1.8)', () => {
  let results: ValidationResult[]

  beforeAll(() => {
    results = runValidations()
    writeFileSync(
      join(process.cwd(), 'VALIDATION.md'),
      toValidationMarkdown(results),
      'utf8',
    )
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
})
