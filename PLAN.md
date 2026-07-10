# SIMUVERSE — Full Build Plan (docs/PLAN.md)

This is the complete detailed specification and step-by-step build plan. It is read ON DEMAND: at the start of a step, read the section for the phase you are executing (plus §5–§8.5 references as needed). The always-loaded constitution is /CLAUDE.md; current build state is /docs/PROGRESS.md. If this file and CLAUDE.md ever conflict, stop and ask the owner.

---

## 1. Mission & Thesis

Simuverse is a browser-based astrophysics **simulation platform** (not a single demo). Core thesis: **the simulation and the lab notebook are the same artifact.** Every object carries real equations, every change is logged, every scene is deterministic and exportable.

Context: solo build for the YPAE Simathon. **Deadline: Sunday, July 12, 11:59 PM IST.** There is NO live demo — judging is asynchronous from the submission package: a 30–60 s video (judges watch this first), a screenshot, a public GitHub repo with a one-line README, and a short description. Three equally weighted criteria: **visual impact** (density, glow, motion, color — "does it make us go whoa"), **creativity** (an original angle beats a polished copy), **physics accuracy** (real formulas, sensible constants, honesty about what you approximated — "a physicist should nod, not wince"). Ship quality over quantity — and build every feature with its 3-second video shot in mind.

## 2. Non-Negotiables

1. **Fidelity badges on everything.** Every object and every effect is labeled one of: `exact` (correct within the stated model), `approximate` (simplified real physics), `illustrative` (visual only, no physics), `narrative` (scripted sequence with real milestone numbers). Never present illustrative content as physics.
2. **Determinism.** Same scene file + same config ⇒ bit-identical run. No hidden randomness; all randomness flows from the scene's stored seed.
3. **Validation is a feature.** Energy drift and Kepler-test results are surfaced in the UI and recorded in `VALIDATION.md` for the presentation.
4. **Honest claims only.** Satellite tab (if built) is "near-real-time NASA data," never "live."
5. **One step at a time.** Complete a numbered step, run its checks, commit with the step number (e.g. `feat(0.3): scene schema`), then move on.
6. **Beauty is judged.** Visual impact is one-third of the score. Cinematic rendering (bloom, glow, dense starfield, trails, physically meaningful color) is core scope, not polish — and every purely visual effect gets an `illustrative` badge. Honest AND gorgeous.

## 3. Locked Tech Stack

- Vite + React + TypeScript (strict mode), pnpm
- three.js via @react-three/fiber + @react-three/drei + @react-three/postprocessing for bloom/glow (Phase 2+)
- zustand for UI state
- Physics in a dedicated Web Worker (plain TypeScript, float64). **No WASM** — out of scope, adds no accuracy at this body count.
- vitest for tests
- KaTeX for equation rendering (Phase 3)
- Deploy: Vercel, from day one
- Phase 5 satellite tab only: CesiumJS + satellite.js + CelesTrak TLEs + NASA GIBS WMTS imagery

