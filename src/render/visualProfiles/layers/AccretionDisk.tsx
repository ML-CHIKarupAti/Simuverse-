import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { renderPositions } from '../../../state/frameStore'
import type { AccretionConfig } from '../types'

// Black-hole accretion disk + optional jet. Lies in the XY plane (the engine's
// orbital plane — same convention as every other body, no extra rotation). A
// radial gradient shader (hot white-gold inner edge → cool outer) with faint
// turbulent banding rotates slowly with simTime (deterministic). Illustrative —
// no real accretion physics or ray tracing; r_s itself remains exact.
//
// Lint note: the time uniform is mutated via a ref to the live material.
const vertexShader = /* glsl */ `
  varying vec2 vPos;
  void main() {
    vPos = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 innerColor;
  uniform vec3 outerColor;
  uniform float innerRadius;
  uniform float outerRadius;
  uniform float brightness;
  uniform float time;
  varying vec2 vPos;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

  void main() {
    float r = length(vPos);
    float t = clamp((r - innerRadius) / (outerRadius - innerRadius), 0.0, 1.0);
    float ang = atan(vPos.y, vPos.x);
    // Hot white-gold lip at the inner edge, cooling outward.
    vec3 col = mix(mix(vec3(1.0, 0.95, 0.85), innerColor, 0.4), outerColor, t);
    // Faint spiral banding — rotates with time so the disk reads as moving.
    float band = 0.85 + 0.15 * sin(ang * 6.0 + r * 22.0 - time * 2.0);
    band *= 0.9 + 0.1 * hash(floor(vPos * 40.0));
    // Bright inner rim, fading to transparent at the outer edge.
    float alpha = brightness * (1.0 - t) * (0.55 + 0.45 * smoothstep(0.0, 0.15, t));
    gl_FragColor = vec4(col * band * brightness, alpha);
  }
`

export function AccretionDisk({ radius, config }: { radius: number; config: AccretionConfig }) {
  const groupRef = useRef<THREE.Group>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const innerRadius = radius * 1.6
  const outerRadius = radius * 4.4

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          innerColor: { value: new THREE.Color(config.innerColor) },
          outerColor: { value: new THREE.Color(config.outerColor) },
          innerRadius: { value: innerRadius },
          outerRadius: { value: outerRadius },
          brightness: { value: config.brightness },
          time: { value: 0 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [config.innerColor, config.outerColor, config.brightness, innerRadius, outerRadius],
  )

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.z = renderPositions.simTime * 0.3
    const m = matRef.current
    if (m) m.uniforms.time.value = renderPositions.simTime
  })

  return (
    <group ref={groupRef}>
      <mesh>
        <ringGeometry args={[innerRadius, outerRadius, 96]} />
        <primitive ref={matRef} object={material} attach="material" />
      </mesh>
    </group>
  )
}

// Elongated additive glow cones along the disk's normal axis (Z), maximal only.
export function Jet({ radius, color = '#a8ccff' }: { radius: number; color?: string }) {
  const length = radius * 7
  return (
    <>
      {[1, -1].map((dir) => (
        <mesh
          key={dir}
          position={[0, 0, (dir * length) / 2]}
          rotation={[dir > 0 ? Math.PI : 0, 0, 0]}
        >
          <coneGeometry args={[radius * 0.4, length, 16, 1, true]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.22}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  )
}
