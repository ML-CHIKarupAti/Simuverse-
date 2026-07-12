import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { generateStarfield } from './starfieldGeometry'
import { useRenderMode, RENDER_MODE_PRESETS } from '../state/renderModeStore'

// Dense, non-repeating sky (PLAN §8 2.5, count wired to 2.7's render-mode
// presets). Badge: illustrative. A far sphere of points that follows the
// camera every frame (copy position, not parent) so it reads as infinitely
// distant and never needs a floating-origin rebase. Seeded from meta.seed for
// determinism §2 — TEMP: hardcoded here until scene state carries a real seed.
//
// Per-star size/colour needs a custom shader: three's stock PointsMaterial has
// no per-vertex size attribute. The vertex shader scales gl_PointSize by each
// star's `size` attribute against its (camera-relative) depth; since the field
// is camera-locked that depth is constant, so stars keep a steady size
// regardless of zoom, like a real sky. The fragment shader gives each point a
// soft circular falloff instead of a hard square.
const RADIUS = 4000 // render units — far outside any Phase-2 scene, inside camera far=50000
const TEMP_SEED = 1337 // TODO: replace with the scene's real meta.seed

const vertexShader = /* glsl */ `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, alpha);
  }
`

export function Starfield() {
  const pointsRef = useRef<THREE.Points>(null)
  const camera = useThree((s) => s.camera)
  const starCount = useRenderMode(
    (s) => RENDER_MODE_PRESETS[s.mode].starCount,
  )

  const geometry = useMemo(() => {
    const { positions, sizes, colors } = generateStarfield(starCount, TEMP_SEED)
    const scaled = new Float32Array(positions.length)
    for (let i = 0; i < positions.length; i++) scaled[i] = positions[i] * RADIUS

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(scaled, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [starCount])

  // Dispose the previous geometry whenever the count changes (mode switch) or
  // on unmount — BufferGeometry/its attributes are GPU resources.
  useEffect(() => () => geometry.dispose(), [geometry])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  useFrame(() => {
    pointsRef.current?.position.copy(camera.position)
  })

  return (
    <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
  )
}
