import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useOrientationStore } from '../state/orientationStore'

// Names the current view when the camera is aligned to a coordinate axis. The
// orbital plane is XY, so Z is its normal: looking down Z shows the orbits
// face-on ("TOP"), and the X/Y views are edge-on ("SIDE"). Only reports when
// closely snapped (dot > 0.998); free-orbiting shows nothing.
const AXES: { dir: THREE.Vector3; name: string }[] = [
  { dir: new THREE.Vector3(0, 0, 1), name: 'TOP' },
  { dir: new THREE.Vector3(0, 0, -1), name: 'BOTTOM' },
  { dir: new THREE.Vector3(1, 0, 0), name: 'SIDE · +X' },
  { dir: new THREE.Vector3(-1, 0, 0), name: 'SIDE · −X' },
  { dir: new THREE.Vector3(0, 1, 0), name: 'SIDE · +Y' },
  { dir: new THREE.Vector3(0, -1, 0), name: 'SIDE · −Y' },
]

const camDir = new THREE.Vector3()
const targetVec = new THREE.Vector3()

export function OrientationReadout() {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as {
    target: THREE.Vector3
  } | null

  useFrame(() => {
    targetVec.copy(controls?.target ?? targetVec.set(0, 0, 0))
    camDir.copy(camera.position).sub(targetVec).normalize()

    let best = -Infinity
    let name: string | null = null
    for (const axis of AXES) {
      const d = camDir.dot(axis.dir)
      if (d > best) {
        best = d
        name = axis.name
      }
    }
    const view = best > 0.998 ? name : null
    if (useOrientationStore.getState().view !== view) {
      useOrientationStore.getState().setView(view)
    }
  })

  return null
}
