// Render-mode selector — PLAN §2.7 + §8.5. A compact segmented control in the
// top bar that feels like an instrument setting, not a theme switch. Three
// labeled buttons: Restrained · Cinematic · Maximal. The active mode has a
// subtle highlight; the tooltip says exactly "Render mode never affects
// physics." per PLAN §8.5.
//
// Style: monospace, secondary text, minimal chrome — the canvas is the hero.

import { useRenderModeStore, type RenderMode } from '../state/renderModeStore'

const MODES: { key: RenderMode; label: string }[] = [
  { key: 'restrained', label: 'Restrained' },
  { key: 'cinematic', label: 'Cinematic' },
  { key: 'maximal', label: 'Maximal' },
]

export function RenderModeSelector() {
  const mode = useRenderModeStore((s) => s.mode)
  const setMode = useRenderModeStore((s) => s.setMode)

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        background: 'rgba(14,17,24,0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid #232a36',
        borderRadius: 6,
        padding: 2,
        zIndex: 100,
        userSelect: 'none',
      }}
      title="Render mode never affects physics."
    >
      {MODES.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setMode(key)}
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 11,
            letterSpacing: '0.04em',
            color: mode === key ? '#E6EAF2' : '#8b95a7',
            background:
              mode === key ? 'rgba(232,184,75,0.12)' : 'transparent',
            border: 'none',
            borderRadius: 4,
            padding: '5px 10px',
            cursor: 'pointer',
            transition: 'background 80ms, color 80ms',
          }}
          title="Render mode never affects physics."
        >
          {label}
        </button>
      ))}
    </div>
  )
}
