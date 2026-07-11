import { BodyMesh } from './BodyMesh'
import type { RenderBody } from './demoScene'

// Renders a mesh per body. Each BodyMesh positions itself from the frame bridge.
export function Bodies({ bodies }: { bodies: readonly RenderBody[] }) {
  return (
    <>
      {bodies.map((body) => (
        <BodyMesh key={body.id} body={body} />
      ))}
    </>
  )
}
