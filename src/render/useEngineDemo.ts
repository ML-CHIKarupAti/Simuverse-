import { useEffect } from 'react'
import { EngineClient } from '../engine/engineClient'
import { useFrameStore } from '../state/frameStore'
import { DEMO_ENGINE_BODIES, isDemoMode } from './demoScene'

// TEMPORARY Phase-2 dev scene wiring (bodies defined in demoScene). Opt-in via
// `?demo` — the default app is blank until a command inserts a body (Phase 3).
// Spins up the real worker so the canvas has live motion to build against.
export function useEngineDemo(): void {
  useEffect(() => {
    if (!isDemoMode()) return
    const client = new EngineClient()
    client.onFrame((f) =>
      useFrameStore
        .getState()
        .pushFrame({ simTime: f.simTime, positions: f.positions }),
    )
    client.init(
      { integrator: 'yoshida4', dt: 1e-4, softening: 1e-6, timescale: 0.5 },
      DEMO_ENGINE_BODIES,
    )
    useFrameStore.getState().setOrder(client.getOrder())
    client.play()
    return () => client.terminate()
  }, [])
}
