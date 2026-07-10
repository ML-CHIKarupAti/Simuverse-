// Command registry — the pure core of the command/event bus (PLAN §4).
// Every user action becomes a Command. A handler validates it, applies it to a
// SceneDoc immutably, and returns (new doc, emitted event, inverse command).
// The inverse command is what the undo stack stores (PLAN §8 0.5:
// insert↔remove, set↔set-previous). Handlers never mutate their input.

import type { SceneDoc, SimObject, Quantity } from '../scene/schema'

// Thrown on validation failure. The bus lets this propagate so callers (the
// terminal in 3.2) can surface the message as an error line.
export class CommandError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CommandError'
  }
}

// Commands operate on the scene document directly with explicit payloads. The
// string parser (0.6) and catalog defaults (0.7) sit ABOVE this layer and
// produce these commands; this layer knows nothing about text or defaults.
export type Command =
  | { kind: 'insert'; object: SimObject; at?: number }
  | { kind: 'remove'; id: string }
  | { kind: 'set'; id: string; key: string; value: Quantity }

// Domain events emitted to subscribers (logger, panels, undo — PLAN §4).
export type BusEvent =
  | { type: 'objectInserted'; object: SimObject }
  | { type: 'objectRemoved'; object: SimObject }
  | {
      type: 'paramChanged'
      id: string
      key: string
      value: Quantity
      previous: Quantity
    }

export interface CommandResult {
  doc: SceneDoc
  event: BusEvent
  inverse: Command
}

function findIndexById(doc: SceneDoc, id: string): number {
  const index = doc.objects.findIndex((o) => o.id === id)
  if (index === -1) throw new CommandError(`no object with id '${id}'`)
  return index
}

function insertObjectAt(
  objects: readonly SimObject[],
  object: SimObject,
  at: number | undefined,
): SimObject[] {
  const next = [...objects]
  if (at === undefined || at < 0 || at > next.length) {
    next.push(object)
  } else {
    next.splice(at, 0, object)
  }
  return next
}

function applyInsert(
  doc: SceneDoc,
  cmd: Extract<Command, { kind: 'insert' }>,
): CommandResult {
  if (doc.objects.some((o) => o.id === cmd.object.id)) {
    throw new CommandError(`object id '${cmd.object.id}' already exists`)
  }
  return {
    doc: { ...doc, objects: insertObjectAt(doc.objects, cmd.object, cmd.at) },
    event: { type: 'objectInserted', object: cmd.object },
    inverse: { kind: 'remove', id: cmd.object.id },
  }
}

function applyRemove(
  doc: SceneDoc,
  cmd: Extract<Command, { kind: 'remove' }>,
): CommandResult {
  const index = findIndexById(doc, cmd.id)
  const object = doc.objects[index]
  return {
    doc: { ...doc, objects: doc.objects.filter((o) => o.id !== cmd.id) },
    event: { type: 'objectRemoved', object },
    // Re-insert at the original index so remove→undo is exact.
    inverse: { kind: 'insert', object, at: index },
  }
}

function applySet(
  doc: SceneDoc,
  cmd: Extract<Command, { kind: 'set' }>,
): CommandResult {
  const index = findIndexById(doc, cmd.id)
  const object = doc.objects[index]
  if (!Object.prototype.hasOwnProperty.call(object.params, cmd.key)) {
    throw new CommandError(`object '${cmd.id}' has no param '${cmd.key}'`)
  }
  const previous = object.params[cmd.key]
  const updated: SimObject = {
    ...object,
    params: { ...object.params, [cmd.key]: cmd.value },
  }
  return {
    doc: {
      ...doc,
      objects: doc.objects.map((o, i) => (i === index ? updated : o)),
    },
    event: {
      type: 'paramChanged',
      id: cmd.id,
      key: cmd.key,
      value: cmd.value,
      previous,
    },
    inverse: { kind: 'set', id: cmd.id, key: cmd.key, value: previous },
  }
}

// Validate → apply → produce (doc, event, inverse). Exhaustive over Command.
export function applyCommand(doc: SceneDoc, cmd: Command): CommandResult {
  switch (cmd.kind) {
    case 'insert':
      return applyInsert(doc, cmd)
    case 'remove':
      return applyRemove(doc, cmd)
    case 'set':
      return applySet(doc, cmd)
  }
}
