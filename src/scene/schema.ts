// Scene Document Schema (v1) — PLAN §6.
// Single source of truth for the scene file format. zod gives us both the
// runtime validator (used on import) and the static TypeScript types (inferred
// below), so the two can never drift. Objects are strict: unknown keys are
// rejected so a corrupted import reports the exact offending path (PLAN §4.5).

import { z } from 'zod'

// A finite number — JSON has no NaN/Infinity, and determinism (PLAN §2) forbids
// hidden non-finite state, so we reject them at the boundary.
const finite = z.number().finite()

// Canonical + display unit enum (PLAN §5). Internal math is always canonical
// (AU, Msun, yr); the others exist for stored/display quantities.
export const UnitSchema = z.enum([
  'AU',
  'Msun',
  'yr',
  'km',
  'm',
  'Rsun',
  'kg',
  's',
  'days',
  'm/s',
  'km/s',
])

// Every stored quantity is { value, unit } (PLAN §5).
export const QuantitySchema = z.strictObject({
  value: finite,
  unit: UnitSchema,
})

export const FidelityLevelSchema = z.enum([
  'exact',
  'approximate',
  'illustrative',
  'narrative',
])

export const ObjectTypeSchema = z.enum(['star', 'planet', 'moon', 'blackhole'])

export const ProvenanceSourceSchema = z.enum(['user', 'preset', 'import'])

// A 3-vector in canonical units (AU for position, AU/yr for velocity).
const Vec3Schema = z.tuple([finite, finite, finite])

// params is a map of Quantity; mass is required, the rest are optional per type.
export const ParamsSchema = z
  .record(z.string(), QuantitySchema)
  .refine((p) => Object.prototype.hasOwnProperty.call(p, 'mass'), {
    message: "params must include 'mass'",
  })

// fidelity maps an aspect name (e.g. "gravity", "lensing") to a level.
export const FidelitySchema = z.record(z.string(), FidelityLevelSchema)

export const ProvenanceSchema = z.strictObject({
  source: ProvenanceSourceSchema,
  detail: z.string().optional(),
})

export const StateSchema = z.strictObject({
  pos: Vec3Schema,
  vel: Vec3Schema,
})

export const SimObjectSchema = z.strictObject({
  id: z.string().min(1),
  type: ObjectTypeSchema,
  name: z.string().min(1),
  params: ParamsSchema,
  state: StateSchema,
  fidelity: FidelitySchema,
  provenance: ProvenanceSchema,
})

export const IntegratorSchema = z.enum(['verlet', 'yoshida4'])

export const ConfigSchema = z.strictObject({
  integrator: IntegratorSchema,
  dt: finite, // yr
  softening: finite, // AU (Plummer ε)
  timescale: finite, // simulated yr per real second
})

export const MetaSchema = z.strictObject({
  name: z.string().min(1),
  createdAt: z.string().min(1), // ISO 8601 timestamp
  appVersion: z.string().min(1),
  seed: z.number().int(), // determinism anchor (PLAN §2)
})

export const LogEventKindSchema = z.enum([
  'objectInserted',
  'paramChanged',
  'derivedComputed',
  'simStarted',
  'simPaused',
  'timescaleChanged',
  'snapshotTaken',
  'sceneImported',
  'validationRun',
])

export const LogEventSchema = z.strictObject({
  t: finite, // wall-clock epoch ms
  simTime: finite, // yr
  kind: LogEventKindSchema,
  message: z.string(),
  equation: z.string().optional(), // LaTeX/KaTeX source
  values: z.record(z.string(), finite).optional(), // named numeric values
})

// A single object's captured state within a snapshot.
export const ObjectStateSchema = z.strictObject({
  id: z.string().min(1),
  state: StateSchema,
})

export const SnapshotSchema = z.strictObject({
  simTime: finite,
  objectStates: z.array(ObjectStateSchema),
})

export const SceneDocSchema = z.strictObject({
  schemaVersion: z.literal(1),
  meta: MetaSchema,
  config: ConfigSchema,
  objects: z.array(SimObjectSchema),
  log: z.array(LogEventSchema),
  snapshots: z.array(SnapshotSchema),
})

// Inferred static types — never hand-write these; they follow the schema.
export type Unit = z.infer<typeof UnitSchema>
export type Quantity = z.infer<typeof QuantitySchema>
export type FidelityLevel = z.infer<typeof FidelityLevelSchema>
export type ObjectType = z.infer<typeof ObjectTypeSchema>
export type ProvenanceSource = z.infer<typeof ProvenanceSourceSchema>
export type Provenance = z.infer<typeof ProvenanceSchema>
export type State = z.infer<typeof StateSchema>
export type SimObject = z.infer<typeof SimObjectSchema>
export type Integrator = z.infer<typeof IntegratorSchema>
export type Config = z.infer<typeof ConfigSchema>
export type Meta = z.infer<typeof MetaSchema>
export type LogEventKind = z.infer<typeof LogEventKindSchema>
export type LogEvent = z.infer<typeof LogEventSchema>
export type ObjectState = z.infer<typeof ObjectStateSchema>
export type Snapshot = z.infer<typeof SnapshotSchema>
export type SceneDoc = z.infer<typeof SceneDocSchema>
