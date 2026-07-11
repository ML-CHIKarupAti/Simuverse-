# PROGRESS — Simuverse (docs/PROGRESS.md)

Living build state. Claude Code: read this FIRST every session, update it LAST every session. Keep it short — this is a dashboard, not a diary. Prune stale entries.

## Current position
**Phase 1 IN PROGRESS.** Steps **1.1–1.6 DONE.** Next: **1.7 (sim loop — fixed-timestep accumulator driven by timescale; wire integrator dispatch + diagnostics emission every N≈100 steps)**.

## Completed steps
- 0.1 Scaffold — Vite react-ts, strict TS, ESLint+Prettier, vitest, first commit, deployed to Vercel.
- 0.2 Folder structure — created src/{core,units,commands,engine,scene,state,render,ui} (.gitkeep placeholders); tests/ already existed.
- 0.3 Scene schema — src/scene/schema.ts (zod v4, strict objects, inferred types) + src/scene/serialize.ts (pretty export + validated parse); round-trip + validation tests.
- 0.4 Units layer — src/units/units.ts (§5 constants G=4π²/c/AU/Msun/yr, UNIT_TO_CANONICAL derived from base constants, toCanonical/fromCanonical, 3-sig-fig formatter); tests for km↔AU, kg↔M☉, days/s, velocity (Earth≈2π), r_s(1M☉)≈2.95km.
- 0.5 Command bus — src/commands/registry.ts (Command/BusEvent types, pure insert/remove/set handlers with inverses, exhaustive applyCommand, CommandError) + src/commands/bus.ts (CommandBus: dispatch/subscribe/undo/redo, immutable, redo-clear on new action); insert→undo exact + set/remove inverse + error + subscription tests.
- 0.6 Parser — src/commands/parser.ts (parseCommand → ParsedCommand AST; \/bare prefixes, verb, positional args, key=value with scalar/tuple/word values, number+unit suffixes incl. slash units; bracket-aware tokenizer tolerates spaces in tuples; ParseError names bad token). SYNTAX-ONLY: units kept as raw strings (accepts 1Me etc.), enum validation deferred to the Quantity boundary. 24 tests.
- 0.7 Catalog — src/scene/catalog.ts (CATALOG defaults per §7: star 1M☉/1R☉, planet 3.003e-6 M☉, moon 0.0123 M⊕, blackhole 10 M☉; fidelity maps; makeDefaultParams/Fidelity deep-copy helpers) + DERIVED value defs (r_s, orbital period, v_esc, Hill radius) each with formula + KaTeX + canonical compute fn. 10 tests incl. r_s(10M☉)≈29.5km, period(1AU,1M☉)=1yr. NOTE: masses stored in Msun (no Earth-mass unit); `mass=1Me` command input is an insert-semantics concern for later.
- 0.8 Logger — src/scene/logger.ts (makeLogEvent factory; formatLogLine event→readable line; appendLog immutable store in doc.log; exportLogMarkdown = title+meta+config+chronological entries with equations in $$ LaTeX fences). 6 tests.
- 0.9 Insert semantics (Phase 0 capstone) — src/commands/insert.ts (ParsedCommand → catalog defaults + Me/M⊕ alias + vis-viva orbital insertion → pos/vel + logged period); objectRemoved log kind added.
- 1.1 Worker + protocol — engine split into: protocol.ts (types/messages/factories/transferables; added angularMomentumDriftRel to DiagnosticsPayload), engine.core.ts (PURE reducer handleMessage(state,msg)→{state,out[]}, unit-tested), engine.worker.ts (thin self glue), engineClient.ts (typed wrapper, tracks id↔slot order, WorkerLike seam for testing). 1.1 is PLUMBING ONLY — no forces/integrator yet (1.3/1.4); stepOnce advances the clock + emits a frame, bodies static. 14 tests (core + client via fake worker).
- 1.2 State layout — src/engine/state.ts: structure-of-arrays BodyArrays { n, ids[], mass[n], pos/vel/acc[3n] Float64Array }; pure fromBodies/toBodies/indexOf/addBody/removeBody(rebuild)/updateBody/frameArrays. engine.core refactored from EngineBody[] to `store: BodyArrays` (frame output unchanged, so client tests untouched). 8 store tests + core tests updated.
- 1.3 Force kernel — src/engine/forces.ts: computeAccelerations(n,mass,pos,acc,ε,G) pairwise Newtonian + Plummer softening, symmetric (Newton 3rd law) n(n-1)/2 loop, writes acc in place; computeForces(store,ε) convenience. 8 tests: ±G at 1 AU, 1/r² falloff, m·a equal/opposite, superposition cancels, softening caps the 1/r² singularity.
- 1.4 Velocity-Verlet — src/engine/integrators.ts: verletStep(store,dt,ε,G) KDK (half-kick/drift/recompute/half-kick), PRECONDITION store.acc primed (computeForces once), maintains invariant → 1 force-eval/step. 5 tests: circular orbit closes after 1 period, radius stays ~1 AU, energy drift <1e-4 over 2 orbits, momentum conserved, determinism bit-identical.
- 1.5 Yoshida 4th-order — added yoshida4Step to integrators.ts: composition of 3 verletStep calls scaled by (w₁,w₀,w₁), w₁=1/(2−2^(1/3)), w₀=−2^(1/3)/(2−2^(1/3)) (2w₁+w₀=1 exactly, tested). 6 tests incl. a head-to-head energy-drift comparison vs Verlet on an ECCENTRIC e=0.6 orbit (a circular orbit is a poor test — symmetry cancels truncation error into floating-point noise for both methods; matches why PLAN §1.8 itself validates on an eccentric orbit). Measured: Verlet 2.78e-13 vs Yoshida4 2.15e-14 over 2 orbits (~13× tighter) — consistent with 1.8's 100-orbit thresholds (verlet<1e-4, yoshida4<1e-6).
- 1.6 Diagnostics — src/engine/diagnostics.ts: totalEnergy (KE − softened PE, √(r²+ε²) MATCHING the force kernel — else energy would false-drift), angularMomentumVector/Magnitude (Σ m r×v about origin), conserved(), relativeDrift() with zero-baseline→absolute fallback (no NaN/Inf). 10 tests incl. virial E=−GMm/2a, radial→L=0, and an integrated eccentric orbit where the module SEES energyDriftRel<1e-6 & L-drift<1e-9. integrators.test.ts refactored to import totalEnergy (single source of truth).

