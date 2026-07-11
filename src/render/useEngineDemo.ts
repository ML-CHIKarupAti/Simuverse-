import { useEffect } from 'react'
import { EngineClient } from '../engine/engineClient'
import { useFrameStore } from '../state/frameStore'
import { DEMO_ENGINE_BODIES } from './demoScene'

// TEMPORARY Phase-2 dev scene wiring (bodies defined in demoScene). Spins up the
// real worker so the canvas has live, physics-driven motion to build against;
// replaced by real scene loading (presets §6.1, commands Phase 3).
export function useEngineDemo(): void {
  useEffect(() => {
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
