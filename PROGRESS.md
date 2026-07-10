# PROGRESS — Simuverse (docs/PROGRESS.md)

Living build state. Claude Code: read this FIRST every session, update it LAST every session. Keep it short — this is a dashboard, not a diary. Prune stale entries.

## Current position
Step **0.6 — DONE.** Next: Step **0.7** (catalog) — not started.

## Completed steps
- 0.1 Scaffold — Vite react-ts, strict TS, ESLint+Prettier, vitest, first commit, deployed to Vercel.
- 0.2 Folder structure — created src/{core,units,commands,engine,scene,state,render,ui} (.gitkeep placeholders); tests/ already existed.
- 0.3 Scene schema — src/scene/schema.ts (zod v4, strict objects, inferred types) + src/scene/serialize.ts (pretty export + validated parse); round-trip + validation tests.
- 0.4 Units layer — src/units/units.ts (§5 constants G=4π²/c/AU/Msun/yr, UNIT_TO_CANONICAL derived from base constants, toCanonical/fromCanonical, 3-sig-fig formatter); tests for km↔AU, kg↔M☉, days/s, velocity (Earth≈2π), r_s(1M☉)≈2.95km.
- 0.5 Command bus — src/commands/registry.ts (Command/BusEvent types, pure insert/remove/set handlers with inverses, exhaustive applyCommand, CommandError) + src/commands/bus.ts (CommandBus: dispatch/subscribe/undo/redo, immutable, redo-clear on new action); insert→undo exact + set/remove inverse + error + subscription tests.
- 0.6 Parser — src/commands/parser.ts (parseCommand → ParsedCommand AST; \/bare prefixes, verb, positional args, key=value with scalar/tuple/word values, number+unit suffixes incl. slash units; bracket-aware tokenizer tolerates spaces in tuples; ParseError names bad token). SYNTAX-ONLY: units kept as raw strings (accepts 1Me etc.), enum validation deferred to the Quantity boundary. 24 tests.

## Deployed URL
https://simuverse-snowy.vercel.app (Vercel project `ml-chikarupatis-projects/simuverse`, manual `vercel --prod` deploy)

## Test suite status
`pnpm test` green — 5 files, 55 tests (smoke + scene-schema + units + command-bus + parser). `pnpm lint` and `pnpm build` also green.

## Known issues / deviations from PLAN
- Template shipped **oxlint** (Vite 8 default) with no Prettier; replaced with locked-stack **ESLint + Prettier** per §3. Compliance, not a deviation.
- ESLint needs a plugin set beyond bare `eslint`: `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `eslint-config-prettier`. Standard eslint tooling — flagging for owner awareness (not in the literal §3 list).
- Env: `corepack enable` failed on the portable Node install; pnpm installed via `npm i -g pnpm` instead. Functionally equivalent.
- Versions are template-current and bleeding-edge (TS 6.0.3, Vite 8.1.4, React 19.2.7); PLAN does not pin versions.
- `build` script uses `tsc -b` (solution build) rather than PLAN's literal `tsc`, required by the template's project-reference tsconfigs. Same intent.
- Vercel deploy is CLI-based (manual `vercel --prod`). Git-connected auto-deploy on push is NOT yet configured (needs Vercel dashboard: connect the GitHub repo). Owner decision.
- Rule conflict to resolve: STOPandASK says "you may only append to PROGRESS.md" but CLAUDE.md + this file's header say to update/prune it. Updated in place this session per the dashboard's intent — owner please confirm.
- **DESIGN TENSION for owner (from 0.3):** the §5 unit enum is (AU, Msun, yr, km, kg, s, days, m/s, km/s) — it has NO plain metres `m` and no `R☉`. But §7 catalog specifies star radius as "1 R☉ (6.957×10⁸ m)". So there's no legal unit to store a radius in metres or solar radii. Schema was built to §5 as written (no `m`/`R☉`). Options when we reach the catalog (0.7): (a) store radius in `km`, (b) add `m`/`Rsun` to the enum (schema change → needs owner sign-off per STOPandASK #2/#3). Not blocking 0.3. Please advise.

## Decisions made mid-build (owner-approved changes to PLAN)
(none)

## Next actions
1. Step 0.7 — catalog: object defaults + fidelity maps + derived-value definitions (formula string, KaTeX string, compute fn) per §7. NOTE: this is where the radius-unit tension bites — need owner's call (store radius in km vs add m/Rsun to enum).
2. Owner: resolve the radius-unit design tension (see Known issues) — needed to start 0.7.
3. Owner: decide whether to connect the GitHub repo in the Vercel dashboard for auto-deploy on push.

## Session log (newest first — one line per session)
- 2026-07-10: Steps 0.1–0.6 done (scaffold+deploy, folders, scene schema, units, command bus, parser); radius-unit tension still open, bites at 0.7.
