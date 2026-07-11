// Postprocessing layer — PLAN §2.7. Adds EffectComposer + Bloom from
// @react-three/postprocessing. All parameters are driven by the active
// RenderPreset so switching modes applies instantly. Badge: illustrative
// (bloom is a camera/presentation effect, not physics).

import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useRenderModeStore } from '../state/renderModeStore'

export function Postprocessing() {
  const bloom = useRenderModeStore((s) => s.preset.bloom)
  return (
    <EffectComposer>
      <Bloom
        intensity={bloom.intensity}
        luminanceThreshold={bloom.luminanceThreshold}
        luminanceSmoothing={bloom.luminanceSmoothing}
        mipmapBlur
      />
    </EffectComposer>
  )
}
