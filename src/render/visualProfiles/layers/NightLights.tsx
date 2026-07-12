import { useMemo } from 'react'
import * as THREE from 'three'
import type { NightLightsConfig } from '../types'

// Earth Maximal only — warm artificial lights on the NIGHT side. The night mask
// is computed honestly from the geometry: the star sits at the world origin in
// the demo, so the direction to the light is normalize(-worldPos) and the lit
// hemisphere (dot(normal, toLight) > 0) stays dark; lights only appear where the
// surface faces away from the star. Speckles are clustered by low-frequency
// noise so they read as populated coastlines, not uniform static. Additive,
// emissive, unlit — deterministic (no time term, no random). Illustrative:
// decorative, not real population or radiance data.
const vertexShader = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vPos = position;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 color;
  uniform float density;
  varying vec3 vPos;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  float hash(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float vnoise(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }

  void main() {
    vec3 toLight = normalize(-vWorldPos);              // star sits at world origin
    float night = smoothstep(0.15, -0.15, dot(normalize(vWorldNormal), toLight));
    // Landmass gate (low-freq) × city speckle (high-freq).
    vec3 sp = normalize(vPos);
    float land = smoothstep(0.5, 0.75, vnoise(sp * 3.0));
    float cities = smoothstep(1.0 - density * 0.5, 1.0, vnoise(sp * 40.0));
    float lights = night * land * cities;
    gl_FragColor = vec4(color, lights);
  }
`

export function NightLights({ radius, config }: { radius: number; config: NightLightsConfig }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          color: { value: new THREE.Color(config.color) },
          density: { value: config.density },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [config.color, config.density],
  )
  return (
    <mesh scale={1.008}>
      <sphereGeometry args={[radius, 48, 48]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
