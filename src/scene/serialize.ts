// Scene (de)serialization — PLAN §6: "Export = pretty-printed JSON download.
// Import = file upload → schema-validate → rebuild."

import { SceneDocSchema, type SceneDoc } from './schema'

// Serialize to the exact bytes we write to disk. We validate first so a
// malformed in-memory doc can never be exported.
export function serializeScene(doc: SceneDoc): string {
  return JSON.stringify(SceneDocSchema.parse(doc), null, 2)
}

// Parse untrusted JSON text into a validated SceneDoc. Throws a ZodError whose
// `.issues[].path` names the exact offending field (used by the import flow in
// step 4.5 to report the bad path). Throws SyntaxError on non-JSON input.
export function deserializeScene(json: string): SceneDoc {
  return SceneDocSchema.parse(JSON.parse(json))
}
