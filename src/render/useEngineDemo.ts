import { useEffect } from 'react'
import { EngineClient } from '../engine/engineClient'
import { useFrameStore } from '../state/frameStore'
import { G } from '../units/units'
import type { EngineBody } from '../engine/protocol'

// TEMPORARY Phase-2 dev scene. A star with a few circular-orbit planets so the
// canvas has real, physics-driven motion to develop meshes/starfield/trails
// against. Replaced by real scene loading (presets §6.1, commands Phase 3).
// Circular speed v = √(GM/r); √G = 2π, so v = √(G/r) for M = 1 M☉.
function circular(id: string, mass: number, r: number): EngineBody {
  return { id, mass, pos: [r, 0, 0], vel: [0, Math.sqrt(G / r), 0] }
}

const DEMO_BODIES: EngineBody[] = [
  { id: 'sun', mass: 1, pos: [0, 0, 0], vel: [0, 0, 0] },
  circular('planet-a', 3e-6, 1),
  circular('planet-b', 3e-6, 1.6),
  circular('planet-c', 3e-6, 2.4),
]

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
      DEMO_BODIES,
    )
    useFrameStore.getState().setOrder(client.getOrder())
    client.play()
    return () => client.terminate()
  }, [])
}
