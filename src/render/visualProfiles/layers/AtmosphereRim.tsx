import { useMemo } from 'react'
import * as THREE from 'three'
import type { AtmosphereConfig } from '../types'

// Reusable Fresnel rim glow — Earth, Venus, Mars, icy moons, generic planets.
// A view-dependent halo (brighter at grazing angles, the classic atmosphere
// look), additive-blended so it never darkens the body. The `power` exponent
// controls rim thinness (higher = thinner, tighter to the silhouette).
// Illustrative — decorative, not a scattering model.
const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 color;
  uniform float intensity;
  uniform float power;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), power);
    gl_FragColor = vec4(color, fresnel * intensity);
  }
`

export function AtmosphereRim({ radius, config }: { radius: number; config: AtmosphereConfig }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          color: { value: new THREE.Color(config.color) },
          intensity: { value: config.intensity },
          power: { value: config.power ?? 2.5 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [config.color, config.intensity, config.power],
  )
  return (
    <mesh scale={1.09}>
      <sphereGeometry args={[radius, 32, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
