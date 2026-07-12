import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { renderPositions } from '../../../state/frameStore'
import type { AuroraConfig } from '../types'

// Earth Maximal only — polar aurora ribbons. An emissive additive shell whose
// glow is confined to high latitudes (near both poles) and rippled by a
// simTime-driven noise so the curtains shimmer. Deterministic (simTime only, no
// wall-clock, no random). Illustrative — decorative, not a magnetosphere model.
//
// Lint note: the time uniform is mutated via a ref to the live material.
const vertexShader = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vPos = position;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 color;
  uniform float intensity;
  uniform float time;
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vView;

  float hash(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float vnoise(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }

  void main() {
    vec3 sp = normalize(vPos);
    float lat = abs(sp.y);                                   // 1 at poles, 0 at equator
    float ring = smoothstep(0.72, 0.9, lat) * (1.0 - smoothstep(0.96, 1.0, lat));
    // Shimmering curtains: animated noise around the auroral ovals.
    float curtain = vnoise(vec3(sp.x * 8.0, sp.y * 3.0, sp.z * 8.0) + vec3(time * 0.5, 0.0, 0.0));
    curtain = smoothstep(0.45, 0.9, curtain);
    // Rim-biased so it glows on the limb like a real airglow arc.
    float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 1.5);
    float a = ring * curtain * (0.4 + 0.6 * rim) * intensity;
    gl_FragColor = vec4(color, a);
  }
`

export function Aurora({ radius, config }: { radius: number; config: AuroraConfig }) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          color: { value: new THREE.Color(config.color) },
          intensity: { value: config.intensity },
          time: { value: 0 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [config.color, config.intensity],
  )
  useFrame(() => {
    const m = matRef.current
    if (m) m.uniforms.time.value = renderPositions.simTime
  })
  return (
    <mesh scale={1.04}>
      <sphereGeometry args={[radius, 48, 48]} />
      <primitive ref={matRef} object={material} attach="material" />
    </mesh>
  )
}