**Complete allowed dependency list (do not add others without asking):**
Runtime: `react`, `react-dom`, `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `zustand`, `katex`, `nanoid`, `zod`, `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono` (fonts self-hosted — never load from Google Fonts CDN; the app must render correctly offline).
Dev: `typescript`, `vite`, `@vitejs/plugin-react`, `vitest`, `eslint`, `prettier`.

**No backend. No database. This is a decision, not an omission.** The app is local-first: working document autosaves to localStorage; sharing/persistence is JSON file export/import; deployment is a static Vercel site. Do NOT add a server, API routes, auth, or any database. Nothing in the judging rubric rewards them and every one of them adds demo-day risk.

### 3.5 Environment & Run

- Node ≥ 20. Enable pnpm via `corepack enable`.
- package.json scripts: `dev` (vite), `build` (tsc && vite build), `preview`, `test` (vitest run), `test:watch`, `lint`.
- Workflow: this repo is built through Claude Code cloud sessions. Work directly on `main` in small step-sized commits (solo project; PR overhead not worth it), push after every completed step. Vercel auto-deploys `main` — the deployed URL is the primary place the owner verifies visuals (often from a phone), so `main` must always build. If a step is risky, use a branch and merge when green.
- After every push that completes a step, state in the session summary: step number, what changed, test results, and anything the owner should visually verify on the deployed preview.

## 4. Architecture

Three layers, strictly separated:

1. **Command/event bus (main thread).** Every user action — from terminal, UI button, or file import — becomes a `Command`. Commands are validated, applied, and emit `Events`. The logger, UI panels, and undo stack are all event subscribers. UI buttons never mutate state directly; they dispatch commands.
2. **Engine worker.** Owns authoritative physical state. Receives control messages, posts state frames back as transferable Float64Arrays. Never touches the DOM.
3. **Render layer.** react-three-fiber reads the latest state frame and interpolates. Read-only with respect to physics.

Simulation **contexts** (engine modes behind one canvas shell): `few-body` (this build), `narrative` (Phase 5 timeline sequences). `particle-field` (galaxies) is future work — the interface allows it, nothing implements it.

## 5. Canonical Units & Constants

Internal units: **AU (length), M☉ (mass), yr (time).**

- G = 4π² ≈ 39.4784176 AU³·M☉⁻¹·yr⁻² (exact for these units by Kepler's third law)
- c = 63,197.79 AU/yr
- Display conversions (UI only, never internal): 1 AU = 1.495978707×10¹¹ m; 1 M☉ = 1.98892×10³⁰ kg; 1 yr = 3.15576×10⁷ s (Julian year)
- Schwarzschild radius: r_s = 2GM/c². Sanity anchor: M = 1 M☉ ⇒ r_s ≈ 2.95 km ≈ 1.97×10⁻⁸ AU.

Every quantity in the scene file is stored as `{ value, unit }` where unit is from a small fixed enum (AU, Msun, yr, km, kg, s, days, m/s, km/s). A thin `units.ts` module converts to/from canonical. No general-purpose units library.

## 6. Scene Document Schema (v1)

`SceneDoc`:
- `schemaVersion`: 1
- `meta`: { name, createdAt, appVersion, seed }
- `config`: { integrator: "verlet" | "yoshida4", dt (yr), softening ε (AU), timescale }
- `objects`: SimObject[]
- `log`: LogEvent[] (append-only)
- `snapshots`: { simTime, objectStates[] }[]

`SimObject`:
- `id` (nanoid), `type` ("star" | "planet" | "moon" | "blackhole"), `name`
- `params`: map of Quantity (mass required; radius, luminosity, spin optional per type)
- `state`: { pos: [x,y,z], vel: [vx,vy,vz] } in canonical units
- `fidelity`: map of aspect → level, e.g. { gravity: "exact", lensing: "illustrative" }
- `provenance`: { source: "user" | "preset" | "import", detail? }

`LogEvent`: { t (wall clock), simTime, kind, message, equation?, values? }
Kinds: objectInserted, paramChanged, derivedComputed, simStarted, simPaused, timescaleChanged, snapshotTaken, sceneImported, validationRun.

Export = pretty-printed JSON download. Import = file upload → schema-validate → rebuild. Log export = Markdown.

## 7. Command Grammar & Object Catalog

Grammar: `\verb target key=value key=(a,b,c) ...`
Prefix: `\` is canonical (LaTeX-style — deliberate, fits the audience) and appears in all hints/docs, but the parser also accepts `/verb` and bare `verb` in the terminal.

**Core commands (must ship):**
- Objects: `\insert <type> [params]` · `\set <id|name> key=value` · `\remove <id|name>` · `\rename <id|name> <newname>` · `\clone <id|name>` · `\list` (all objects with fidelity levels) · `\inspect <id|name>` (opens its instruments)
- Simulation: `\play` · `\pause` · `\step [n]` · `\timescale <x>` · `\reset` (restore initial state)
- Scene: `\snapshot [label]` · `\restore <label|index>` · `\save` · `\export [scene|log]` · `\scene <preset-name>` (loads a built-in preset)
- View: `\focus <id|name>` (camera flies to object) · `\mode restrained|cinematic|maximal` · `\trails on|off`
- Research: `\note <text>` (timestamped entry into the log) · `\undo` · `\redo` · `\help [verb]` · `\clear` (terminal scrollback only)

**Stretch commands (only after Phase 5 primary):**
- `\timeline collapse mass=25Msun` is Phase 5 primary, listed here for grammar completeness
- `\orbit <a> <b>` (put existing object b in orbit around a) · `\measure <a> <b>` (live distance + relative velocity readout) · `\seed <n>` (re-seed procedural elements)

Insert semantics: `\insert blackhole mass=10Msun` — unspecified params take catalog defaults. `\insert planet mass=1Me a=1AU e=0.0167 around=<id|name>` — orbital-element insertion computes pos/vel via vis-viva for the specified orbit.
Every command echoes a confirmation line in the terminal and emits its event to the logger. `\help` with no args lists all verbs; autocomplete covers verbs, object names, and param keys.

Catalog defaults (fidelity maps included):
- **star**: 1 M☉, radius 1 R☉ (6.957×10⁸ m), gravity exact, surface visuals illustrative
- **planet**: 1 M⊕ (3.003×10⁻⁶ M☉), gravity exact
- **moon**: 0.0123 M⊕, gravity exact
- **blackhole**: 10 M☉, gravity exact (Newtonian point mass — labeled as such), derived r_s shown with equation, accretion/lensing visuals illustrative

Derived values (computed on param change, logged with equation string):
- r_s = 2GM/c² (blackhole)
- Orbital period T = 2π√(a³/GM_total) for a body on a bound orbit
- v_esc = √(2GM/r)
- Hill radius r_H ≈ a(1−e)·(m/3M)^(1/3)

## 8. Phase Plan

### PHASE 0 — Skeleton (target: Thu night, ~4–5 h)

- **0.1 Scaffold (45 min).** pnpm + Vite react-ts template, strict tsconfig, ESLint + Prettier, vitest wired, git init, first commit. Deploy the blank app to Vercel now (deployment must never be a Sunday surprise).
- **0.2 Folder structure (15 min).** `src/core` (types, ids, constants), `src/units`, `src/commands` (parser, registry, bus), `src/engine` (worker, integrators, diagnostics, protocol), `src/scene` (schema, serialize, catalog), `src/state` (zustand), `src/render` (empty for now), `src/ui` (empty), `tests/`.
- **0.3 Scene schema (60 min).** Implement §6 as TypeScript types + a runtime validator (zod or hand-rolled guards). Round-trip test: build doc → serialize → parse → deep-equal.
- **0.4 Units layer (45 min).** Canonical constants from §5, `toCanonical`/`fromCanonical`, display formatter (3 sig figs + unit). Tests: km↔AU, kg↔M☉ round-trips; r_s(1 M☉) ≈ 2.95 km.
- **0.5 Command bus (60 min).** Command type, registry, dispatch pipeline (validate → apply → emit events), event subscription API, undo stack of inverse commands (insert↔remove, set↔set-previous).
- **0.6 Parser (45 min).** Tokenize `\verb target k=v` incl. tuples and unit suffixes (10Msun, 1AU, 5km/s). Clear error messages for bad input.
- **0.7 Catalog (30 min).** Object defaults + fidelity maps + derived-value definitions (formula string, KaTeX string, compute fn) from §7.
- **0.8 Logger (30 min).** Event → readable line; store in doc; Markdown export function.

**Phase 0 acceptance:** in a dev console/test, `\insert planet mass=1Me a=1AU around=sun` on a doc containing a star produces a schema-valid SceneDoc with correct canonical pos/vel, a derived period ≈ 1 yr logged with its equation, and undo cleanly removes it.

### PHASE 1 — Engine (target: Fri, ~6–7 h)

- **1.1 Worker + protocol (60 min).** `engine.worker.ts`. Messages in: init(config, bodies), play, pause, setTimescale, stepOnce, updateBody, addBody, removeBody, requestSnapshot. Messages out: frame { simTime, positions: Float64Array (transferable), velocities }, diagnostics { E, |L|, relative drift }, error. Main-thread wrapper with typed API (Comlink optional; raw postMessage fine).
- **1.2 State layout (30 min).** Structure-of-arrays: mass[n], pos[3n], vel[3n], acc[3n] as Float64Array. Add/remove body = rebuild arrays (n is small).
- **1.3 Force kernel (45 min).** Pairwise Newtonian gravity with Plummer softening: a_i = Σ G m_j (r_j − r_i) / (|r_j − r_i|² + ε²)^{3/2}. Default ε = 10⁻⁶ AU, per-scene configurable.
- **1.4 Velocity-Verlet (45 min).** Kick-drift-kick, fixed dt. Default dt = 10⁻⁴ yr (≈ 53 min) for inner-solar-system scenes.
- **1.5 Yoshida 4th-order (60 min).** Triple-Verlet composition with w₁ = 1/(2 − 2^{1/3}), w₀ = −2^{1/3}/(2 − 2^{1/3}); coefficients (w₁, w₀, w₁) applied as scaled Verlet substeps. Selectable via config; default integrator = yoshida4.
- **1.6 Diagnostics (45 min).** Total E = Σ½mv² − Σ_{i<j} Gm_im_j/√(r²+ε²); angular momentum L = Σ m(r×v). Relative drift vs t=0, emitted every N steps (N ≈ 100).
- **1.7 Sim loop (45 min).** Fixed-timestep accumulator driven by timescale (sim-yr per real-second); cap substeps per tick (e.g. 5,000) to prevent freeze at extreme timescales — if capped, report effective timescale honestly in a diagnostic.
- **1.8 Validation harness (75 min).** vitest:
  (a) Circular two-body, a = 1 AU about 1 M☉ ⇒ measured period within 0.01% of 1 yr.
  (b) Eccentric e = 0.6 orbit, 100 orbits ⇒ |ΔE/E₀| < 10⁻⁶ (yoshida4) and < 10⁻⁴ (verlet); |ΔL/L₀| < 10⁻⁹.
  (c) Determinism: two runs, same config ⇒ identical Float64 state (hash compare).
  Write results into `VALIDATION.md` (table: test, target, measured, pass).
- **1.9 Bench (30 min).** 500 random bodies: measure steps/sec; assert comfortably real-time at dt = 10⁻⁴ yr. Record number in VALIDATION.md.

**Phase 1 acceptance:** all validation tests green; VALIDATION.md populated; worker runs Sun–Earth–Moon from the command bus with live drift diagnostics.

### PHASE 2 — Canvas + cinematic pass (Sat morning, ~4.5 h)

- **2.1 Render scaffold (30 min).** Install three/r3f/drei/postprocessing. `src/render/CanvasRoot.tsx`: full-bleed `<Canvas>` behind all UI; canvas clear color `#05070B` (darker than the `#0B0E14` chrome); drei `OrbitControls` (rotate/zoom/pan). *Accept:* empty canvas with smooth camera controls at 60 fps, zero console warnings.
- **2.2 Frame bridge (45 min).** `src/state/frameStore.ts` (zustand): holds the two most recent worker frames (prev, next) + their sim times. Render loop (useFrame) interpolates each body's position linearly between prev and next using the accumulator alpha from the worker's timing message. *Accept:* with the engine running, logged render positions change smoothly with no stutter when physics rate ≠ frame rate.
- **2.3 Scale + floating origin (60 min).** `src/render/scale.ts`: RENDER_SCALE = 10 render units per AU. Floating origin: all meshes positioned relative to a world offset; when camera target moves > 5,000 units from origin, rebase (subtract offset from camera + all objects). Visual body radii (display only — real scale is invisible; Methods page labels this "display scaling — illustrative"): star `1.4·(M/M☉)^0.25`, planet `0.5·(M/M⊕)^0.15`, moon `0.3`, blackhole `1.0·(M/10 M☉)^0.25` render units. *Accept:* an object at 100 AU shows no position jitter when orbited by the camera.
- **2.4 Body meshes + selection (60 min).** `src/render/BodyMesh.tsx`: sphere per body. Materials by type — star: emissive, color from `src/render/blackbody.ts` implementing the standard piecewise blackbody RGB approximation (valid ~1,000–40,000 K; badge `approximate`, cite the approximation in a comment); planet/moon: standard material with albedo color param; blackhole: pure black sphere. Raycast onPointerDown → sets selection store (same store the inspector uses). Hover: pointer cursor. *Accept:* a 5,772 K star renders warm white; edit temperature to 3,000 K → visibly red-orange. Clicking a body selects it.
- **2.5 Starfield (30 min).** `src/render/Starfield.tsx`: drei Points, count from render mode preset, distributed on a far sphere attached to the camera (so it never rebases); per-star size/brightness/subtle color variation seeded from `meta.seed` (determinism). Badge: `illustrative`. *Accept:* dense, non-repeating sky; frame rate unchanged.
- **2.6 Trails (60 min).** `src/render/Trail.tsx`: per-body ring buffer (Float32Array, capacity = preset trailLength), append every 4th physics frame; rendered as a line with additive blending and alpha fading from head to tail; color = body color, or velocity-mapped when `\trails` color mode is on. *Accept:* an e = 0.5 orbit draws a visible glowing ellipse; memory stable over 10 min (buffer reuse, no allocation growth).
- **2.7 Postprocessing + render modes (45 min).** EffectComposer + Bloom. `src/state/renderModeStore.ts` with the exact preset table — restrained: { bloom 0.25, trailLength 128, starCount 6,000 } · cinematic (default): { bloom 0.9, trailLength 256, starCount 10,000 } · maximal: { bloom 1.8, trailLength 512, starCount 15,000 }. Top-bar three-way toggle; tooltip text verbatim: "Render mode never affects physics." `\mode` command routes here. *Accept:* switching modes changes visuals instantly; energy diagnostics identical across modes.
- **2.8 Camera focus (30 min).** `\focus <id|name>`: snap camera target to the object (instant per motion rules), distance = 8× its visual radius, min 4 units. Default scene camera frames the whole system. *Accept:* `\focus earth` lands framed and oriented sensibly.

