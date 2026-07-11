import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useFrameStore, renderPositions } from '../state/frameStore'
import { RENDER_SCALE, floatingOrigin } from './scale'
import { appendTrailPoint, fillTrailFade } from './trailBuffer'
import type { RenderBody } from './demoScene'

// A glowing trail behind a body (PLAN §8 2.6). Badge: illustrative. Samples the
// body's interpolated render position every SAMPLE_EVERY frames into a fixed
// ring buffer and draws it as an additive line that fades from head to tail.
// A long-enough capacity draws the full closed ellipse of an orbit.
//
// NOTE: points are stored in render units relative to the CURRENT floating
// origin, so a rebase (only past 5000 units — never in the Phase-2 demo) would
// misplace the existing trail. Fine for now; when the origin actually engages,
// shift the buffers by the rebase delta.
const CAP = 256
const SAMPLE_EVERY = 4

export function Trail({ body }: { body: RenderBody }) {
  const frame = useRef(0)
  const count = useRef(0)
  const last = useRef<[number, number, number] | null>(null)
  const color = useMemo(
    () => new THREE.Color(body.albedo ?? '#9aa4b2'),
    [body.albedo],
  )

  const line = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CAP * 3), 3))
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(CAP * 3), 3))
    geo.setDrawRange(0, 0)
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
    return new THREE.Line(geo, mat)
  }, [])

  useEffect(
    () => () => {
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
    },
    [line],
  )

  useFrame(() => {
    frame.current++
    if (frame.current % SAMPLE_EVERY !== 0) return

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
    count.current = appendTrailPoint(posAttr.array as Float32Array, count.current, CAP, x, y, z)
    fillTrailFade(colAttr.array as Float32Array, count.current, color.r, color.g, color.b)
    line.geometry.setDrawRange(0, count.current)
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
  })

  return <primitive object={line} />
}
