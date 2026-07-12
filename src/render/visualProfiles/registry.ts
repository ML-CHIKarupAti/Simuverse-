// Visual profile registry — the coverage matrix as data. Every key resolves to
// a tier-complete spec (never an unstyled fallback); "intentionally
// unavailable" layers are simply the keys a spec omits.
//
// The governing rule (see types.ts): IDENTITY layers appear at EVERY tier
// including Restrained; only SPECTACLE escalates. So each row below reads top
// to bottom as the SAME body growing richer, never as a different body — a
// Restrained Earth is still unmistakably Earth, just disciplined.

import type { VisualProfileKey, VisualProfileSpec } from './types'

export const VISUAL_PROFILES: Record<VisualProfileKey, VisualProfileSpec> = {
  // ── STARS ──────────────────────────────────────────────────────────────
  sun: {
    key: 'sun',
    objectType: 'star',
    // Identity every tier: temperature-tinted photosphere with limb darkening
    // and convective granulation. Spectacle (corona brightness, flares)
    // escalates. Restrained is a clean, serious star — not a flat disc.
    restrained: {
      limbDarkening: 0.55,
      granulation: { scale: 3.0, contrast: 0.14, flowSpeed: 0.04 },
    },
    cinematic: {
      limbDarkening: 0.5,
      granulation: { scale: 3.2, contrast: 0.22, flowSpeed: 0.06 },
      corona: { intensity: 0.35, size: 1.5 },
    },
    maximal: {
      limbDarkening: 0.45,
      granulation: { scale: 3.6, contrast: 0.32, flowSpeed: 0.09 },
      corona: { intensity: 0.6, size: 1.9 },
      flares: true,
    },
    illustrativeCopy:
      'Illustrative — visual only, no physics. The photosphere granulation, corona, and flare arcs are decorative procedural layers (deterministic from object id + scene seed + sim time). Only the mass and the blackbody colour temperature are physical; the colour itself is an approximation.',
  },
  'generic-star': {
    key: 'generic-star',
    objectType: 'star',
    // Any user-made star: still gets identity (temperature tint + limb
    // darkening + subtle granulation) so it never renders as a flat sphere,
    // but no Sun-specific corona/flare showcase.
    restrained: { limbDarkening: 0.55, granulation: { scale: 2.6, contrast: 0.1, flowSpeed: 0.03 } },
    cinematic: {
      limbDarkening: 0.5,
      granulation: { scale: 2.8, contrast: 0.16, flowSpeed: 0.05 },
      corona: { intensity: 0.28, size: 1.4 },
    },
    maximal: {
      limbDarkening: 0.45,
      granulation: { scale: 3.0, contrast: 0.24, flowSpeed: 0.07 },
      corona: { intensity: 0.45, size: 1.6 },
    },
    illustrativeCopy:
      'Illustrative — visual only, no physics. Colour is derived from temperature via a blackbody approximation; the granulation and corona are decorative procedural layers, not a simulated photosphere.',
  },

  // ── PLANETS ────────────────────────────────────────────────────────────
  earth: {
    key: 'earth',
    objectType: 'planet',
    // Identity every tier: blue ocean base + white cloud shell + thin blue
    // atmosphere. Spectacle (night-side city lights + polar aurora) is
    // Maximal only.
    restrained: {
      baseColor: '#22467a',
      cloudLayer: { tint: '#ffffff', density: 0.3, turbulence: 0.55, flowSpeed: 0.8 },
      atmosphereRim: { color: '#7fb3ff', intensity: 0.28, power: 3.0 },
    },
    cinematic: {
      baseColor: '#22467a',
      cloudLayer: { tint: '#ffffff', density: 0.42, turbulence: 0.7, flowSpeed: 1.0 },
      atmosphereRim: { color: '#7fb3ff', intensity: 0.45, power: 2.6 },
    },
    maximal: {
      baseColor: '#22467a',
      cloudLayer: { tint: '#ffffff', density: 0.55, turbulence: 0.9, flowSpeed: 1.2 },
      atmosphereRim: { color: '#8ec0ff', intensity: 0.65, power: 2.3 },
      nightLights: { color: '#ffd27f', density: 0.5 },
      aurora: { color: '#4dffa6', intensity: 0.7 },
    },
    illustrativeCopy:
      'Illustrative — visual only, no physics. The cloud shell, atmospheric rim glow, night-side city lights, and polar aurora are decorative procedural layers seeded from object id + scene seed — not simulated weather, population, or magnetospheric physics.',
  },
  venus: {
    key: 'venus',
    objectType: 'planet',
    // Identity every tier: pale-gold, fully cloud-covered, thick hazy rim.
    // No blue, ever. Maximal just makes the deck denser and more turbulent.
    restrained: {
      baseColor: '#c9b57e',
      cloudLayer: { tint: '#e8d9a0', density: 0.55, turbulence: 0.35, flowSpeed: 0.5 },
      atmosphereRim: { color: '#f0d080', intensity: 0.35, power: 2.4 },
    },
    cinematic: {
      baseColor: '#c9b57e',
      cloudLayer: { tint: '#ecdda6', density: 0.68, turbulence: 0.5, flowSpeed: 0.7 },
      atmosphereRim: { color: '#f2d488', intensity: 0.55, power: 2.2 },
    },
    maximal: {
      baseColor: '#c9b57e',
      cloudLayer: { tint: '#f2e6b8', density: 0.85, turbulence: 0.75, flowSpeed: 0.9 },
      atmosphereRim: { color: '#f6dc94', intensity: 0.75, power: 2.0 },
    },
    illustrativeCopy:
      'Illustrative — visual only, no physics. The dense pale-gold cloud deck and thick atmospheric rim are decorative procedural layers, not simulated super-rotation or atmospheric chemistry.',
  },
  mercury: {
    key: 'mercury',
    objectType: 'planet',
    // Identity every tier: airless grey rock. A real meshStandardMaterial takes
    // the scene light, so a harsh day/night terminator falls out for free.
    // Spectacle escalates only via surface-detail contrast.
    restrained: { baseColor: '#8f8983', rockyDetail: { contrast: 0.28 } },
    cinematic: { baseColor: '#9c9490', rockyDetail: { contrast: 0.4 } },
    maximal: { baseColor: '#a39a94', rockyDetail: { contrast: 0.55 } },
    illustrativeCopy:
      'Illustrative — visual only, no physics. Surface roughness and crater cues are decorative procedural noise; no real elevation data is modelled. The sharp day/night terminator is real Lambert shading from the scene light.',
  },
  mars: {
    key: 'mars',
    objectType: 'planet',
    restrained: { baseColor: '#a8542f', rockyDetail: { contrast: 0.25 } },
    cinematic: {
      baseColor: '#c1663f',
      rockyDetail: { contrast: 0.38 },
      atmosphereRim: { color: '#e0a070', intensity: 0.2, power: 3.0 },
    },
    maximal: {
      baseColor: '#cf6d42',
      rockyDetail: { contrast: 0.5 },
      atmosphereRim: { color: '#e8ac7a', intensity: 0.32, power: 2.7 },
    },
    illustrativeCopy:
      'Illustrative — visual only, no physics. Surface roughness cues and the thin dusty rim are decorative procedural layers; no real terrain or dust-storm data is modelled.',
  },
  'gas-giant': {
    key: 'gas-giant',
    objectType: 'planet',
    // Identity every tier: latitudinal cloud bands. Density/turbulence escalate.
    restrained: {
      baseColor: '#c9b491',
      cloudLayer: { tint: '#d9c9a8', density: 0.6, turbulence: 0.9, flowSpeed: 0.6, banded: true },
    },
    cinematic: {
      baseColor: '#c9b491',
      cloudLayer: { tint: '#d9c9a8', density: 0.75, turbulence: 1.1, flowSpeed: 0.9, banded: true },
      atmosphereRim: { color: '#e8d3a8', intensity: 0.3, power: 2.6 },
    },
    maximal: {
      baseColor: '#c9b491',
      cloudLayer: { tint: '#e2d0ac', density: 0.92, turbulence: 1.5, flowSpeed: 1.2, banded: true },
      atmosphereRim: { color: '#efdcb0', intensity: 0.45, power: 2.3 },
    },
    illustrativeCopy:
      'Illustrative — visual only, no physics. Banded cloud texture is a decorative procedural layer, not simulated atmospheric dynamics.',
  },
  'ringed-gas-giant': {
    key: 'ringed-gas-giant',
    objectType: 'planet',
    restrained: {
      baseColor: '#cbbd97',
      cloudLayer: { tint: '#e0d3ae', density: 0.55, turbulence: 0.8, flowSpeed: 0.5, banded: true },
    },
    cinematic: {
      baseColor: '#cbbd97',
      cloudLayer: { tint: '#e0d3ae', density: 0.7, turbulence: 1.0, flowSpeed: 0.8, banded: true },
      atmosphereRim: { color: '#ecdcb2', intensity: 0.28, power: 2.6 },
    },
    maximal: {
      baseColor: '#cbbd97',
      cloudLayer: { tint: '#e8dcb8', density: 0.85, turbulence: 1.3, flowSpeed: 1.0, banded: true },
      atmosphereRim: { color: '#f0e0b8', intensity: 0.42, power: 2.3 },
    },
    illustrativeCopy:
      'Illustrative — visual only, no physics. Banded cloud texture is decorative. Ring geometry is deferred (not yet implemented) and intentionally omitted rather than faked.',
  },
  'generic-planet': {
    key: 'generic-planet',
    objectType: 'planet',
    // Fallback for any user-made / imported planet with no named identity.
    // Still beautiful: albedo base + a faint neutral atmosphere so it never
    // reads as a bare debug sphere. No named-body decoration.
    restrained: { atmosphereRim: { color: '#9fb2cc', intensity: 0.16, power: 3.2 } },
    cinematic: { atmosphereRim: { color: '#a8bcd6', intensity: 0.26, power: 3.0 } },
    maximal: { atmosphereRim: { color: '#b4c6dd', intensity: 0.38, power: 2.7 } },
    illustrativeCopy:
      'Illustrative — visual only, no physics. A lit, albedo-coloured sphere with a faint neutral atmospheric rim. No named-body decoration is applied to a generic planet.',
  },

  // ── MOONS ──────────────────────────────────────────────────────────────
  'rocky-moon': {
    key: 'rocky-moon',
    objectType: 'moon',
    restrained: { baseColor: '#8c8880', rockyDetail: { contrast: 0.25 } },
    cinematic: { baseColor: '#98938a', rockyDetail: { contrast: 0.36 } },
    maximal: { baseColor: '#a09a90', rockyDetail: { contrast: 0.48 } },
    illustrativeCopy:
      'Illustrative — visual only, no physics. Surface roughness and crater cues are decorative procedural noise; no real elevation data is modelled.',
  },
  'icy-moon': {
    key: 'icy-moon',
    objectType: 'moon',
    restrained: {
      baseColor: '#cdd8e0',
      rockyDetail: { contrast: 0.14 },
      atmosphereRim: { color: '#cfe8ff', intensity: 0.16, power: 3.2 },
    },
    cinematic: {
      baseColor: '#d4dee6',
      rockyDetail: { contrast: 0.2 },
      atmosphereRim: { color: '#cfe8ff', intensity: 0.26, power: 3.0 },
    },
    maximal: {
      baseColor: '#dbe4ea',
      rockyDetail: { contrast: 0.26 },
      atmosphereRim: { color: '#dcefff', intensity: 0.4, power: 2.7 },
    },
    illustrativeCopy:
      'Illustrative — visual only, no physics. The frosty surface cues and pale rim glow are decorative procedural layers, not a simulated ice sheet or exosphere.',
  },
  'generic-moon': {
    key: 'generic-moon',
    objectType: 'moon',
    // Fallback moon: subtle rocky cue so even an unnamed moon reads as a rocky
    // body rather than a smooth ball, but no atmosphere/named decoration.
    restrained: { rockyDetail: { contrast: 0.2 } },
    cinematic: { rockyDetail: { contrast: 0.28 } },
    maximal: { rockyDetail: { contrast: 0.36 } },
    illustrativeCopy:
      'Illustrative — visual only, no physics. A lit, albedo-coloured sphere with faint procedural surface roughness. No named-body decoration is applied to a generic moon.',
  },

  // ── BLACK HOLE ─────────────────────────────────────────────────────────
  'black-hole': {
    key: 'black-hole',
    objectType: 'blackhole',
    // Identity is the blackness itself. Restrained shows the HONEST bare
    // version (pure black event-horizon sphere, no disk) — this is the truth
    // beat. Spectacle (accretion disk → lensing shell + jet) escalates.
    restrained: {},
    cinematic: {
      accretionDisk: { innerColor: '#ffb060', outerColor: '#5c3a1e', brightness: 0.8 },
    },
    maximal: {
      accretionDisk: { innerColor: '#ffd7a0', outerColor: '#7a4520', brightness: 1.15 },
      lensingShell: { color: '#ffe6c0', intensity: 0.5 },
      jet: true,
    },
    illustrativeCopy:
      'Illustrative — visual only, no physics. r_s (the event-horizon radius) is computed exactly from the mass and shown in the inspector. The accretion disk, lensing halo, and jet are decorative — no geodesic ray tracing or accretion physics is performed. Restrained mode shows the honest bare event horizon with none of these effects.',
  },
}
