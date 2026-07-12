import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useRenderMode, RENDER_MODE_PRESETS } from '../state/renderModeStore'

// Postprocessing layer — PLAN §8 2.7. Bloom intensity driven by the active
// render-mode preset. Badge: illustrative (a camera/presentation effect, not
// physics). Switching modes changes this instantly; it never touches the
// engine or scene state.
export function Postprocessing() {
  const bloom = useRenderMode((s) => RENDER_MODE_PRESETS[s.mode].bloom)
  // renderPriority={1} is explicit so the orientation gizmo (priority 2) always
  // renders AFTER the composed frame and is never cleared by it (see
  // OrientationGizmo). luminanceThreshold 0.62 keeps bloom on genuinely bright
  // emissive features (star core, flares, additive glows) instead of washing
  // the whole frame — the owner rule: not a global brightness knob.
  return (
    <EffectComposer renderPriority={1}>
      <Bloom intensity={bloom} mipmapBlur luminanceThreshold={0.62} luminanceSmoothing={0.25} />
    </EffectComposer>
  )
}
