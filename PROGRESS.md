# PROGRESS — Simuverse (docs/PROGRESS.md)

Living build state. Claude Code: read this FIRST every session, update it LAST every session. Keep it short — this is a dashboard, not a diary. Prune stale entries.

## Current position
Step **0.8 — DONE.** Phase 0 sub-steps 0.1–0.8 all complete. **Next: DECISION NEEDED** on the Phase 0 acceptance/vis-viva insert-semantics glue (see Known issues) before starting Phase 1 (1.1 worker).

## Completed steps
- 0.1 Scaffold — Vite react-ts, strict TS, ESLint+Prettier, vitest, first commit, deployed to Vercel.
- 0.2 Folder structure — created src/{core,units,commands,engine,scene,state,render,ui} (.gitkeep placeholders); tests/ already existed.
- 0.3 Scene schema — src/scene/schema.ts (zod v4, strict objects, inferred types) + src/scene/serialize.ts (pretty export + validated parse); round-trip + validation tests.
- 0.4 Units layer — src/units/units.ts (§5 constants G=4π²/c/AU/Msun/yr, UNIT_TO_CANONICAL derived from base constants, toCanonical/fromCanonical, 3-sig-fig formatter); tests for km↔AU, kg↔M☉, days/s, velocity (Earth≈2π), r_s(1M☉)≈2.95km.
- 0.5 Command bus — src/commands/registry.ts (Command/BusEvent types, pure insert/remove/set handlers with inverses, exhaustive applyCommand, CommandError) + src/commands/bus.ts (CommandBus: dispatch/subscribe/undo/redo, immutable, redo-clear on new action); insert→undo exact + set/remove inverse + error + subscription tests.
- 0.6 Parser — src/commands/parser.ts (parseCommand → ParsedCommand AST; \/bare prefixes, verb, positional args, key=value with scalar/tuple/word values, number+unit suffixes incl. slash units; bracket-aware tokenizer tolerates spaces in tuples; ParseError names bad token). SYNTAX-ONLY: units kept as raw strings (accepts 1Me etc.), enum validation deferred to the Quantity boundary. 24 tests.
- 0.7 Catalog — src/scene/catalog.ts (CATALOG defaults per §7: star 1M☉/1R☉, planet 3.003e-6 M☉, moon 0.0123 M⊕, blackhole 10 M☉; fidelity maps; makeDefaultParams/Fidelity deep-copy helpers) + DERIVED value defs (r_s, orbital period, v_esc, Hill radius) each with formula + KaTeX + canonical compute fn. 10 tests incl. r_s(10M☉)≈29.5km, period(1AU,1M☉)=1yr. NOTE: masses stored in Msun (no Earth-mass unit); `mass=1Me` command input is an insert-semantics concern for later.
- 0.8 Logger — src/scene/logger.ts (makeLogEvent factory; formatLogLine event→readable line; appendLog immutable store in doc.log; exportLogMarkdown = title+meta+config+chronological entries with equations in $$ LaTeX fences). 6 tests.

## Deployed URL
https://simuverse-snowy.vercel.app (Vercel project `ml-chikarupatis-projects/simuverse`, manual `vercel --prod` deploy)

## Test suite status
`pnpm test` green — 7 files, 75 tests (smoke + scene-schema + units + command-bus + parser + catalog + logger). `pnpm lint` and `pnpm build` also green.

## Known issues / deviations from PLAN
- Template shipped **oxlint** (Vite 8 default) with no Prettier; replaced with locked-stack **ESLint + Prettier** per §3. Compliance, not a deviation.
- ESLint needs a plugin set beyond bare `eslint`: `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `eslint-config-prettier`. Standard eslint tooling — flagging for owner awareness (not in the literal §3 list).
- Env: `corepack enable` failed on the portable Node install; pnpm installed via `npm i -g pnpm` instead. Functionally equivalent.
- Versions are template-current and bleeding-edge (TS 6.0.3, Vite 8.1.4, React 19.2.7); PLAN does not pin versions.
- `build` script uses `tsc -b` (solution build) rather than PLAN's literal `tsc`, required by the template's project-reference tsconfigs. Same intent.
- Vercel deploy is CLI-based (manual `vercel --prod`). Git-connected auto-deploy on push is NOT yet configured (needs Vercel dashboard: connect the GitHub repo). Owner decision.
- Rule conflict to resolve: STOPandASK says "you may only append to PROGRESS.md" but CLAUDE.md + this file's header say to update/prune it. Updated in place this session per the dashboard's intent — owner please confirm.
- ~~DESIGN TENSION (radius unit vs §5 enum)~~ **RESOLVED 2026-07-10 as Option B (owner-approved):** added `m` (metres) and `Rsun` (solar radii) to UnitSchema and to UNIT_TO_CANONICAL. `Rsun` derived from `RSUN_IN_M = 6.957×10⁸ m` through the existing `AU_IN_KM` (no separate AU constant). Round-trip tests added for both. One scene-schema test fixture updated (it had used `'m'` as its "unknown unit" example → now `'parsec'`).
- **OPEN Q1 — Phase 0 acceptance / vis-viva insert glue (DECISION NEEDED):** all sub-steps 0.1–0.8 are done, but the Phase 0 *acceptance* ("`\insert planet mass=1Me a=1AU around=sun` on a doc with a star → schema-valid doc, canonical pos/vel via vis-viva, derived period ≈1 yr logged with equation, undo removes it") and the Phase-0 test-matrix line "vis-viva insertion |v| = 2π" require an **insert-semantics layer** (ParsedCommand → catalog defaults + Me/M⊕ alias + vis-viva pos/vel → bus insert + logger) that is NOT a numbered sub-step in 0.1–0.8. Options: (a) build it now as a small Phase-0 capstone module; (b) defer to Phase 1/Phase 3 terminal wiring. Not built yet — awaiting owner call.
- **OPEN Q2 — log kind gap:** BusEvent has `objectRemoved` but §6's LogEvent `kind` enum has no removal kind (objectInserted/paramChanged/derivedComputed/sim*/…). When the logger is wired to the bus, removals have no legal kind. Options: add a `objectRemoved` kind (schema change → owner sign-off), or don't log removals. Deferred to the wiring step; flagging now.

## Decisions made mid-build (owner-approved changes to PLAN)
(none)

## Next actions
1. **Owner decision (OPEN Q1):** build the vis-viva insert-semantics glue now as a Phase-0 capstone, or defer to Phase 1/3 wiring? This gates the Phase 0 end-to-end acceptance.
2. Then Phase 1 — 1.1 worker + protocol (engine.worker.ts).
3. Later: resolve OPEN Q2 (objectRemoved log kind) and the Me/M⊕ command-input alias at the insert-semantics step.
4. Owner: decide whether to connect the GitHub repo in the Vercel dashboard for auto-deploy on push.

## Session log (newest first — one line per session)
- 2026-07-10: Steps 0.1–0.8 done — Phase 0 sub-steps complete (75 tests green). Two open questions flagged: vis-viva insert glue (Q1, gates Phase 0 acceptance) and objectRemoved log kind (Q2).
