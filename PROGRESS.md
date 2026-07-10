# PROGRESS — Simuverse (docs/PROGRESS.md)

Living build state. Claude Code: read this FIRST every session, update it LAST every session. Keep it short — this is a dashboard, not a diary. Prune stale entries.

## Current position
Step **0.1 — DONE.** Next: Step **0.2** (folder structure) — not started.

## Completed steps
- 0.1 Scaffold — Vite react-ts, strict TS, ESLint+Prettier, vitest, first commit, deployed to Vercel.

## Deployed URL
https://simuverse-snowy.vercel.app (Vercel project `ml-chikarupatis-projects/simuverse`, manual `vercel --prod` deploy)

## Test suite status
`pnpm test` green — 1 file, 1 test (tests/smoke.test.ts placeholder). `pnpm lint` and `pnpm build` also green.

## Known issues / deviations from PLAN
- Template shipped **oxlint** (Vite 8 default) with no Prettier; replaced with locked-stack **ESLint + Prettier** per §3. Compliance, not a deviation.
- ESLint needs a plugin set beyond bare `eslint`: `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `eslint-config-prettier`. Standard eslint tooling — flagging for owner awareness (not in the literal §3 list).
- Env: `corepack enable` failed on the portable Node install; pnpm installed via `npm i -g pnpm` instead. Functionally equivalent.
- Versions are template-current and bleeding-edge (TS 6.0.3, Vite 8.1.4, React 19.2.7); PLAN does not pin versions.
- `build` script uses `tsc -b` (solution build) rather than PLAN's literal `tsc`, required by the template's project-reference tsconfigs. Same intent.
- Vercel deploy is CLI-based (manual `vercel --prod`). Git-connected auto-deploy on push is NOT yet configured (needs Vercel dashboard: connect the GitHub repo). Owner decision.
- Rule conflict to resolve: STOPandASK says "you may only append to PROGRESS.md" but CLAUDE.md + this file's header say to update/prune it. Updated in place this session per the dashboard's intent — owner please confirm.

## Decisions made mid-build (owner-approved changes to PLAN)
(none)

## Next actions
1. Step 0.2 — folder structure: create `src/core`, `src/units`, `src/commands`, `src/engine`, `src/scene`, `src/state`, `src/render`, `src/ui`, `tests/` per PLAN §8 (0.2).
2. Owner: decide whether to connect the GitHub repo in the Vercel dashboard for auto-deploy on push.

## Session log (newest first — one line per session)
- 2026-07-10: Env bootstrap (Node 22.14 portable, pnpm 11.11, Vercel CLI) + Step 0.1 scaffold done, deployed, committed feat(0.1).
