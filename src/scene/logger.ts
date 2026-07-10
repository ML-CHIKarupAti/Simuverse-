// Logger — PLAN §8 0.8. Turns log events into readable lines, stores them in
// the scene document (the log is part of the doc, PLAN §6), and exports the
// whole log as Markdown (title + meta + config + chronological entries, with
// equations in LaTeX fences).

import type { SceneDoc, LogEvent, LogEventKind } from './schema'
import { formatValue } from '../units/units'

// Build a LogEvent. `t` is a wall-clock timestamp (epoch ms) and defaults to
// now; callers may pass it explicitly (e.g. tests) for determinism.
export function makeLogEvent(
  kind: LogEventKind,
  simTime: number,
  message: string,
  extra: {
    equation?: string
    values?: Record<string, number>
    t?: number
  } = {},
): LogEvent {
  const event: LogEvent = {
    t: extra.t ?? Date.now(),
    simTime,
    kind,
    message,
  }
  if (extra.equation !== undefined) event.equation = extra.equation
  if (extra.values !== undefined) event.values = extra.values
  return event
}

// A single readable line for the terminal / log panel: sim time + message.
// KaTeX rendering of any attached equation is the UI's job (step 4.4).
export function formatLogLine(event: LogEvent): string {
  return `[${formatValue(event.simTime)} yr] ${event.message}`
}

// Append an event to the doc's log immutably (the log is append-only, §6).
export function appendLog(doc: SceneDoc, event: LogEvent): SceneDoc {
  return { ...doc, log: [...doc.log, event] }
}

function markdownEntry(event: LogEvent): string {
  const lines = [`- **${formatValue(event.simTime)} yr** — ${event.message}`]
  if (event.values) {
    const pairs = Object.entries(event.values)
      .map(([k, v]) => `${k} = ${formatValue(v)}`)
      .join(', ')
    if (pairs.length > 0) lines.push(`  - ${pairs}`)
  }
  if (event.equation) {
    lines.push('', '  $$', `  ${event.equation}`, '  $$')
  }
  return lines.join('\n')
}

// Export the log as Markdown for download (PLAN §6: "Log export = Markdown").
export function exportLogMarkdown(doc: SceneDoc): string {
  const { meta, config, log } = doc
  const sections: string[] = [
    `# ${meta.name}`,
    '',
    `- Created: ${meta.createdAt}`,
    `- App version: ${meta.appVersion}`,
    `- Seed: ${meta.seed}`,
    '',
    '## Configuration',
    '',
    `- Integrator: ${config.integrator}`,
    `- dt: ${config.dt} yr`,
    `- Softening: ${config.softening} AU`,
    `- Timescale: ${config.timescale}`,
    '',
    '## Log',
    '',
  ]
  if (log.length === 0) {
    sections.push('_(no events)_')
  } else {
    sections.push(log.map(markdownEntry).join('\n'))
  }
  return sections.join('\n') + '\n'
}
