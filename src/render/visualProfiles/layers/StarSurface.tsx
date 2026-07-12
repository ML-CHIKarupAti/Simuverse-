import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { renderPositions } from '../../../state/frameStore'
import type { GranulationConfig, CoronaConfig } from '../types'

// Star photosphere + corona — the Sun's Maximal showcase, and every star's
// identity layer. IDENTITY: the blackbody colour and limb darkening are on at
// every tier so a star never reads as a flat disc. SPECTACLE: granulation
// contrast and corona brightness escalate by tier.
//
// The granulation is a 5-octave value-noise FBM with domain warping, drifting
// with simTime (deterministic — NOT wall clock), so pausing/scrubbing always
// shows the same convective pattern. Illustrative — the colour is the real
// (approximate) blackbody physics; the boiling surface is pure decoration.
//
// Lint note: uniforms are mutated through a ref to the live material, never
// through the useMemo return value (react-hooks/immutability forbids the latter).

const GLSL_NOISE = /* glsl */ `
  float hash(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float vnoise(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.02; a*=0.5; } return s; }
`

const surfaceVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPos = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

const surfaceFragment = /* glsl */ `
  uniform vec3 color;
  uniform float time;
  uniform float uScale;
  uniform float uContrast;
  uniform float uFlow;
  uniform float uLimb;
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vView;
  ${GLSL_NOISE}
  void main() {
    vec3 drift = vec3(time*uFlow*0.30, time*uFlow*0.20, -time*uFlow*0.15);
    vec3 p = vPos * uScale + drift;
    // Domain-warp the sample point so granules look convective, not gridded.
    vec3 warp = vec3(fbm(p + 1.7), fbm(p + 8.3), fbm(p + 4.1));
    float g = fbm(p + warp * 0.6);
    float cells = smoothstep(0.35, 0.78, g);
    float bright = 1.0 + (cells - 0.5) * 2.0 * uContrast;
    // Hot granule centres tend whiter; cool intergranular lanes keep the tint.
    vec3 shade = mix(color * 0.82, mix(color, vec3(1.0), 0.35), cells);
    // Limb darkening — real stars fade toward the edge; keeps the disc 3D.
    float mu = max(dot(normalize(vNormal), normalize(vView)), 0.0);
    float limb = mix(1.0 - uLimb, 1.0, pow(mu, 0.6));
    gl_FragColor = vec4(shade * bright * limb, 1.0);
  }
`

export function StarSurfaceMaterial({
  color,
  granulation,
  limbDarkening,
}: {
  color: THREE.Color
  granulation: GranulationConfig
  limbDarkening: number
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          color: { value: color },
          time: { value: 0 },
          uScale: { value: granulation.scale },
          uContrast: { value: granulation.contrast },
          uFlow: { value: granulation.flowSpeed },
          uLimb: { value: limbDarkening },
        },
        vertexShader: surfaceVertex,
        fragmentShader: surfaceFragment,
        toneMapped: false,
      }),
    [color, granulation.scale, granulation.contrast, granulation.flowSpeed, limbDarkening],
  )
  useFrame(() => {
    const m = matRef.current
    if (m) m.uniforms.time.value = renderPositions.simTime
  })
  return <primitive ref={matRef} object={material} attach="material" />
}

// Layered fresnel corona — two additive shells (a bright inner rim + a soft
// outer halo) so the glow reads as an atmosphere of light rather than a hard
// second sphere. Illustrative.
const coronaVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

const coronaFragment = /* glsl */ `
  uniform vec3 color;
  uniform float intensity;
  uniform float power;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float f = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), power);
    gl_FragColor = vec4(color, f * intensity);
  }
`

function CoronaShell({
  radius,
  scale,
  color,
  intensity,
  power,
}: {
  radius: number
  scale: number
  color: THREE.Color
  intensity: number
  power: number
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          color: { value: color },
          intensity: { value: intensity },
          power: { value: power },
        },
        vertexShader: coronaVertex,
        fragmentShader: coronaFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        toneMapped: false,
      }),
    [color, intensity, power],
  )
  return (
    <mesh scale={scale}>
      <sphereGeometry args={[radius, 32, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

export function Corona({
  radius,
  color,
  config,
}: {
  radius: number
  color: THREE.Color
  config: CoronaConfig
}) {
  // A warmer-white corona colour than the raw star tint reads more like light.
  const glow = useMemo(() => color.clone().lerp(new THREE.Color('#ffffff'), 0.4), [color])
  return (
    <>
      <CoronaShell radius={radius} scale={1.12} color={glow} intensity={config.intensity} power={2.2} />
      <CoronaShell
        radius={radius}
        scale={config.size}
        color={glow}
        intensity={config.intensity * 0.5}
        power={3.4}
      />
    </>
  )
}
