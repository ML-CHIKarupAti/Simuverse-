// Insert semantics — Phase 0 capstone (PLAN §7 "Insert semantics", Phase 0
// acceptance). Bridges the syntax-only parser (0.6) and the pure command
// registry (0.5): a ParsedCommand `insert` becomes a schema-valid SimObject
// via catalog defaults (0.7) and command-input mass aliases (Me/M⊕ → Msun);
// `around=<id|name>` + `a=` computes canonical pos/vel via vis-viva; the
// insert is applied immutably and objectInserted / derivedComputed events are
// appended to the doc's log (0.8). The log is a lab notebook: applying the
// returned inverse (undo) removes the object but never erases log history.

import type { ParsedCommand, ParsedValue, Scalar } from './parser'
import {
  applyCommand,
  CommandError,
  type Command,
  type BusEvent,
} from './registry'
import {
  ObjectTypeSchema,
  SimObjectSchema,
  UnitSchema,
  type ObjectType,
  type Quantity,
  type SceneDoc,
  type SimObject,
  type Unit,
} from '../scene/schema'
import {
  DERIVED,
  EARTH_MASS_MSUN,
  makeDefaultFidelity,
  makeDefaultParams,
} from '../scene/catalog'
import { G, formatQuantity, formatValue, toCanonical } from '../units/units'
import { appendLog, makeLogEvent } from '../scene/logger'

// Keys consumed by the insert layer itself; everything else is an object param.
const DIRECTIVE_KEYS = new Set(['a', 'e', 'around', 'pos', 'vel', 'name'])

// Command-input unit aliases (PLAN §7 `mass=1Me`). The stored unit enum has no
// Earth-mass unit, so aliases resolve to Msun at this boundary.
const UNIT_ALIASES: Record<string, { factor: number; unit: Unit }> = {
  Me: { factor: EARTH_MASS_MSUN, unit: 'Msun' },
  'M⊕': { factor: EARTH_MASS_MSUN, unit: 'Msun' },
  Mearth: { factor: EARTH_MASS_MSUN, unit: 'Msun' },
  'M☉': { factor: 1, unit: 'Msun' },
}

const LENGTH_UNITS: ReadonlySet<Unit> = new Set(['AU', 'km', 'm', 'Rsun'])
const VELOCITY_UNITS: ReadonlySet<Unit> = new Set(['m/s', 'km/s'])

type Vec3 = [number, number, number]

// Resolve `around=<ref>` — exact id match first, then case-insensitive name.
function resolveObject(doc: SceneDoc, ref: string): SimObject {
  const byId = doc.objects.find((o) => o.id === ref)
  if (byId) return byId
  const lower = ref.toLowerCase()
  const byName = doc.objects.filter((o) => o.name.toLowerCase() === lower)
  if (byName.length === 1) return byName[0]
  if (byName.length > 1) {
    throw new CommandError(`'${ref}' is ambiguous (${byName.length} objects)`)
  }
  throw new CommandError(`no object with id or name '${ref}'`)
}

// Deterministic ids (CLAUDE.md non-negotiable 2): type-scoped counters, never
// random. `star-1`, `planet-2`, … skipping any id already taken.
function nextId(doc: SceneDoc, type: ObjectType): string {
  for (let n = 1; ; n++) {
    const id = `${type}-${n}`
    if (!doc.objects.some((o) => o.id === id)) return id
  }
}

// Turn a parsed scalar into a stored Quantity: resolve aliases, validate the
// unit against the schema enum, or adopt the catalog default's unit when the
// input has none (e.g. `radius=2` on a star means 2 Rsun).
function toQuantity(
  key: string,
  scalar: Scalar,
  defaults: Record<string, Quantity>,
): Quantity {
  if (scalar.unit === undefined) {
    const fallback = defaults[key]
    if (!fallback) {
      throw new CommandError(`param '${key}' needs a unit (e.g. ${key}=1AU)`)
    }
    return { value: scalar.value, unit: fallback.unit }
  }
  const alias = UNIT_ALIASES[scalar.unit]
  if (alias) return { value: scalar.value * alias.factor, unit: alias.unit }
  const parsed = UnitSchema.safeParse(scalar.unit)
  if (!parsed.success) {
    throw new CommandError(`unknown unit '${scalar.unit}' for param '${key}'`)
  }
  return { value: scalar.value, unit: parsed.data }
}

