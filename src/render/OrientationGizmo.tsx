import { GizmoHelper, GizmoViewport } from '@react-three/drei'

// Orientation gizmo (owner request). A labeled, right-handed X/Y/Z triad fixed
// bottom-right that always shows the camera's orientation and snaps the view to
// an axis when a cap is clicked. Standard axis colours — X red, Y green, Z blue —
// the convention math/physics viewers expect. three.js is right-handed with Y up
// and +Z toward the viewer, and the gizmo mirrors the live camera exactly, so it
// is a faithful coordinate reference, not a decoration.
// renderPriority={2} is REQUIRED whenever the scene also mounts an
// <EffectComposer> (Postprocessing, 2.7): both drei's GizmoHelper and the
// composer render in useFrame, and the composer defaults to priority 1. At
// equal priority they race by registration order — the composer's full-screen
// pass then clears the gizmo every other frame, which reads as the whole canvas
// flickering on/off. A strictly higher priority makes the gizmo's small overlay
// pass run AFTER the composed frame each tick, so it survives and never flickers.
export function OrientationGizmo() {
  return (
    <GizmoHelper alignment="bottom-right" margin={[72, 72]} renderPriority={2}>
      <GizmoViewport
        axisColors={['#ef5350', '#66bb6a', '#5c8de0']}
        labelColor="#0b0e14"
      />
    </GizmoHelper>
  )
}
