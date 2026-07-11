# PROGRESS — Simuverse (docs/PROGRESS.md)

Living build state. Claude Code: read this FIRST every session, update it LAST every session. Keep it short — this is a dashboard, not a diary. Prune stale entries.

## Current position
**Phase 1 IN PROGRESS.** Step **1.1 (worker + protocol) — DONE.** Next: **1.2 (state layout — SoA Float64 arrays)**.

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

## Deployed URL
https://simuverse-snowy.vercel.app (Vercel project `ml-chikarupatis-projects/simuverse`, manual `vercel --prod` deploy)

## Test suite status
`pnpm test` green — 10 files, 109 tests (+ insert, engine-core, engine-client since the 75 count). `pnpm lint` and `pnpm build` also green.

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
1. **Step 1.2 — state layout:** refactor engine.core to structure-of-arrays (mass[n], pos/vel/acc[3n] as Float64Array); add/remove body rebuilds arrays. This replaces the 1.1 EngineBody[] representation.
2. Then 1.3 (force kernel) → 1.4 (velocity-Verlet) → 1.5 (Yoshida4) → 1.6 (diagnostics: fill energy/L drift) → 1.7 (sim loop) → 1.8 (validation harness → VALIDATION.md) → 1.9 (bench).
3. Owner: decide whether to connect the GitHub repo in the Vercel dashboard for auto-deploy on push (currently manual `vercel --prod`).

## Session log (newest first — one line per session)
- 2026-07-11: Recovered context after session loss (folder renamed Simuverse- → Simuverse). Step 1.1 done — engine protocol/core/worker/client (core+client split, plumbing-only). 109 tests green.
- 2026-07-10 (session 2): Phase 0 COMPLETE. Resolved OPEN Q1 (Option A: vis-viva insert glue built as capstone in src/commands/insert.ts) and OPEN Q2 (objectRemoved kind added to LogEventKindSchema). Phase 0 acceptance test comprehensive (insert.test.ts:41–78). Ready for Phase 1.
- 2026-07-10: Steps 0.1–0.8 done — Phase 0 sub-steps complete (75 tests green). Two open questions flagged: vis-viva insert glue (Q1, gates Phase 0 acceptance) and objectRemoved log kind (Q2).
