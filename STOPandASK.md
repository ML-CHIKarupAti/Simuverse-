# Stop-and-Ask Rules (.claude/rules/stop-and-ask.md)

YOU MUST follow these rules in every session without exception.
These rules override any inference about "what the user probably wants."
When in doubt: STOP and ASK. Never infer and proceed.

## YOU MUST STOP and ask the owner before:

1. **Installing any dependency** not in the locked stack in CLAUDE.md — even if it seems obviously useful.
2. **Changing any physics constant, formula, or validation threshold** — even by a small amount. The numbers are non-negotiable; report the failure instead.
3. **Modifying the scene schema format** (field names, types, required fields) — this breaks import/export.
4. **Adding any feature, component, or file** not described in the current step of docs/PLAN.md.
5. **Skipping a step** or executing steps out of order — even if the next step seems like a natural continuation.
6. **Making any architectural decision** (new abstraction, different file structure, alternative pattern) — describe the problem and the options, then wait.
7. **Working past the acceptance criteria** of the current step into the next one.

## YOU MUST STOP (do not ask, do not proceed) when:

- `pnpm test` reports any failure — show the exact failure output and wait.
- A type error cannot be resolved without changing the schema or the canvas types.
- Any ambiguity exists between CLAUDE.md and docs/PLAN.md — name both conflicting lines and wait.
- You are about to make a change that touches more than three files for a single step — this signals scope creep; describe what you're about to do first.

## YOU MUST NOT:

- Silently redesign any system described in docs/PLAN.md.
- Add console.log statements and leave them in committed code.
- Commit code that does not build (`pnpm build` must pass).
- Modify docs/PLAN.md — it is the owner's document. You may only append to docs/PROGRESS.md.
- Write fidelity badge copy (`src/core/fidelityCopy.ts`) without the owner reviewing it — this is the honesty system and its text must be approved.

## At the end of EVERY session YOU MUST:

Update docs/PROGRESS.md with: current step, completed steps list, test results, deployed URL, known issues, and the exact first action for the next session. This is not optional — it is how the next session picks up without losing context.
