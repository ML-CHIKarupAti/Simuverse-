# SIMUVERSE — Constitution (CLAUDE.md)

Loaded every session. Stable rules only — the detailed 41-step build plan lives in **docs/PLAN.md** (read the section for the step you're executing), and current build state lives in **docs/PROGRESS.md** (read it FIRST every session, update it LAST every session).

## Project
Browser-based astrophysics **simulation platform** (not a single demo) for the YPAE Simathon. Thesis: the simulation and the lab notebook are the same artifact. Deadline: **Sun, July 12, 11:59 PM IST.** Judged asynchronously from a 30–60 s video (seen first), screenshot, public repo, description. Equal criteria: visual impact · creativity · physics accuracy incl. honesty about approximations.

## Non-negotiables
1. **Fidelity labels on everything**: `exact` / `approximate` / `illustrative` / `narrative`. Never present illustrative content as physics.
2. **Determinism**: same scene file + config ⇒ bit-identical run; all randomness flows from the stored seed.
3. **Validation is a feature**: drift + Kepler results surfaced in UI and written to VALIDATION.md.
4. **Honest claims only** (e.g. "near-real-time NASA data", never "live").
5. **One numbered step at a time**: run its checks, commit as `feat(2.3): …`, update PROGRESS.md, move on.
6. **Beauty is judged**: cinematic rendering is core scope; every purely visual effect gets an `illustrative` label.

## Stack (locked)
Vite + React + TypeScript strict, pnpm. Physics in a Web Worker (plain TS, float64 — **no WASM**). Rendering: three.js via @react-three/fiber + drei + postprocessing. State: zustand. Tests: vitest. Equations: KaTeX. Deploy: Vercel static.
Allowed deps — runtime: react, react-dom, three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, zustand, katex, nanoid, zod, @fontsource/ibm-plex-sans, @fontsource/ibm-plex-mono (self-hosted fonts, never CDN). Dev: typescript, vite, @vitejs/plugin-react, vitest, eslint, prettier. **Nothing else without asking.**
**No backend. No database. No auth. No API routes.** Local-first by decision: localStorage autosave + JSON file export/import.

## Environment & workflow
Node ≥ 20, `corepack enable`. Scripts: dev, build (tsc && vite build), preview, test, test:watch, lint.
Built via Claude Code cloud sessions; owner reviews on the Vercel deploy (often from a phone). Work on `main` in small step-sized commits; `main` must always build. End every session: summarize step done, test results, what the owner should visually verify — and update docs/PROGRESS.md.

## Architecture (summary — details in PLAN §4–§7)
Three strictly separated layers: (1) **command/event bus** on the main thread — every action from terminal, palette, or UI is a Command; validated → applied → emits Events; logger, panels, undo are subscribers; UI never mutates state directly. (2) **Engine worker** — owns authoritative physics state, posts transferable Float64Array frames. (3) **Render layer** — r3f, read-only, interpolates frames. Contexts: `few-body` (real N-body) and `narrative` (scripted sequences).

## Units & constants (canonical: AU, M☉, yr)
G = 4π² ≈ 39.4784176 AU³·M☉⁻¹·yr⁻² · c = 63,197.79 AU/yr · 1 AU = 1.495978707×10¹¹ m · 1 M☉ = 1.98892×10³⁰ kg · 1 yr = 3.15576×10⁷ s. r_s = 2GM/c² (anchor: 1 M☉ ⇒ ≈ 2.95 km). Every stored quantity is { value, unit }; thin units.ts converts; internal math is always canonical.

## Design tokens (full design system: PLAN §8.5)
Dark observatory instrument. Background `#0B0E14`; docked panels solid matte `#12151C` border `#232A36`; floating elements dark glass `#0E1118` @75% + blur. Text `#E6EAF2` / secondary `#8B95A7`; **gold `#E8B84B` ONLY for emphasis**. Fidelity tag colors: exact `#3FB68B`, approximate `#E0763F`, illustrative `#C05CE0`, narrative `#5C8DE0` — tags live in the inspector ONLY, never on canvas; clicking a tag opens an explainer popover. Fonts: IBM Plex Sans (UI), IBM Plex Mono (all numbers/terminal/log), KaTeX (equations). Motion: instant, ≤80 ms opacity only, no animated counters. Forbidden: Tailwind-default blue, Bootstrap-look, pure white surfaces, second accent, emoji in chrome.

## Testing policy (per-phase required cases: PLAN §11)
Every step introducing pure logic ships vitest cases in the same commit. `pnpm test` green before every commit; full suite green at each phase end. NEVER relax a validation threshold to pass — report the failure. No e2e/visual-regression frameworks; rendering steps have explicit manual checks on the deploy.

## Working agreement
- Read docs/PROGRESS.md first; execute exactly one PLAN step; don't skip acceptance criteria.
- If a step reveals a design flaw, STOP and surface it — don't silently redesign.
- Never fabricate physics constants (use the table above / PLAN sources). UI copy must respect the honesty rules verbatim.
- Update docs/PROGRESS.md at session end: current step, completed list, deployed URL, known issues, next actions.

## File map
`/CLAUDE.md` constitution (this file) · `/docs/PLAN.md` full spec + 41 steps + testing matrix · `/docs/PROGRESS.md` living state · `/VALIDATION.md` generated by the harness · `README.md` written in Phase 6.

## Schedule
Thu night 0.1–0.8 · Fri 1.1–1.9 (validation green) · Sat: Phase 2 → 3 → 4 → 5 · Sun: Phase 6 package, personal cutoff 6 PM. Behind ≥ half a day? Cut: satellite stretch → snapshot polish → narrative length. Never cut Phase 6, the cinematic pass, or validation.
