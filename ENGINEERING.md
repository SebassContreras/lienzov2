# Engineering Principles & Code Standards

This document defines the craftsmanship, code quality standards, and software engineering principles for this repository. AI agents must apply these principles proportionally to prevent code rot, over-engineering, and architectural drift. Structure and boundaries live in [ARCHITECTURE.md](./ARCHITECTURE.md); test rules in [TESTING.md](./TESTING.md).

---

## ⚙️ Core Engineering Principles

### 1. KISS / YAGNI — No Over-Engineering
- Apply every principle with proportionality.
- Do not create premature interfaces, adapters, or abstractions for a single use case or a hypothetical future.
- Introduce an abstraction **only** when there are 2+ concrete uses, 2+ distinct vendors/implementations, or when automated testing genuinely requires a boundary seam.
- **Simple > clever:** Prefer readable, straightforward code over complex metaprogramming or speculative design patterns.

### 2. SRP / Separation of Concerns
- One file / module / class / task = one single responsibility.
- Maximize cohesion, minimize coupling. If a unit does two unrelated things, split it cleanly.
- Keep business domain logic, data persistence, and transport/presentation layers strictly separated.

### 3. DRY via Composition, Not Inheritance
- Avoid code duplication by extracting shared logic into small, injectable utilities, services, or pure helper functions.
- Avoid deep inheritance hierarchies. Default to **composition + dependency injection**.

### 4. Service Layer + Anti-Corruption / Dependency Inversion (DIP)
- Never call third-party libraries, vendor SDKs, or external APIs directly from domain business logic.
- Place an anti-corruption layer in `services/` or `adapters/` declaring your own project-scoped interface wrapper.
- Inject that interface into domain logic. Vendors must be swappable without altering domain code.

### 5. Follow the Stack's Standards
- Strictly adhere to official conventions, idiomatic patterns, and style guides of the language and framework in use (TypeScript, Vite, Vitest, Biome).
- Harmonize with the existing codebase before introducing external stylistic preferences.
- Standard casing:
  - `kebab-case`: files, directories, Markdown documents.
  - `PascalCase`: classes, types, interfaces, components.
  - `camelCase`: functions, methods, variables, properties.
  - `snake_case`: MCP tool names, JSON response error codes.
  - `UPPER_SNAKE_CASE`: true constants, configuration globals, enum keys.
- Language policy: UI text and error messages in Spanish (A16); code, docs, and commits in English.

### 6. Document Trade-offs
- Every significant technical choice has trade-offs.
- Document pros, cons, and active mitigations directly in the relevant spec (`D<n>`), code comments, or `CHANGES.md`.

### 7. Validate with Research — Only When It Changes the Decision
- Research is not a ritual. Look it up only when at least one holds:
  - the choice is hard to reverse (file format, protocol, public surface, contract shape);
  - the answer is a fact outside this repository (NLE timeline conventions, SMPTE, RFCs, Vite chunking, version behaviour, licence terms);
  - two credible options tie and the tie-break is factual, not stylistic.
- Do not research what a root contract already states, what the stack's own documentation defines, or a local, reversible change you can settle by running it.
- Source order: official specification or documentation, then maintainer issue or release notes, then vendor blog. One or two sources per question; stop when a primary source settles it.
- Cite what you used where the decision lives — `D<n>` in the spec, a code comment, or `CHANGES.md` — as `Source: <url> (accessed YYYY-MM-DD)`.
- A non-obvious claim that could have a source and has none is a review finding.

---

## 🧰 Project Standards

- **Package manager:** pnpm only, never npm or yarn (A13).
- **Language:** UI text is Spanish; code, comments, docs and commit messages are English (A16).
- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`) (A17).
- **Dependencies:** every runtime dependency must be MIT-compatible at zero cost (A18).
- **Lint, format, types:** Biome and `pnpm typecheck` (A14). Verify with `pnpm typecheck`; during a task check or format only the files or folders touched, never the whole repo with `pnpm lint` or `biome check`.
- **Pure functions:** state transformations take plain data and return plain data, with no hidden context or ambient side effects (A3, A24, A27).
- **Deterministic time:** never draw with wall-clock time; everything takes `t` (seconds within the loop) so exports are deterministic (A3, A24).
- **Docs travel with behavior:** a change of behavior updates `README.md`, `docs/components.md`, the `lienzo-usage` skill (`.agents/skills/lienzo-usage/`) and the tool's description in the same task. A rule every tool shares (arguments, failures, messages) goes once in `RULES` (`src/mcp/server.ts`, the server's `instructions`), not in every description.

### Tool parameter names

One name per meaning in every input and result (064/R13, R14): `project` (never `slug`), `scene` (a saved scene's name), `data` (a whole scene object), `recipe` (a preset object), `patch` (values merged in), `id` (an element), `at` (placement). Tool names are `snake_case` noun_verb (A20).

### Shared rules

- One rule, one place (075): a rule both the editor and the tools apply lives in `src/model/`
  as a pure function both call; never re-implement it in a tool or a component. A QA fix
  names the rule it restores and adds it to `RULES` (`src/service/contract/rules.ts`), which
  the matrix checks in every writer, so the next path that writes it is covered too.
  Where each shared rule is applied (080): keyframes in the track schema
  (`src/model/track.ts`), element defaults in `prepareScene` (`src/service/scenes/scenes.ts`),
  audio refs in `saveScene` (`withCanonicalAudio`), a group's shot in `src/engine/groups.ts`,
  compact problems in `buildCompact`, element names in errors and notices in `idPath`.
  Added by 081: unique element ids (`duplicateIds`, `checkUniqueIds` in `prepareScene`), shot
  spans and repeated shot ids (`shotProblems`), scene limits (`src/model/limits.ts`), the font
  and off-canvas notices of a write (`contentNotices` in `src/service/scenes/scene-notices.ts`, called by `saveScene`, `buildCompact` and `sceneNotices`, 082), preset name folding (`sameName`), the
  closed sets in descriptions (`src/model/options.ts`), the Spanish locale (`setSpanishLocale`).
  Notices (live run 2026-10-29): a write says only what the scene it replaces did not (`contentNotices(scene, faces, previous)`,
  `resourceNotices`), and a notice names what it is about; both hold for every notice rule in the matrix
  (`names` in `rules.ts`, `silence.test.ts`), so a new notice is a `RULES` entry, never a filter in one tool.
  Specs 071–074 patched one path at a time and the same family came back each round.

### Extending the system

- To add a component: add a descriptor folder `src/components/<kind>/` with `descriptor.ts`
  (fields built from `src/components/fields/`, composing the shared groups; sections; the
  animations it offers; label and library icon; `defineComponent`) and `draw.ts` (draws the
  element with the transform `animate` gives it), then register it in
  `src/components/index.ts` (import, `COMPONENTS`, `RegisteredElement`). Nothing else: type,
  defaults, schema, inspector and library entry follow. A control the field types don't
  cover is a `custom` field or a `widget` with a renderer in `WIDGETS`
  (`src/editor/field-editor.tsx`). Optionally, an `apply.<kind>` in traits that should style
  it and a built-in preset recipe with a `category`.
- To add a preset: a JSON recipe in `presets/built-in/` combining traits; add a trait in
  `src/traits/` only when no existing one fits.
