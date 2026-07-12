import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { blackbodyRGB } from './blackbody'
import { visualRadius, RENDER_SCALE, floatingOrigin } from './scale'
import { useFrameStore, renderPositions } from '../state/frameStore'
import { useSelectionStore } from '../state/selectionStore'
import { useRenderMode } from '../state/renderModeStore'
import { resolveVisualProfile } from './visualProfiles/resolveVisualProfile'
import { VISUAL_PROFILES } from './visualProfiles/registry'
import { tierLayers } from './visualProfiles/types'
import { StarSurfaceMaterial, Corona } from './visualProfiles/layers/StarSurface'
import { Flares } from './visualProfiles/layers/Flares'
import { CloudLayer } from './visualProfiles/layers/CloudLayer'
import { AtmosphereRim } from './visualProfiles/layers/AtmosphereRim'
import { RockyDetail } from './visualProfiles/layers/RockyDetail'
import { NightLights } from './visualProfiles/layers/NightLights'
import { Aurora } from './visualProfiles/layers/Aurora'
import { AccretionDisk, Jet } from './visualProfiles/layers/AccretionDisk'
import { LensingShell } from './visualProfiles/layers/LensingShell'
import type { RenderBody } from './demoScene'

// One body, rendered through its resolved visual profile at the active tier
// (PLAN §8 2.7, body-aware redesign). The three axes stay strictly separate:
//   1. IDENTITY  — the profile (sun/earth/venus/… or a type-based fallback)
//   2. TIER      — restrained/cinematic/maximal, selects which layer set applies
//   3. GLOBAL    — bloom/starfield/trail scalars, handled elsewhere
// Every layer here is DECORATIVE (illustrative); position is the only thing
// driven by physics — it comes from the interpolated frame (renderPositions, in
// AU) through the floating origin + render scale each frame, unchanged from 2.4.
export function BodyMesh({ body }: { body: RenderBody }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const selected = useSelectionStore((s) => s.selectedId === body.id)
  const select = useSelectionStore((s) => s.select)
  const mode = useRenderMode((s) => s.mode)
  const radius = visualRadius(body.type, body.massMsun)

  const profileKey = resolveVisualProfile(body.type, body.visualProfile)
  const spec = VISUAL_PROFILES[profileKey]
  const layers = tierLayers(spec, mode)

  // Star blackbody colour — the one physical (approximate) part of a star's look.
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

  const isRocky = (body.type === 'planet' || body.type === 'moon') && !!layers.rockyDetail
  const surfaceColor = layers.baseColor ?? body.albedo ?? '#9aa4b2'

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
      {/* Base geometry/material — omitted when RockyDetail supplies its own
          geometry+material as a sibling instead. */}
      {!isRocky && <sphereGeometry args={[radius, 48, 48]} />}

      {/* ── STAR ── photosphere (granulation identity) or emissive fallback ── */}
      {body.type === 'star' && emissive && layers.granulation && (
        <StarSurfaceMaterial
          color={emissive}
          granulation={layers.granulation}
          limbDarkening={layers.limbDarkening ?? 0.5}
        />
      )}
      {body.type === 'star' && emissive && !layers.granulation && (
        <meshStandardMaterial
          color="#000000"
          emissive={emissive}
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      )}

      {/* ── BLACK HOLE ── pure black event horizon ── */}
      {body.type === 'blackhole' && <meshBasicMaterial color="#000000" toneMapped={false} />}

      {/* ── PLANET / MOON ── lit surface (skip when RockyDetail owns it) ── */}
      {(body.type === 'planet' || body.type === 'moon') && !isRocky && (
        <meshStandardMaterial color={surfaceColor} roughness={0.85} metalness={0} />
      )}
      {isRocky && layers.rockyDetail && (
        <RockyDetail radius={radius} baseColor={surfaceColor} config={layers.rockyDetail} />
      )}

      {/* A star lights the rest of the system (light tracks the star). */}
      {body.type === 'star' && <pointLight intensity={2.5} decay={0} />}

      {/* ── Decorative layers — all illustrative, never physics ── */}
      {body.type === 'star' && layers.corona && emissive && (
        <Corona radius={radius} color={emissive} config={layers.corona} />
      )}
      {body.type === 'star' && layers.flares && <Flares objectId={body.id} radius={radius} />}

      {layers.cloudLayer && <CloudLayer radius={radius} config={layers.cloudLayer} />}
      {layers.atmosphereRim && <AtmosphereRim radius={radius} config={layers.atmosphereRim} />}
      {layers.nightLights && <NightLights radius={radius} config={layers.nightLights} />}
      {layers.aurora && <Aurora radius={radius} config={layers.aurora} />}

      {body.type === 'blackhole' && layers.accretionDisk && (
        <AccretionDisk radius={radius} config={layers.accretionDisk} />
      )}
      {body.type === 'blackhole' && layers.lensingShell && (
        <LensingShell radius={radius} config={layers.lensingShell} />
      )}
      {body.type === 'blackhole' && layers.jet && <Jet radius={radius} />}

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