// Canonical length in AU from a directive scalar (bare numbers mean AU).
function toCanonicalLength(key: string, scalar: Scalar): number {
  if (scalar.unit === undefined) return scalar.value
  const parsed = UnitSchema.safeParse(scalar.unit)
  if (!parsed.success || !LENGTH_UNITS.has(parsed.data)) {
    throw new CommandError(`'${key}' needs a length unit, got '${scalar.unit}'`)
  }
  return toCanonical({ value: scalar.value, unit: parsed.data })
}

function expectScalar(key: string, value: ParsedValue): Scalar {
  if (value.kind !== 'scalar') {
    throw new CommandError(`'${key}' must be a number, got a ${value.kind}`)
  }
  return value
}

// A pos=/vel= tuple → canonical Vec3. Bare components are already canonical
// (AU or AU/yr); unit suffixes must be of the right dimension.
function toVec3(
  key: string,
  value: ParsedValue,
  allowed: ReadonlySet<Unit>,
): Vec3 {
  if (value.kind !== 'tuple' || value.items.length !== 3) {
    throw new CommandError(`'${key}' must be a 3-tuple, e.g. ${key}=(1,0,0)`)
  }
  return value.items.map((item) => {
    if (item.unit === undefined) return item.value
    const parsed = UnitSchema.safeParse(item.unit)
    if (!parsed.success || !allowed.has(parsed.data)) {
      throw new CommandError(`bad unit '${item.unit}' in '${key}' tuple`)
    }
    return toCanonical({ value: item.value, unit: parsed.data })
  }) as Vec3
}

interface OrbitPlacement {
  center: SimObject
  aAU: number
  e: number
  speed: number // |v| relative to the center, AU/yr
  periodYr: number
}

// Orbital-element insertion (PLAN §7): place the body at perihelion of the
// specified orbit, r = a(1−e) along +x from the center, prograde velocity
// along +y from vis-viva v² = μ(2/r − 1/a) with μ = G(M_center + m).
function planOrbit(
  doc: SceneDoc,
  parsed: ParsedCommand,
  massMsun: number,
): OrbitPlacement | null {
  const around = parsed.params.around
  const a = parsed.params.a
  if (!around && !a) return null
  if (!around) throw new CommandError(`'a' requires around=<id|name>`)
  if (!a) throw new CommandError(`around= requires a=<semi-major axis>`)
  if (parsed.params.pos || parsed.params.vel) {
    throw new CommandError(`around= cannot be combined with pos=/vel=`)
  }
  if (around.kind !== 'word') {
    throw new CommandError(`around= must name an object`)
  }
  const center = resolveObject(doc, around.text)
  const aAU = toCanonicalLength('a', expectScalar('a', a))
  if (!(aAU > 0)) throw new CommandError(`'a' must be positive`)
  let e = 0
  if (parsed.params.e) {
    const scalar = expectScalar('e', parsed.params.e)
    if (scalar.unit !== undefined) {
      throw new CommandError(`'e' is dimensionless`)
    }
    e = scalar.value
    if (!(e >= 0 && e < 1)) {
      throw new CommandError(`'e' must be in [0, 1) for a bound orbit`)
    }
  }
  const centerMass = toCanonical(center.params.mass)
  const mu = G * (centerMass + massMsun)
  const r = aAU * (1 - e)
  const speed = Math.sqrt(mu * (2 / r - 1 / aAU))
  const periodYr = DERIVED.orbitalPeriod.compute(aAU, centerMass + massMsun)
  return { center, aAU, e, speed, periodYr }
}

