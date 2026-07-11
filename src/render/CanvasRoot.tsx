import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

// Full-bleed 3D canvas — the hero (PLAN §2.1, §8.5). Fixed behind all UI.
// Empty scene for now; bodies (2.4), starfield (2.5) and trails (2.6) fill it
// in later. The clear color #05070B is deliberately DARKER than the chrome
// (#0B0E14) so the starfield reads as the deepest layer, not the panels.
export function CanvasRoot() {
  return (
    <Canvas
      style={{ position: 'fixed', inset: 0 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ position: [0, 6, 16], fov: 50, near: 0.1, far: 50000 }}
    >
      <color attach="background" args={['#05070B']} />
      {/* Weighty, damped controls — an instrument, not a game camera. */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
        panSpeed={0.6}
      />
    </Canvas>
  )
}
