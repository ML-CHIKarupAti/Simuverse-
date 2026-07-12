import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { renderPositions } from '../../../state/frameStore'
import type { CloudConfig } from '../types'

// Reusable procedural cloud shell — Earth, Venus, gas giants. A slightly larger
// semi-transparent sphere whose alpha is masked by a 4-octave FBM, drifting
// with simTime (deterministic, not wall-clock). `banded` shears the noise into
// latitude bands for gas giants; otherwise it scatters into cloud cells.
// Illustrative — decorative procedural layer, not simulated weather.
//
// Lint note: the time uniform is mutated via a ref to the live material, never
// through the useMemo return value.

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
  uniform vec3 tint;
  uniform float density;
  uniform float turbulence;
  uniform float time;
  uniform float banded;
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
  float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*vnoise(p); p*=2.05; a*=0.5; } return s; }

  void main() {
    vec3 sp = normalize(vPos);
    // Banded giants: compress the noise vertically and add sinusoidal latitude
    // bands; rocky/ocean worlds keep isotropic cells.
    vec3 p = mix(sp, vec3(sp.x, sp.y * 3.5, sp.z), banded) * (2.0 + turbulence);
    p += vec3(time * 0.03 * (0.4 + turbulence), 0.0, 0.0); // zonal drift
    float n = fbm(p);
    float bands = mix(0.0, 0.5 + 0.5 * sin(sp.y * 18.0 + n * 6.0), banded);
    float field = mix(n, mix(n, bands, 0.6), banded);
    float alpha = smoothstep(1.0 - density, 1.0, field + density * 0.35) * density;
    // Soft terminator: clouds catch light on the lit hemisphere.
    float lambert = clamp(dot(normalize(vNormal), normalize(vView)) * 0.5 + 0.7, 0.35, 1.0);
    gl_FragColor = vec4(tint * lambert, alpha);
  }
`

export function CloudLayer({ radius, config }: { radius: number; config: CloudConfig }) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const flow = config.flowSpeed ?? 1
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          tint: { value: new THREE.Color(config.tint) },
          density: { value: config.density },
          turbulence: { value: config.turbulence },
          time: { value: 0 },
          banded: { value: config.banded ? 1 : 0 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
      }),
    [config.tint, config.density, config.turbulence, config.banded],
  )
  useFrame(() => {
    const m = matRef.current
    if (m) m.uniforms.time.value = renderPositions.simTime * flow
  })
  return (
    <mesh scale={1.02}>
      <sphereGeometry args={[radius, 48, 48]} />
      <primitive ref={matRef} object={material} attach="material" />
    </mesh>
  )
}
