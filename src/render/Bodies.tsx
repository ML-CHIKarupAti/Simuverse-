import { Fragment } from 'react'
import { BodyMesh } from './BodyMesh'
import { Trail } from './Trail'
import type { RenderBody } from './demoScene'

// Renders a mesh per body plus a trail for orbiting bodies (stars are usually
// central and near-stationary, so they get no trail). Each piece positions
// itself from the frame bridge.
export function Bodies({ bodies }: { bodies: readonly RenderBody[] }) {
  return (
    <>
      {bodies.map((body) => (
        <Fragment key={body.id}>
          <BodyMesh body={body} />
          {body.type !== 'star' && <Trail body={body} />}
        </Fragment>
      ))}
    </>
  )
}
