# Lienzo

Lienzo is a free-form canvas editor for animated social media posts: drag pre-made
components (cards, text, connecting lines) onto a canvas, edit them live, and export PNG,
GIF or MP4. Presets and scenes are JSON files. Type: local web app (React + Vite).

## Doc map

- `PRODUCT.md` — what this is, who it's for, non-goals.
- `ARCHITECTURE.md` — topology, directory map, decisions (A items) and where each lives in the code.
- `ENGINEERING.md` — code standards, shared-rule policy, how to add a component or a preset.
- `DESIGN.md` — the editor's UI tokens, component states and accessibility.
- `TESTING.md` — test policy, coverage and mutation gates, QA runs of the MCP tools.
- `CHANGES.md` — ledger of changed decisions.
- `planning/roadmap.md` and `planning/specs/NNN-name.md` — specs, order and status.
- `README.md` — the editor, the MCP/CLI tools and how they behave; `docs/components.md` —
  every component kind; `docs/qa-log.md` — the QA process and its findings;
  `.agents/skills/lienzo-usage/` — how an agent builds a post with the tools.

## Commands

- `pnpm dev` — editor with the dev server; `pnpm build` — production build.
- `pnpm typecheck` — confirm correctness; check or format only the files you touched.
- `pnpm test` — full suite (run single files while working); `pnpm test:cov` — coverage floors.
- `pnpm test:mutate:rules` — mutation score of the rule modules.
- `pnpm build:cli` — rebuild `dist/cli.js`; `pnpm lienzo <tool>` — run any tool; `pnpm lienzo mcp` — MCP server.
- `pnpm replay [id…]` — replay corpus of QA findings at `HEAD`.
- Use pnpm, never npm or yarn.

## Rules for agents

- **Project boundary:** every scene, generated speech audio, image and export is saved inside
  its target project (`projects/<project>/`), never at the repository root. Every scene, asset
  and export tool requires `project`; there is no default project (`project_list` lists them).
  Never borrow or mix assets between projects.
- Never draw with wall-clock time: everything takes `t`, so exports are deterministic.
- A change of behavior updates `README.md`, `docs/components.md`, the `lienzo-usage` skill and
  the tool's description in the same task.
- Before a QA run, read `TESTING.md` (restart the MCP server first) and `docs/qa-log.md`.

<!-- spectrace -->
## Planning & Governance

The repository separates durable architecture/design decisions at the root from execution plans in `planning/`:

```text
AGENTS.md                   operational manual and commands for agents
PRODUCT.md                  product vision, target audience, and scope boundaries
ARCHITECTURE.md             system topology, layer boundaries, and directory map
ENGINEERING.md              craftsmanship rules, KISS/YAGNI, SRP, DRY, DIP, research, trade-offs
DESIGN.md                   UI/UX design tokens, component standards, or content design guidelines
TESTING.md                  testing invariants, contracts, input partitioning, and test hygiene
CHANGES.md                  historical ledger of pivots, replacements, and deprecations
planning/roadmap.md         specs in execution order, status, and backlog ideas
planning/specs/NNN-name.md  atomic specification slices
```

### Spec Format

```markdown
# 003 — login

## Goal
A user signs in and stays signed in across reloads.

## Requirements
- R1: A user signs in with email and password.

## Design
- ~~D1 (R1): Sessions live in localStorage.~~ → D2
- D2 (R1): Sessions live in an httpOnly cookie.

## Tasks
- [x] 003/T001 [agent] Login form — covers R1
- [ ] 003/T002 [agent] Session cookie middleware — covers D2
- [ ] 003/T003 [agent] Remove localStorage session code — replaces D1
- [ ] 003/T004 [human] Create mail provider account — covers R1
      blocked: waiting for billing approval

## Changes
- 2026-10-12: D1 → D2. Why: localStorage is readable by any script. Work: T003.
```

- `R`/`D` labels are immutable; a replaced item stays struck through with `→`.
- A task ends with `— covers` and the R or D items it implements (`covers R1, D2`). Cleanup tasks specify `— replaces D1`.
- `[agent]`: executed by AI agents. `[human]`: performed by humans; agents report and skip them.
- Roadmap status (`todo`, `in progress`, `done`) is maintained directly in `planning/roadmap.md`.

### Working on Tasks

1. **Find Next Task:** Open `planning/roadmap.md`. Take the active spec (`todo` or `in progress`) whose dependencies are done. Open its spec file in `planning/specs/` and find the first open `[agent]` task. Skip `[human]` tasks and inform the user if blocked.
2. **Execute & Consult Context:** Read [ARCHITECTURE.md](./ARCHITECTURE.md) for structural boundaries, [ENGINEERING.md](./ENGINEERING.md) for code principles (KISS, SRP, DRY, DIP, research only when the decision requires it, trade-offs), [DESIGN.md](./DESIGN.md) for UI/content design rules, and [TESTING.md](./TESTING.md) for verification standards. Implement only the task scope. No speculative abstractions: abstract only for 2+ concrete uses.
3. **Verify:** Run the project's tests or verification command adhering to [TESTING.md](./TESTING.md) and [ENGINEERING.md](./ENGINEERING.md) (auditable via `spectrace-review`). Never mark a task done without verifying.
4. **Mark Done & Commit:** Mark the task `[x]`. If all tasks in the spec are complete, update the roadmap status to `done`. Stage changed files and commit using Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`).
5. **Stuck:** Add an indented `blocked: <reason>` line under the task, commit the note, inform the user, and move on.
6. **Contradictions or Changes:** Propose changes directly to the user (the `spectrace-change` skill applies them to `CHANGES.md` and specs).
7. **New Ideas:** Add them to `planning/roadmap.md` under `## Ideas`.

### Small Fixes

Never create a spec just to hold a fix, and keep no separate fix list — git is the record.

- **Trivial correction** (breaks no `R`/`D`, fits in one commit — typo, stale doc, wrong message, small defect): commit it directly as `fix:` or `docs:`, with a regression test if behavior changes. Not doing it now? One bullet under `## Ideas`.
- **Bug against a requirement:** add a regression test task and a fix task to the spec that owns it. If that spec is `done`, set it back to `in progress` and note the reopening under its `## Changes`.
- **The fix needs a different `R` or `D`:** it is a change of direction — use `spectrace-change`.
<!-- /spectrace -->
