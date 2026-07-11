import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { blackbodyRGB } from './blackbody'
import { visualRadius, RENDER_SCALE, floatingOrigin } from './scale'
import { useFrameStore, renderPositions } from '../state/frameStore'
import { useSelectionStore } from '../state/selectionStore'
import type { RenderBody } from './demoScene'

// One sphere per body (PLAN §8 2.4). Position comes from the interpolated frame
// (renderPositions, in AU) transformed through the floating origin + render
// scale each frame. Material is chosen by type; stars glow with a blackbody
// colour, black holes are pure black, planets/moons are lit standard surfaces.
export function BodyMesh({ body }: { body: RenderBody }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const selected = useSelectionStore((s) => s.selectedId === body.id)
  const select = useSelectionStore((s) => s.select)
  const radius = visualRadius(body.type, body.massMsun)

  const emissive = useMemo(() => {
    if (body.type !== 'star') return null
    const [r, g, b] = blackbodyRGB(body.temperatureK ?? 5772)
    return new THREE.Color(r, g, b)
  }, [body.type, body.temperatureK])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const order = useFrameStore.getState().order
    const slot = order.indexOf(body.id)
    const p = renderPositions.array
    if (slot < 0 || p.length < 3 * slot + 3) return
    const o = floatingOrigin.au
    mesh.position.set(
      (p[3 * slot] - o[0]) * RENDER_SCALE,
      (p[3 * slot + 1] - o[1]) * RENDER_SCALE,
      (p[3 * slot + 2] - o[2]) * RENDER_SCALE,
    )
  })

  return (
    <mesh
      ref={meshRef}
      onPointerDown={(e) => {
        e.stopPropagation()
        select(body.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <sphereGeometry args={[radius, 48, 48]} />
      {body.type === 'star' && emissive && (
        <meshStandardMaterial
          color="#000000"
          emissive={emissive}
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      )}
      {body.type === 'blackhole' && (
        <meshBasicMaterial color="#000000" toneMapped={false} />
      )}
      {(body.type === 'planet' || body.type === 'moon') && (
        <meshStandardMaterial
          color={body.albedo ?? '#9aa4b2'}
          roughness={0.85}
          metalness={0}
        />
      )}

      {/* A star also emits light so the planets are lit (tracks the star). */}
      {body.type === 'star' && <pointLight intensity={2.5} decay={0} />}

      {/* Selection cue — a faint gold wireframe shell (gold = active, §8.5). */}
      {selected && (
        <mesh scale={1.3}>
          <sphereGeometry args={[radius, 20, 20]} />
          <meshBasicMaterial
            color="#E8B84B"
            wireframe
            transparent
            opacity={0.35}
            toneMapped={false}
          />
        </mesh>
      )}
    </mesh>
  )
}
