import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { renderPositions } from '../../../state/frameStore'
import { flareStateAt } from '../seededPhenomena'

// Maximal-only seeded solar prominences — a handful of radial plasma plumes
// that pulse on independent deterministic schedules. Each plume is a cone of
// revolution rising from a seeded surface point, so orientation is a single
// unambiguous rotation ((0,1,0) → radial direction) with no fragile roll.
//
// Determinism (PLAN §2): every plume's angle, phase, and brightness come from
// flareStateAt(objectId#i, sceneSeed, simTime) — the SAME simTime always yields
// the SAME arrangement, so pause/scrub/replay never change what is shown and
// there is no Math.random anywhere. Illustrative — decorative, not a CME model.
//
// TEMP: sceneSeed is a hardcoded placeholder (same pattern as Starfield.tsx),
// pending real meta.seed plumbing from the scene store.
const TEMP_SCENE_SEED = 1337
const PLUME_COUNT = 5
const UP = new THREE.Vector3(0, 1, 0)

interface Plume {
  id: string
  dir: THREE.Vector3 // radial unit direction in the star's local frame
  quat: THREE.Quaternion // orients the cone's +Y along dir
}

export function Flares({ objectId, radius }: { objectId: string; radius: number }) {
  const groupRef = useRef<THREE.Group>(null)

  // Seed each plume's fixed surface angle once. The angle comes from the same
  // seeded generator as its schedule, so it is deterministic and reproducible.
  const plumes = useMemo<Plume[]>(() => {
    return Array.from({ length: PLUME_COUNT }, (_, i) => {
      const id = `${objectId}#flare${i}`
      const { angleRad } = flareStateAt(id, TEMP_SCENE_SEED, 0)
      const dir = new THREE.Vector3(Math.cos(angleRad), Math.sin(angleRad), 0)
      const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir)
      return { id, dir, quat }
    })
  }, [objectId])

  useFrame(() => {
    const group = groupRef.current
    if (!group) return
    const t = renderPositions.simTime
    group.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const plume = plumes[i]
      const state = flareStateAt(plume.id, TEMP_SCENE_SEED, t)
      // A low baseline keeps the star gently active; the seeded event window
      // adds the bright flare on top.
      const level = 0.12 + state.intensity * 0.88
      const height = radius * (0.5 + level * 1.9)
      // Base of the cone sits just under the surface; centre is height/2 out.
      const center = radius * 0.94 + height * 0.5
      mesh.position.copy(plume.dir).multiplyScalar(center)
      mesh.quaternion.copy(plume.quat)
      mesh.scale.set(1, height, 1)
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = 0.12 + state.intensity * 0.65
      // Hotter (whiter) at peak, deep orange at rest — a temperature cue.
      mat.color.setRGB(1.0, 0.55 + level * 0.35, 0.25 + level * 0.35)
    })
  })

  return (
    <group ref={groupRef}>
      {plumes.map((p) => (
        <mesh key={p.id}>
          {/* Unit-height cone; scaled to the live plume height each frame. */}
          <coneGeometry args={[radius * 0.16, 1, 10, 1, true]} />
          <meshBasicMaterial
            color="#ffb060"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}
