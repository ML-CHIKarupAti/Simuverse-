import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { deriveOrbitEllipse } from './orbitElements'
import { RENDER_SCALE, floatingOrigin } from './scale'

// Persistent full-orbit reference path (owner request, folded into 2.7) — a
// faint, complete ellipse, distinct from the dynamic comet-tail Trail. Derived
// once from a single position+velocity sample (a, e are conserved), so it draws
// the exact geometric orbit instantly rather than waiting for the trail to fill.
// Dashed + low-opacity so it reads as a reference overlay, not a bright shape.
// Badge: illustrative (an aid, not sensor data).
export function OrbitPath({
  initialPos,
  initialVel,
  mu,
  primaryPosAU = [0, 0, 0],
  color,
}: {
  initialPos: readonly [number, number, number]
  initialVel: readonly [number, number, number]
  mu: number
  primaryPosAU?: readonly [number, number, number]
  color: string
}) {
  const points = useMemo(() => {
    const { semiMajorAxis: a, eccentricity: e, centerX, centerY, rotation } =
      deriveOrbitEllipse(initialPos, initialVel, mu)
    const b = a * Math.sqrt(Math.max(0, 1 - e * e))
    const curve = new THREE.EllipseCurve(
      centerX,
      centerY,
      a,
      b,
      0,
      Math.PI * 2,
      false,
      rotation,
    )
    const o = floatingOrigin.au
    return curve.getPoints(180).map(
      (p) =>
        new THREE.Vector3(
          (p.x + primaryPosAU[0] - o[0]) * RENDER_SCALE,
          (p.y + primaryPosAU[1] - o[1]) * RENDER_SCALE,
          (primaryPosAU[2] - o[2]) * RENDER_SCALE,
        ),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- primaryPosAU/o are static for the Phase-2 demo (see file comment)
  }, [initialPos, initialVel, mu])

  return (
    <Line
      points={points}
      color={color}
      opacity={0.3}
      transparent
      dashed
      dashScale={2.5}
      dashSize={1}
      gapSize={0.6}
      lineWidth={1}
    />
  )
}
