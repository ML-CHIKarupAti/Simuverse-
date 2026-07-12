import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useRenderMode, RENDER_MODE_PRESETS } from '../state/renderModeStore'

// Postprocessing layer — PLAN §8 2.7. Bloom intensity driven by the active
// render-mode preset. Badge: illustrative (a camera/presentation effect, not
// physics). Switching modes changes this instantly; it never touches the
// engine or scene state.
export function Postprocessing() {
  const bloom = useRenderMode((s) => RENDER_MODE_PRESETS[s.mode].bloom)
  return (
    <EffectComposer>
      <Bloom intensity={bloom} mipmapBlur luminanceThreshold={0.4} luminanceSmoothing={0.3} />
    </EffectComposer>
  )
}
