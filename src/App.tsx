import { CanvasRoot } from './render/CanvasRoot'

// App shell. For now just the hero canvas; docked panels, terminal, inspector
// and transport overlay layer on top of it in Phase 3+.
export default function App() {
  return <CanvasRoot />
}
