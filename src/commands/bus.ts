// Command bus — the main-thread spine (PLAN §4). Owns the working SceneDoc,
// dispatches commands through the registry, emits events to subscribers, and
// maintains the undo/redo stacks of inverse commands. UI never mutates the doc
// directly; it dispatches commands and reacts to events.

import {
  applyCommand,
  type Command,
  type BusEvent,
} from './registry'
import type { SceneDoc } from '../scene/schema'

export type BusListener = (event: BusEvent) => void
export type Unsubscribe = () => void

export class CommandBus {
  private doc: SceneDoc
  private readonly undoStack: Command[] = []
  private readonly redoStack: Command[] = []
  private readonly listeners = new Set<BusListener>()

  constructor(initial: SceneDoc) {
    this.doc = initial
  }

  getDoc(): SceneDoc {
    return this.doc
  }

  subscribe(listener: BusListener): Unsubscribe {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(event: BusEvent): void {
    for (const listener of this.listeners) listener(event)
  }

  // Dispatch a user action. Throws CommandError on invalid input WITHOUT
  // mutating state (applyCommand validates before producing a new doc), so a
  // rejected command leaves the bus exactly as it was.
  dispatch(command: Command): BusEvent {
    const { doc, event, inverse } = applyCommand(this.doc, command)
    this.doc = doc
    this.undoStack.push(inverse)
    this.redoStack.length = 0 // a fresh action invalidates the redo history
    this.emit(event)
    return event
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  undo(): BusEvent | null {
    const inverse = this.undoStack.pop()
    if (!inverse) return null
    const result = applyCommand(this.doc, inverse)
    this.doc = result.doc
    this.redoStack.push(result.inverse) // its inverse re-does the action
    this.emit(result.event)
    return result.event
  }

  redo(): BusEvent | null {
    const command = this.redoStack.pop()
    if (!command) return null
    const result = applyCommand(this.doc, command)
    this.doc = result.doc
    this.undoStack.push(result.inverse)
    this.emit(result.event)
    return result.event
  }
}
