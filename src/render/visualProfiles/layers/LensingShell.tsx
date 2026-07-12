import { useMemo } from 'react'
import * as THREE from 'three'
import type { LensingConfig } from '../types'

// Black-hole Maximal only — an ILLUSTRATIVE gravitational-lensing halo: a thin,
// bright photon-ring-like rim hugging the event horizon's silhouette, produced
// by a sharp Fresnel term (high exponent) on a shell just outside the black
// sphere. This is an impression of light bending around the hole, NOT a
// geodesic ray trace — the honesty copy on the black-hole profile says so
// explicitly. Additive so it only ever adds light at the silhouette.
const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 color;
  uniform float intensity;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float d = max(dot(normalize(vNormal), normalize(vView)), 0.0);
    // Sharp bright ring at the very edge (thin photon-ring look), plus a faint
    // wider glow so the rim doesn't alias to a hard line.
    float ring = pow(1.0 - d, 8.0);
    float halo = pow(1.0 - d, 2.5) * 0.25;
    gl_FragColor = vec4(color, (ring + halo) * intensity);
  }
`

export function LensingShell({ radius, config }: { radius: number; config: LensingConfig }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          color: { value: new THREE.Color(config.color) },
          intensity: { value: config.intensity },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        toneMapped: false,
      }),
    [config.color, config.intensity],
  )
  return (
    <mesh scale={1.18}>
      <sphereGeometry args={[radius, 48, 48]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
