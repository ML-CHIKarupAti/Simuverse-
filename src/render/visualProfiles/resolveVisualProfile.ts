// Fallback-chain resolver — explicit profile (assigned by construction code,
// e.g. the demo scene or a future preset) → type-based generic default. NEVER
// matches on a display name at render time: names are user-editable (\rename),
// so string-matching identity would be fragile and gameable. This resolver is
// intentionally simple; the honesty is in what it does NOT do (no "guess Venus
// from mass/temperature" heuristics — that would invent identity, not read it).

import type { ObjectType } from '../../scene/schema'
import type { VisualProfileKey } from './types'

const TYPE_DEFAULT: Record<ObjectType, VisualProfileKey> = {
  star: 'generic-star',
  planet: 'generic-planet',
  moon: 'generic-moon',
  blackhole: 'black-hole',
}

export function resolveVisualProfile(
  type: ObjectType,
  explicitProfile?: VisualProfileKey,
): VisualProfileKey {
  return explicitProfile ?? TYPE_DEFAULT[type]
}