export interface InsertOutcome {
  doc: SceneDoc // insert applied + log events appended
  object: SimObject
  event: BusEvent
  inverse: Command // remove — undoing keeps the log (append-only notebook)
}

// The Phase-0 acceptance path: ParsedCommand → SimObject → applied doc + log.
// Pure: same doc + parsed + opts ⇒ identical outcome (pass `t` in tests).
export function insertFromParsed(
  doc: SceneDoc,
  parsed: ParsedCommand,
  opts: { simTime?: number; t?: number } = {},
): InsertOutcome {
  if (parsed.verb !== 'insert') {
    throw new CommandError(`expected verb 'insert', got '${parsed.verb}'`)
  }
  const typeArg = parsed.args[0]
  if (!typeArg) {
    throw new CommandError(
      `insert needs an object type (star|planet|moon|blackhole)`,
    )
  }
  const type = ObjectTypeSchema.safeParse(typeArg)
  if (!type.success) throw new CommandError(`unknown object type '${typeArg}'`)

  // Catalog defaults, then user params on top (mass aliases resolved here).
  const params = makeDefaultParams(type.data)
  for (const [key, value] of Object.entries(parsed.params)) {
    if (DIRECTIVE_KEYS.has(key)) continue
    params[key] = toQuantity(key, expectScalar(key, value), params)
  }

  const id = nextId(doc, type.data)
  const nameValue = parsed.params.name
  if (nameValue && nameValue.kind !== 'word') {
    throw new CommandError(`name= must be a word`)
  }
  const name = nameValue?.kind === 'word' ? nameValue.text : id

  const orbit = planOrbit(doc, parsed, toCanonical(params.mass))
  let pos: Vec3 = [0, 0, 0]
  let vel: Vec3 = [0, 0, 0]
  if (orbit) {
    const { center } = orbit
    const r = orbit.aAU * (1 - orbit.e)
    pos = [center.state.pos[0] + r, center.state.pos[1], center.state.pos[2]]
    vel = [
      center.state.vel[0],
      center.state.vel[1] + orbit.speed,
      center.state.vel[2],
    ]
  } else {
    if (parsed.params.pos) pos = toVec3('pos', parsed.params.pos, LENGTH_UNITS)
    if (parsed.params.vel) {
      vel = toVec3('vel', parsed.params.vel, VELOCITY_UNITS)
    }
  }

  const candidate: SimObject = {
    id,
    type: type.data,
    name,
    params,
    state: { pos, vel },
    fidelity: makeDefaultFidelity(type.data),
    provenance: { source: 'user', detail: `insert ${type.data}` },
  }
  const checked = SimObjectSchema.safeParse(candidate)
  if (!checked.success) {
    throw new CommandError(`invalid object: ${checked.error.message}`)
  }

  const applied = applyCommand(doc, { kind: 'insert', object: checked.data })

  const simTime = opts.simTime ?? 0
  const orbitNote = orbit
    ? ` in orbit around '${orbit.center.name}' (a = ${formatValue(orbit.aAU)} AU, e = ${formatValue(orbit.e)}, |v| = ${formatValue(orbit.speed)} AU/yr)`
    : ''
  let next = appendLog(
    applied.doc,
    makeLogEvent(
      'objectInserted',
      simTime,
      `inserted ${type.data} '${name}' (mass = ${formatQuantity(params.mass)})${orbitNote}`,
      { t: opts.t },
    ),
  )
  if (orbit) {
    next = appendLog(
      next,
      makeLogEvent(
        'derivedComputed',
        simTime,
        `derived orbital period for '${name}': T = ${formatValue(orbit.periodYr)} yr`,
        {
          equation: DERIVED.orbitalPeriod.katex,
          values: { T: orbit.periodYr },
          t: opts.t,
        },
      ),
    )
  }

  return {
    doc: next,
    object: checked.data,
    event: applied.event,
    inverse: applied.inverse,
  }
}
