import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { FrameBridge } from './FrameBridge'
import { FloatingOrigin } from './FloatingOrigin'
import { OrientationGizmo } from './OrientationGizmo'
import { OrientationReadout } from './OrientationReadout'
import { Bodies } from './Bodies'
import { Starfield } from './Starfield'
import { useEngineDemo } from './useEngineDemo'
import { DEMO_RENDER_BODIES, isDemoMode } from './demoScene'
import { useSelectionStore } from '../state/selectionStore'
import { useOrientationStore } from '../state/orientationStore'
import { useTrailsVisible } from '../state/trailsVisibleStore'

// Full-bleed 3D canvas — the hero (PLAN §2.1, §8.5). Fixed behind all UI. Clear
// color #05070B is deliberately DARKER than the chrome (#0B0E14) so the
// starfield (2.5) reads as the deepest layer. Starfield/trails/bloom land next.
export function CanvasRoot() {
  useEngineDemo() // temporary Phase-2 dev scene (see useEngineDemo)
  return (
    <>
      <Canvas
        style={{ position: 'fixed', inset: 0 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
        camera={{ position: [0, 6, 16], fov: 50, near: 0.1, far: 50000 }}
        onPointerMissed={() => useSelectionStore.getState().clear()}
      >
        <color attach="background" args={['#05070B']} />
        <Starfield />
        {/* Dim ambient so the un-lit side of a planet isn't pure black. */}
        <ambientLight intensity={0.18} />
        {/* Weighty, damped controls — an instrument, not a game camera. */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.6}
          zoomSpeed={0.8}
          panSpeed={0.6}
        />
        {/* Blank by design until a command inserts a body (Phase 3). The dev
            scene is opt-in via ?demo, purely to build the Phase-2 visuals. */}
        {isDemoMode() && <Bodies bodies={DEMO_RENDER_BODIES} />}
        <FrameBridge />
        <FloatingOrigin />
        <OrientationGizmo />
        <OrientationReadout />
      </Canvas>
      <OrientationOverlay />
      {isDemoMode() && <TrailsToggle />}
    </>
  )
}

// TEMPORARY dev-only toggle (see trailsVisibleStore) so trails can be A/B'd
// live while tuning. Replaced by the real \trails command in Phase 3.
function TrailsToggle() {
  const visible = useTrailsVisible((s) => s.visible)
  const toggle = useTrailsVisible((s) => s.toggle)
  return (
    <button
      onClick={toggle}
      style={{
        position: 'fixed',
        left: 16,
        bottom: 16,
        fontFamily: 'ui-monospace, monospace',
        fontSize: 11,
        letterSpacing: '0.06em',
        color: '#8b95a7',
        background: 'rgba(14,17,24,0.75)',
        border: '1px solid #232a36',
        borderRadius: 6,
        padding: '6px 10px',
        cursor: 'pointer',
      }}
    >
      trails: {visible ? 'on' : 'off'} (dev)
    </button>
  )
}

// HTML label above the gizmo naming the current axis-aligned view (blank while
// free-orbiting). Mono + secondary text per §8.5.
function OrientationOverlay() {
  const view = useOrientationStore((s) => s.view)
  if (!view) return null
  return (
    <div
      style={{
        position: 'fixed',
        right: 24,
        bottom: 158,
        fontFamily: 'ui-monospace, monospace',
        fontSize: 11,
        letterSpacing: '0.14em',
        color: '#8b95a7',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {view}
    </div>
  )
}
