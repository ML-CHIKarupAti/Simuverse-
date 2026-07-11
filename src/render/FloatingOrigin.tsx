import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RENDER_SCALE, needsRebase, rebase, floatingOrigin } from './scale'

// Keeps rendered coordinates near the origin for float32 precision (PLAN §2.3).
// Each frame, if the camera target has drifted past the threshold, recentre the
// floating-origin offset and slide the camera + controls target back by the same
// amount so the view is unchanged — only the numbers get smaller.
interface ControlsLike {
  target: THREE.Vector3
  update: () => void
}

const shiftVec = new THREE.Vector3()

export function FloatingOrigin() {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as ControlsLike | null

  useFrame(() => {
    if (!controls) return
    const t = controls.target
    if (!needsRebase([t.x, t.y, t.z])) return

    const { originAU, shift } = rebase(floatingOrigin.au, [t.x, t.y, t.z])
    floatingOrigin.au = originAU
    shiftVec.set(shift[0], shift[1], shift[2])
    camera.position.sub(shiftVec)
    t.sub(shiftVec)
    controls.update()
  })

  return null
}

// Re-export so consumers importing the component also see the scale constant.
export { RENDER_SCALE }