## Deployed URL
https://simuverse-snowy.vercel.app (Vercel project `ml-chikarupatis-projects/simuverse`, manual `vercel --prod` deploy)

## Test suite status
`pnpm test` green — 14 files, 144 tests (+ diagnostics). `pnpm lint` and `pnpm build` also green.

## Known issues / deviations from PLAN
- Template shipped **oxlint** (Vite 8 default) with no Prettier; replaced with locked-stack **ESLint + Prettier** per §3. Compliance, not a deviation.
- ESLint needs a plugin set beyond bare `eslint`: `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `eslint-config-prettier`. Standard eslint tooling — flagging for owner awareness (not in the literal §3 list).
- Env: `corepack enable` failed on the portable Node install; pnpm installed via `npm i -g pnpm` instead. Functionally equivalent.
- Versions are template-current and bleeding-edge (TS 6.0.3, Vite 8.1.4, React 19.2.7); PLAN does not pin versions.
- `build` script uses `tsc -b` (solution build) rather than PLAN's literal `tsc`, required by the template's project-reference tsconfigs. Same intent.
- Vercel deploy is CLI-based (manual `vercel --prod`). Git-connected auto-deploy on push is NOT yet configured (needs Vercel dashboard: connect the GitHub repo). Owner decision.
- Rule conflict to resolve: STOPandASK says "you may only append to PROGRESS.md" but CLAUDE.md + this file's header say to update/prune it. Updated in place this session per the dashboard's intent — owner please confirm.
- ~~DESIGN TENSION (radius unit vs §5 enum)~~ **RESOLVED 2026-07-10 as Option B (owner-approved):** added `m` (metres) and `Rsun` (solar radii) to UnitSchema and to UNIT_TO_CANONICAL. `Rsun` derived from `RSUN_IN_M = 6.957×10⁸ m` through the existing `AU_IN_KM` (no separate AU constant). Round-trip tests added for both. One scene-schema test fixture updated (it had used `'m'` as its "unknown unit" example → now `'parsec'`).
- ~~**OPEN Q1 — Phase 0 acceptance / vis-viva insert glue**~~ **RESOLVED 2026-07-10 as Option A (owner-approved):** built `src/commands/insert.ts` as Phase-0 capstone. Implements ParsedCommand → catalog defaults + Me/M⊕ alias + orbital-element vis-viva insertion (a, e, around) → pos/vel + logging derived period. Phase 0 acceptance test (insert.test.ts:41–78) comprehensive and passing.
- ~~**OPEN Q2 — log kind gap**~~ **RESOLVED 2026-07-10:** `objectRemoved` added to LogEventKindSchema (schema.ts:97), tested in insert.test.ts:156–160.

## Decisions made mid-build (owner-approved changes to PLAN)
(none)

## Next actions
1. **Step 1.7 — sim loop:** fixed-timestep accumulator driven by timescale (sim-yr per real-second); cap substeps/tick (~5,000) and report EFFECTIVE timescale honestly if capped. This is where it all wires together in engine.core: pick integrator from config.integrator (verlet|yoshida4), prime acc on init, step, re-prime acc after body add/remove/update, and emit diagnostics (via diagnostics.conserved + relativeDrift vs an init baseline) every N≈100 steps. play/stepOnce become real motion.
2. Then 1.8 (validation harness → VALIDATION.md) → 1.9 (bench).
3. Owner: decide whether to connect the GitHub repo in the Vercel dashboard for auto-deploy on push (currently manual `vercel --prod`).

## Session log (newest first — one line per session)
- 2026-07-11: Recovered context after session loss (folder renamed Simuverse- → Simuverse). Steps 1.1–1.6 done. Quality discussion with owner: physics is validated (not vibes), Phase 2 visuals unproven until built — owner confirmed "fabric of space" = the actual Phase 2 canvas/starfield/bodies/trails done to a high bar, not a new grid-mesh feature. Owner: don't worry about deadline, prioritize quality, stay on track through phases in order.
- 2026-07-10 (session 2): Phase 0 COMPLETE. Resolved OPEN Q1 (Option A: vis-viva insert glue built as capstone in src/commands/insert.ts) and OPEN Q2 (objectRemoved kind added to LogEventKindSchema). Phase 0 acceptance test comprehensive (insert.test.ts:41–78). Ready for Phase 1.
- 2026-07-10: Steps 0.1–0.8 done — Phase 0 sub-steps complete (75 tests green). Two open questions flagged: vis-viva insert glue (Q1, gates Phase 0 acceptance) and objectRemoved log kind (Q2).
