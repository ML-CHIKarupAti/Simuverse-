import { CanvasRoot } from './render/CanvasRoot'
import { RenderModeSelector } from './ui/RenderModeSelector'

// App shell. The hero canvas is full-bleed; UI layers on top. Phase 3+ adds
// docked panels, terminal, inspector, and transport overlay. Step 2.7 adds the
// render-mode selector (top-right) as the first piece of app chrome.
export default function App() {
  return (
    <>
      <CanvasRoot />
      <RenderModeSelector />
    </>
  )
}
