import { useMemo } from 'react'
import * as THREE from 'three'
import type { RockyConfig } from '../types'

// Rocky/cratered surface cue — Mercury, Mars, rocky/icy moons. Deterministic
// per-vertex colour noise (computed once from the geometry, not per-frame) on a
// real meshStandardMaterial, so it still responds correctly to the scene's
// actual light: a believable day/night terminator falls out of Lambert shading,
// not a hand-rolled lighting hack. `contrast` scales the surface variation by
// tier. Illustrative — no real elevation or crater data.
function hash3(x: number, y: number, z: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453
  return s - Math.floor(s)
}

export function RockyDetail({
  radius,
  baseColor,
  config,
}: {
  radius: number
  baseColor: string
  config: RockyConfig
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(radius, 64, 64)
    const pos = geo.getAttribute('position')
    const base = new THREE.Color(baseColor)
    const colors = new Float32Array(pos.count * 3)
    const c = config.contrast
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      // Three octaves of a cheap deterministic hash, tiled by fixed frequencies
      // so the pattern scales with the sphere rather than the vertex index.
      const n =
        hash3(Math.floor(x * 5), Math.floor(y * 5), Math.floor(z * 5)) * 0.55 +
        hash3(Math.floor(x * 12), Math.floor(y * 12), Math.floor(z * 12)) * 0.3 +
        hash3(Math.floor(x * 26), Math.floor(y * 26), Math.floor(z * 26)) * 0.15
      // Centre the noise on 0 then apply contrast; never fully dark or blown out.
      const shade = 1 + (n - 0.5) * 2 * c * 0.6
      colors[3 * i] = base.r * shade
      colors[3 * i + 1] = base.g * shade
      colors[3 * i + 2] = base.b * shade
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [radius, baseColor, config.contrast])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors roughness={0.96} metalness={0} />
    </mesh>
  )
}