**Phase 2 acceptance:** Sun–Earth–Moon runs at 60 fps in cinematic mode, all bodies selectable from the canvas, and a paused freeze-frame is already screenshot-worthy.

### PHASE 3 — Terminal, palette, inspector (Sat midday, ~4.5 h)

- **3.1 Dock shell (30 min).** `src/ui/DockPanel.tsx`: bottom dock, 220px, solid matte per §8.5, tabs "Terminal" and "Log", collapse/expand button (state persisted in localStorage). *Accept:* dock renders, tabs switch, collapse works, canvas resizes correctly beneath it.
- **3.2 Terminal (75 min).** `src/ui/Terminal.tsx`: IBM Plex Mono input line + scrollback. ↑/↓ cycles command history; Tab autocompletes in priority order verbs → object names → param keys (all from the catalog/scene). Every submission goes through the command bus; success echoes the confirmation line, errors echo prefixed `!` in `#E0763F` with the parser's message (which must name the bad token). *Accept:* every core command from §7 round-trips; a typo like `\insert blakhole` returns "unknown type 'blakhole' — did you mean blackhole?".
- **3.3 Cmd+K palette (45 min).** `src/ui/CommandPalette.tsx`: Cmd+K / Ctrl+K opens a centered glass overlay; fuzzy-matches over verbs, preset scene names, and object names; Enter executes complete commands directly or drops a template (e.g. `\insert planet a= e=`) into the terminal with focus. Esc closes. *Accept:* Cmd+K → type "bl" → Enter → black hole appears.
- **3.4 Inspector shell + Objects list (45 min).** `src/ui/InspectorPanel.tsx`: right, 340px, solid matte, collapsible. Top section `src/ui/ObjectsList.tsx`: one row per scene object — name, type, fidelity corner tag showing the object's LOWEST fidelity level across its aspects. Row click selects; tag click opens the popover (3.5). *Accept:* list live-syncs with insert/remove/rename; selection highlights the row.
- **3.5 Fidelity tags + popovers (45 min).** `src/ui/FidelityTag.tsx` + `src/ui/FidelityPopover.tsx` (glass). Popover content: the level's general definition + this element's specific honesty text, both from `src/core/fidelityCopy.ts` — write ALL copy in this step: four level definitions + per-aspect strings for every catalog type (e.g. blackhole/gravity: "Newtonian point mass — exact within the Newtonian model; no relativistic corrections." blackhole/visuals: "Accretion glow and lensing are decorative. r_s is computed exactly; light paths are not."). *Accept:* clicking the tag on a black hole's row explains precisely what is and isn't real.
- **3.6 Instruments (75 min).** `src/ui/Instruments.tsx` below the list: for the selected object — editable params (numeric field + unit dropdown limited to that param's legal units; commit on Enter/blur → dispatches `\set` through the bus, so undo works); derived values section — each row: name, live value (Plex Mono, gold), KaTeX-rendered equation, per-section fidelity tag. KaTeX CSS imported once globally. *Accept:* change a black hole's mass → r_s updates live with `r_s = 2GM/c²` rendered; change units kg↔M☉ → same canonical value.
- **3.7 Selection sync (30 min).** One selection store; three writers: canvas raycast, list row click, `\inspect`. All three converge; selecting opens/updates the inspector. *Accept:* all three paths produce identical UI state.

**Phase 3 acceptance:** the full loop — type a command, watch the object appear, see it listed with a truthful tag, open its instruments, edit a value, watch derived physics respond — works end to end with zero direct state mutation outside the bus.

### PHASE 4 — Time, logger, persistence (Sat afternoon, ~3.5 h)

- **4.1 Transport bar (45 min).** `src/ui/TransportBar.tsx`: floating glass, bottom-center. Play/pause, single-step, snapshot button, current sim time (Plex Mono, auto-unit: days below 0.5 yr, years above, Myr above 10⁶). Timescale slider: log₁₀ scale, 10⁻² to 10⁹ simulated years per real second, with a friendly readout ("3.65 days/s", "1 yr/s", "1 Myr/s"). If the worker's substep cap engages, show the EFFECTIVE rate in gold with a tooltip explaining the cap — never silently lie about speed. *Accept:* slider changes speed live; cap case displays honestly.
- **4.2 Snapshots (45 min).** Snapshot = full body-state capture keyed to sim time, stored in the doc, taken via button or `\snapshot [label]`. Snapshot strip UI (in the Log tab header): chips with label/time; clicking one dispatches `\restore` → worker reinitializes from that state through the bus (logged, undoable). *Accept:* run 50 yr, snapshot, run 50 more, restore → positions hash-identical to capture.
- **4.3 Drift indicator (30 min).** `src/ui/DriftBadge.tsx` in the top bar: live |ΔE/E₀| in Plex Mono — green `#3FB68B` below 10⁻⁶, gold `#E8B84B` below 10⁻⁴, orange `#E0763F` above. Click → glass popover explaining energy drift in one paragraph and why users should care. *Accept:* value matches worker diagnostics; colors switch at thresholds.
- **4.4 Logger panel (45 min).** `src/ui/LogPanel.tsx` (dock tab): reverse-chronological event lines — sim time, message, inline KaTeX when an equation is attached; filter chips by event kind; `\note` entries highlighted gold. "Export log" button → assembles Markdown (title, scene meta, config, chronological entries with equations in LaTeX fences) → browser file download. *Accept:* exported Markdown opens cleanly and contains the derived-value equations.
- **4.5 Save/load (45 min).** `\export scene` → pretty-printed JSON download named `<scene-name>.simuverse.json`. Import: file picker + drag-drop anywhere on the canvas; zod-validates against the schema; failures report the exact bad path in the terminal (`!` line). Autosave: debounced 10 s to localStorage key `simuverse:autosave`; on app load, if present, offer "Restore last session?" (glass toast, instant per motion rules). *Accept:* build → run → snapshot → export → hard-reload → import → restore snapshot: full round trip, bit-identical state.
- **4.6 Undo/redo wiring (30 min).** Top-bar buttons + Cmd+Z / Shift+Cmd+Z → the bus's inverse-command stack from step 0.5. Sim-time-advancing actions are NOT undoable (only commands are) — document this in `\help undo`. *Accept:* insert → set mass → undo → undo returns the exact prior doc.

**Phase 4 acceptance:** the app is now a real workspace — a user can build, run, annotate, snapshot, export, and fully restore a session across a page reload.

### PHASE 5 — Showstopper (Sat evening, ~3.5 h)

- **5.1 Narrative framework (60 min).** `narrative` context type: a `NarrativeSequence` = ordered stages `{ id, label, realDuration (display string), playSeconds (wall-clock at 1× transport), panelFacts[], canvasState }`. The transport bar drives it: play advances stage progress, pause freezes, scrubbing maps timeline position → stage + progress. Everything badged `narrative`. *Accept:* a dummy two-stage sequence plays, pauses, and scrubs.
- **5.2 Collapse model (45 min).** `src/narrative/collapseModel.ts` — the `\timeline collapse mass=25Msun` stage data, with real numbers and a source comment on each (standard stellar-evolution values): (1) **Main sequence** — 25 M☉, T_eff ≈ 35,000 K (renders blue-white via the blackbody map), lifetime ≈ 7 Myr; (2) **Red supergiant** — T ≈ 3,500 K, R ≈ 1,000 R☉ (visual radius grows, color reddens), shell burning, ~10⁵ yr; (3) **Core collapse + supernova** — trigger fact: iron core exceeds the Chandrasekhar mass (~1.4 M☉) and collapses; remnant above the TOV limit (~2.2 M☉) cannot stabilize as a neutron star; (4) **Black hole remnant** — default 10 M☉ (panel notes mass lost to winds + ejecta), r_s computed LIVE from the remnant mass ≈ 29.5 km. Panel shows each stage's facts as they occur. *Accept:* every number on screen traces to this file; nothing hardcoded in components.
- **5.3 Supernova burst (60 min).** GPU particle system, 20–40k points: radial velocities with seeded variation, color graded over particle lifetime white → gold → deep red (temperature-cooling metaphor), fading alpha; plus one expanding shockwave ring sprite. Badge `illustrative`. Budget: 60 fps in cinematic mode. *Accept:* the burst is the single most striking frame in the app — this is the video's 0-second shot and the leading screenshot candidate.
- **5.4 Accretion glow (45 min).** Black-hole visual upgrade: thin emissive annulus (additive, slow rotation) + soft glow sprite, shown in cinematic/maximal modes only. Popover copy verbatim: "r_s is computed exactly from mass. The disk and glow are decorative — no geodesic ray tracing is performed." *Accept:* BH reads instantly as a black hole at video scale; restrained mode shows the honest bare version.
- **5.5 `\timeline` wiring (30 min).** `\timeline collapse mass=25Msun` inserts the narrative into the scene (position param optional, default origin); on completion the remnant becomes a REAL blackhole object in the few-body engine — insert a planet afterward and it orbits. *Accept:* full sequence plays end-to-end; scrub works; the ending black hole participates in real gravity. That final beat — spectacle collapsing into a working physical object — is the product thesis in one shot.
- **5.6 STRETCH ONLY (post-Phase-6, hours to spare): satellite tab.** Separate route; Cesium globe; ~50 curated satellites from a bundled CelesTrak TLE snapshot (cached in-repo — never a live fetch dependency) propagated with satellite.js; one GIBS WMTS imagery layer; banner verbatim: "Near-real-time NASA GIBS imagery (typ. 3–5 h latency) · Orbits from CelesTrak TLEs via SGP4."

**Phase 5 acceptance:** the collapse narrative is demo-ready and ends in a physically functioning black hole.

### PHASE 6 — Submission package (Sun, NON-NEGOTIABLE, ~5 h)

- **6.1 Preset scenes (60 min).** Implement `\scene <name>` with three presets in `src/scene/presets.ts`. **solar-inner** — real values (place each planet at perihelion, true anomalies spread 0°/72°/144°/216° for visual separation; velocities via vis-viva): Sun 1 M☉ (T = 5,772 K); Mercury m = 1.660×10⁻⁷ M☉, a = 0.3871 AU, e = 0.2056; Venus m = 2.448×10⁻⁶ M☉, a = 0.7233 AU, e = 0.0068; Earth m = 3.003×10⁻⁶ M☉, a = 1.0000 AU, e = 0.0167; Mars m = 3.227×10⁻⁷ M☉, a = 1.5237 AU, e = 0.0934. **bh-binary** — 10 M☉ blackhole + 1 M☉ star, a = 1 AU, e = 0.5. **collapse-demo** — empty scene + the `\timeline collapse` narrative pre-loaded. *Accept:* each preset loads in one command; solar-inner's Earth period measures 1.00 yr.
- **6.2 Methods & Fidelity page (45 min).** Route `/methods`, matte style: integrator + coefficients, canonical units + constants, softening value, display-scaling disclosure, the four fidelity definitions with their tag colors, and the validation table imported from the same source of truth as VALIDATION.md. *Accept:* a physicist judge could audit the app from this one page.
- **6.3 QA sweep (60 min).** Zero console errors/warnings through the full demo path; export→import round trip on a fresh browser profile; fonts render offline (self-hosted check); phone-viewport visitors get a graceful glass banner "Simuverse is best experienced on a desktop browser" over a still-functional canvas; every command in `\help` actually works. *Accept:* the demo path runs clean twice in a row.
- **6.4 Final deploy (15 min).** Push, verify the production Vercel URL cold-loads correctly in an incognito window. Tag `v1.0.0`.
- **6.5 Screenshot (30 min).** Browser at 1920×1080, 100% zoom, bookmarks bar hidden, Maximal mode. Candidates in priority order: supernova frame; bh-binary with glowing trails + inspector open showing r_s and tags. Take 5+, pick 1, upload for a direct image link.
- **6.6 Video, 30–60 s (90 min).** Screen-record the DEPLOYED app (OS recorder or OBS, 1080p, 60 fps preferred), text overlays, no narration required. Storyboard: 0–5 s supernova → black hole forms · 5–25 s command montage: `\insert star` → `\insert planet a=1AU` (orbit appears, period logs) → `\insert blackhole mass=10Msun` (system reacts, r_s updates live with its equation) · 25–40 s timescale crank + trails; flip Maximal → Restrained as the honesty beat · 40–50 s fidelity popover + validation table close-up · 50–60 s end card: "Simuverse — a simulation platform, not a single sim. Build your own: [live link]". ≥3 takes, pick the best, upload unlisted (YouTube/Loom).
- **6.7 README + description (45 min).** README line 1: what it shows + how to run (live URL, then `pnpm i && pnpm dev`). Then: Quick start · Commands table · **Fidelity table** (every feature → its level, one honest sentence each) · **Validation table** (test, target, measured) · 5-line architecture note · License. Organizer doctrine: state what's real and what's decoration. Description + tagline for the form, leading with the live link — judges can build a system themselves, which no `python sim.py` submission offers.
- **6.8 Submit (15 min).** Form fields: title, tagline, description, repo URL, video URL, screenshot URL. Verify every link in incognito. Submit before the 6 PM personal cutoff — never race the 11:59 PM IST deadline.

## 8.5 UI Design System (owner-approved via design interview — locked)

Aesthetic: **dark observatory instrument.** Not a game HUD, not a generic dashboard. The 3D canvas is the hero; chrome recedes. White is the working color; gold marks what matters.

- **Color.** App background near-black blue-gray `#0B0E14` (never pure black — the starfield must read darker than the chrome). Text: regular UI text and labels are white/off-white `#E6EAF2` with secondary `#8B95A7`. **Accent: amber/gold `#E8B84B` — reserved exclusively for emphasis**: key derived values, important words, active states, warnings that matter. Never large fills, never decorative. If everything is gold, nothing is.
- **Surfaces (hybrid, deliberate).** Docked workspaces (right inspector, bottom terminal/log dock) = **solid matte** opaque `#12151C`, crisp 1px border `#232A36`, VS Code-like. Floating elements over the canvas (transport controls, empty-state hints, on-canvas labels, fidelity corner tags) = **dark glass**: translucent `#0E1118` at ~75% with backdrop blur.
- **Typography.** IBM Plex Sans for UI; IBM Plex Mono for ALL numbers, coordinates, terminal text, and log lines; KaTeX for equations — never fake an equation in plain text. Numeric display: 3 significant figures + unit suffix, tabular numerals.
- **Fidelity badges = color-coded corner tags, INSPECTOR ONLY — never on the canvas.** The canvas stays pure geometry and light. Tags appear in two places: on each row of the Objects list (the object's overall/lowest fidelity level) and on each section of the selected object's instrument panel (gravity, visuals, derived values — each tagged individually). Colors (fixed): exact = green `#3FB68B` · approximate = orange `#E0763F` (deliberately distinct from the gold accent) · illustrative = magenta `#C05CE0` · narrative = blue `#5C8DE0`. **Clicking any tag opens a small glass popover explaining what that fidelity level means and what, specifically, is exact/approximated/visual in this element.** The popover copy is part of the product's honesty story — write it carefully.
- **Render modes (user-switchable, a first-class feature).** Three canvas visual presets, toggle in the top bar: **Restrained** (minimal bloom, short faint trails — realism first), **Cinematic** (default: clear bloom, glowing trails), **Maximal** (heavy bloom, long trails, dense starfield — spectacle). All three are pure postprocessing/particle parameter presets; **render mode NEVER affects physics or simulation state**, and the toggle's tooltip says so. Video strategy: shoot the whoa shots in Maximal, flip to Restrained on camera as the honesty beat.
- **Command access: both.** Bottom dock terminal (tabbed with the log, VS Code style, 220px, collapsible) AND a Cmd+K quick palette overlay for fast insert/actions. Both dispatch through the same command bus — the palette is a thin skin over the same grammar.
- **Layout.** Canvas full-bleed. Right inspector 340px, collapsible. Bottom dock 220px, collapsible. Transport controls floating bottom-center (glass). Scene name + save state + render-mode toggle top-left/top bar. Balanced density: 4px spacing grid, 6–8px corner radius.
- **Motion: instant.** Near-zero animation — panels appear/disappear immediately or with ≤80ms opacity only; data values update live with NO animation or ticking. This is an instrument. No bounces, no slides, no easing theatrics.
- **Empty states.** Never a blank void: empty canvas shows a dim mono hint — `try: \insert star` — center-bottom, glass style.
- **Forbidden:** default Tailwind blue, Bootstrap-looking cards, pure white surfaces, any second accent color, gold used on non-important elements, emoji in UI chrome, filled badge blocks, animated number counters.

## 9. Working Agreement for Claude Code

- Work strictly in step order; one step per session-chunk; run tests before every commit.
- Commit message = step id + summary.
- If a step reveals a design flaw in this file, stop and surface it — don't silently redesign.
- No new dependencies beyond §3 without asking.
- Never fabricate physics constants; use §5. Never relax a validation threshold to make a test pass — report the failure.
- UI text must respect §2 honesty rules verbatim.

## 10. Schedule

- Thu night: 0.1–0.8
- Fri: 1.1–1.9 (validation green by end of day)
- Sat: Phase 2 (morning) → 3 (midday) → 4 (afternoon) → 5 primary (evening)
- Sun daytime: Phase 6 submission package. Official deadline is Sun, July 12, 11:59 PM IST — treat 6 PM as the personal cutoff so video recording and uploads never race midnight.
- Hard rule: if behind by ≥ half a day, cut in this order: satellite stretch → snapshot/scrub polish → narrative length. NEVER cut Phase 6, the cinematic pass, or the validation suite — those three are the score.

## 11. Testing Matrix (per phase)

Policy (also in CLAUDE.md): every step that introduces pure logic ships vitest cases in the same commit; `pnpm test` must be green before every commit; each phase ends with the FULL suite green. No Playwright / e2e / visual-regression frameworks — rendering steps carry explicit MANUAL verification criteria on the deployed preview instead (setup cost is not worth it in a 72 h build).

**Phase 0 (automated):** schema round-trip (build → serialize → parse → deep-equal); unit conversions round-trip (km↔AU, kg↔M☉) and anchor r_s(1 M☉) ≈ 2.95 km; parser accepts all documented forms (unit suffixes, tuples, `/` and bare prefixes) and rejects malformed input with token-naming errors; command bus: insert→undo restores prior doc exactly; every catalog type inserts with valid schema; vis-viva insertion: a = 1 AU circular about 1 M☉ ⇒ |v| = 2π AU/yr.
**Phase 1 (automated):** Kepler period within 0.01%; energy/angular-momentum drift under thresholds (yoshida4 < 10⁻⁶, verlet < 10⁻⁴, |ΔL/L₀| < 10⁻⁹ over 100 orbits); determinism hash equality across two runs; 500-body bench meets real-time. Results auto-written to VALIDATION.md.
**Phase 2 (automated logic):** blackbody map anchors — 5,772 K yields R ≥ G ≥ B warm-white, 3,000 K red-dominant, 30,000 K blue-dominant; visual-radius formulas monotonic in mass; trail ring buffer wraps without allocation growth; render-mode presets never touch engine config (assert message types). *(Manual on deploy:* 60 fps Sun–Earth–Moon, selection works, no origin jitter at 100 AU.)
**Phase 3 (automated logic):** autocomplete ordering verbs → names → params; unit dropdown converts to identical canonical value; selection store converges from all three writers; **fidelity copy completeness — every catalog type × aspect has non-empty popover text** (this test is the honesty system's seatbelt). *(Manual:* popover content reads correctly, KaTeX renders.)
**Phase 4 (automated):** snapshot → run → restore ⇒ state hash-identical; export → import round trip bit-identical; import validation reports exact bad path on corrupted input; Markdown export contains every derived-value equation; autosave debounce fires once per burst. *(Manual:* reload-restore flow.)
**Phase 5 (automated):** collapse model integrity — stages ordered, remnant mass > TOV limit ⇒ type blackhole, r_s(10 M☉) ≈ 29.5 km; timeline scrub position → (stage, progress) mapping correct at boundaries; completed narrative registers a real blackhole body in the engine. *(Manual:* burst looks spectacular at 60 fps, scrub feels right.)
**Phase 6 (automated):** preset data matches the §6.1 table exactly; solar-inner Earth simulated period = 1.00 yr ± 0.01%; every `\help` verb exists in the registry (no phantom commands). *(Manual:* full demo path twice with zero console errors; every submission link opens in incognito.)
