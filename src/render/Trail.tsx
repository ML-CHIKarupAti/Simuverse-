import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useFrameStore, renderPositions } from '../state/frameStore'
import { RENDER_SCALE, floatingOrigin } from './scale'
import { appendTrailPoint, fillTrailFade } from './trailBuffer'
import { useRenderModeStore } from '../state/renderModeStore'
import type { RenderBody } from './demoScene'

// A glowing trail behind a body (PLAN §8 2.6). Badge: illustrative. Samples the
// body's interpolated render position every SAMPLE_EVERY frames into a fixed
// ring buffer and draws it as an additive line that fades from head to tail.
// A long-enough capacity draws the full closed ellipse of an orbit.
//
// Step 2.7: capacity + opacity + sampleEveryNFrames now driven by the render-
// mode preset (restrained 128 / cinematic 256 / maximal 512). When the mode
// changes, the trail is rebuilt with the new capacity — this clears accumulated
// trail history, which is acceptable since mode switches are infrequent and the
// trail refills within seconds.
//
// NOTE: points are stored in render units relative to the CURRENT floating
// origin, so a rebase (only past 5000 units — never in the Phase-2 demo) would
// misplace the existing trail. Fine for now; when the origin actually engages,
// shift the buffers by the rebase delta.

export function Trail({ body }: { body: RenderBody }) {
  const frame = useRef(0)
  const count = useRef(0)
  const last = useRef<[number, number, number] | null>(null)
  const trailPreset = useRenderModeStore((s) => s.preset.trails)
  const color = useMemo(
    () => new THREE.Color(body.albedo ?? '#9aa4b2'),
    [body.albedo],
  )

  const cap = trailPreset.capacity
  const maxIntensity = trailPreset.opacity
  const sampleEvery = trailPreset.sampleEveryNFrames

  const line = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cap * 3), 3))
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cap * 3), 3))
    geo.setDrawRange(0, 0)
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
    return new THREE.Line(geo, mat)
  }, [cap])

  // Reset accumulated trail state when capacity changes (mode switch).
  // Placed in useEffect (not useMemo) to satisfy react-hooks/refs — refs
  // must not be read/written during render.
  useEffect(() => {
    count.current = 0
    last.current = null
    frame.current = 0
  }, [cap])

  useEffect(
    () => () => {
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
    },
    [line],
  )

  useFrame(() => {
    frame.current++
    if (frame.current % sampleEvery !== 0) return

    const order = useFrameStore.getState().order
    const slot = order.indexOf(body.id)
    const p = renderPositions.array
    if (slot < 0 || p.length < 3 * slot + 3) return

    const o = floatingOrigin.au
    const x = (p[3 * slot] - o[0]) * RENDER_SCALE
    const y = (p[3 * slot + 1] - o[1]) * RENDER_SCALE
    const z = (p[3 * slot + 2] - o[2]) * RENDER_SCALE

    // Skip near-duplicate samples (e.g. while paused) so the buffer isn't
    // filled with a single point.
    const l = last.current
    if (l && Math.abs(l[0] - x) < 1e-4 && Math.abs(l[1] - y) < 1e-4 && Math.abs(l[2] - z) < 1e-4) {
      return
    }
    last.current = [x, y, z]

    const posAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute
    const colAttr = line.geometry.getAttribute('color') as THREE.BufferAttribute
    count.current = appendTrailPoint(posAttr.array as Float32Array, count.current, cap, x, y, z)
    fillTrailFade(colAttr.array as Float32Array, count.current, color.r, color.g, color.b, maxIntensity)
    line.geometry.setDrawRange(0, count.current)
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
  })

  return <primitive object={line} />
}
