import { useFrame } from '@react-three/fiber'
import {
  useFrameStore,
  renderPositions,
  interpolationAlpha,
  lerpPositions,
} from '../state/frameStore'

// Runs inside the <Canvas>. Every render frame it reads the two latest worker
// frames imperatively and writes the interpolated positions into the shared
// `renderPositions` buffer for the body meshes (2.4) to consume. Renders nothing
// itself.
export function FrameBridge() {
  useFrame(() => {
    const { prev, next, prevArrival, nextArrival } = useFrameStore.getState()
    if (!next) return
    const alpha = interpolationAlpha(prevArrival, nextArrival, performance.now())
    renderPositions.array = lerpPositions(prev, next, alpha, renderPositions.array)
    renderPositions.simTime = next.simTime
  })
  return null
}
