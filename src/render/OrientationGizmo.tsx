import { GizmoHelper, GizmoViewport } from '@react-three/drei'

// Orientation gizmo (owner request). A labeled, right-handed X/Y/Z triad fixed
// bottom-right that always shows the camera's orientation and snaps the view to
// an axis when a cap is clicked. Standard axis colours — X red, Y green, Z blue —
// the convention math/physics viewers expect. three.js is right-handed with Y up
// and +Z toward the viewer, and the gizmo mirrors the live camera exactly, so it
// is a faithful coordinate reference, not a decoration.
export function OrientationGizmo() {
  return (
    <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
      <GizmoViewport
        axisColors={['#ef5350', '#66bb6a', '#5c8de0']}
        labelColor="#0b0e14"
      />
    </GizmoHelper>
  )
}
