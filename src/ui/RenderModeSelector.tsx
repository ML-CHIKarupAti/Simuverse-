import { useRenderMode, type RenderMode } from '../state/renderModeStore'

// Render-mode selector — PLAN §8 2.7 + §8.5. A compact top-bar segmented
// control. TEMPORARY placement/styling ahead of Phase 3's real top bar, same
// pattern as the existing dev toggles (TrailsToggle etc.) — this one is a
// first-class feature though, so its copy/behaviour should carry over as-is
// when Phase 3's chrome exists, just restyled into the real top bar.
const MODES: { key: RenderMode; label: string }[] = [
  { key: 'restrained', label: 'Restrained' },
  { key: 'cinematic', label: 'Cinematic' },
  { key: 'maximal', label: 'Maximal' },
]

export function RenderModeSelector() {
  const mode = useRenderMode((s) => s.mode)
  const setMode = useRenderMode((s) => s.setMode)

  return (
    <div
      title="Render mode never affects physics."
      style={{
        position: 'fixed',
        top: 12,
        right: 16,
        display: 'flex',
        background: 'rgba(14,17,24,0.75)',
        backdropFilter: 'blur(12px)',
        border: '1px solid #232a36',
        borderRadius: 6,
        padding: 2,
        zIndex: 100,
        userSelect: 'none',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {MODES.map((m) => (
        <button
          key={m.key}
          onClick={() => setMode(m.key)}
          style={{
            fontSize: 12,
            padding: '5px 10px',
            borderRadius: 4,
            border: 'none',
            cursor: 'pointer',
            background: mode === m.key ? 'rgba(232,184,75,0.15)' : 'transparent',
            color: mode === m.key ? '#E8B84B' : '#8B95A7',
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
