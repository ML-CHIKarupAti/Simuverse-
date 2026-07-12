import { Fragment } from 'react'
import { BodyMesh } from './BodyMesh'
import { Trail } from './Trail'
import { OrbitPath } from './OrbitPath'
import { useTrailsVisible } from '../state/trailsVisibleStore'
import { useOrbitPathVisible } from '../state/orbitPathVisibleStore'
import { useRenderMode } from '../state/renderModeStore'
import { DEMO_ORBITS, type RenderBody } from './demoScene'

// Renders a mesh per body plus a trail for orbiting bodies (stars are usually
// central and near-stationary, so they get no trail). Each piece positions
// itself from the frame bridge. Trail is keyed by render mode so a mode switch
// (different trailLength) remounts it fresh at the new ring-buffer capacity —
// simplest correct way to resize a ring buffer (no data to migrate).
export function Bodies({ bodies }: { bodies: readonly RenderBody[] }) {
  const trailsVisible = useTrailsVisible((s) => s.visible)
  const orbitPathVisible = useOrbitPathVisible((s) => s.visible)
  const mode = useRenderMode((s) => s.mode)
  return (
    <>
      {bodies.map((body) => {
        const orbit = DEMO_ORBITS.find((o) => o.id === body.id)
        return (
          <Fragment key={body.id}>
            <BodyMesh body={body} />
            {body.type !== 'star' && trailsVisible && (
              <Trail key={mode} body={body} />
            )}
            {orbit && orbitPathVisible && (
              <OrbitPath
                initialPos={orbit.initialPos}
                initialVel={orbit.initialVel}
                mu={orbit.mu}
                color={body.albedo ?? '#9aa4b2'}
              />
            )}
          </Fragment>
        )
      })}
    </>
  )
}
