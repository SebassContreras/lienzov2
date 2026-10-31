# Architecture & Decision Changes

This document maintains a permanent ledger of architectural pivots, deprecated decisions, and significant scope modifications. It prevents agents from reintroducing rejected patterns and provides context on why the system evolved.

---

## 🔄 Change Protocol

When an existing architectural design or requirement needs to change:

1. **Document the Rationale:** Add a new entry to the [Change Log](#-change-log) below with date, what changed, why, and what was replaced.
2. **Update the Spec:** In the affected spec (`planning/specs/NNN-name.md`):
   - Strike through the obsolete item and point to the replacement (e.g., `- ~~D1: Sessions in localStorage~~ → D2`).
   - Add explicit cleanup tasks to remove obsolete code, tests, and documentation.
3. **Update Root Context:** If the change modifies system boundaries or visual guidelines, update `PRODUCT.md`, `ARCHITECTURE.md`, or `DESIGN.md` accordingly.

---

## 📜 Change Log

Entries are chronological. Entries up to 2026-10-28 come from the previous `planning/changes.md` and keep their original format: `A<n>@<version>` names a version of a decision in [ARCHITECTURE.md](./ARCHITECTURE.md), and `NNN/TNNN` names a task of a retired spec. Newer entries use the format below.

```text
## YYYY-MM-DD — Title
- Scope: affected area
- What Changed: the shift
- Why: the reason
- Replaced Items: struck decisions or superseded specs
```

## 2026-10-07 — images live in `assets/`, versioned with the repo
Why: spec 002 added the `assets/` folder and `/api/assets` for image elements, and A7 did not say so; scenes that use images should open on any clone.
- MODIFIED A7@1 → A7@2
- Tasks: 001/T006 and 002/T003 re-pointed to A7@2 (still valid); 003/T002 re-pointed to A7@2; added 002/T010 (keep `assets/` in the repo) and 002/T011 (README and AGENTS.md describe 002 and A7@2)

## 2026-10-08 — CLI and MCP server enter the scope
Why: the maintainer wants scripts and AI agents (Claude through MCP) to build and export posts, both through the same tools.
- ADDED A20@1
- ADDED A21@1
- ADDED A22@1
- Tasks: specs 007–010 created

## 2026-10-08 — components become descriptors; timeline and 3D enter the scope
Why: the maintainer wants every post buildable from JSON alone, new features inherited instead of rebuilt, keyframe animation with loop/once control, any element as a particle, and a three.js element; CLI and MCP move to the end.
- MODIFIED A7@2 → A7@3
- ADDED A23@1
- ADDED A24@1
- ADDED A25@1
- Tasks: 001/T006, 002/T003, 002/T010, 002/T011 and 003/T002 re-pointed to A7@3 (still valid); specs 012–016 created; 007 and 011 rewritten; 007–011 re-prioritised after 016

## 2026-10-08 — more elements, more animations, animation presets
Why: the maintainer wants a wider range of elements and animations for explainer posts, and to save custom animations and reuse them on other elements.
- ADDED A26@1
- Tasks: specs 017–019 created; 007–011 and 014–016 re-prioritised

## 2026-10-08 — components live in descriptor folders
Why: spec 012 moved each component into a descriptor folder (A23).
- MODIFIED A5@1 → A5@2
- Tasks: 001/T003 and 005/T003 re-pointed to A5@2 (still valid: their drawing code moved into `<kind>/draw.ts`); 012/T017 re-pointed to A5@2

## 2026-10-10 — animation presets copy and expand on load
Why: the 019 review found that linked presets resolved at draw time would couple `animate` (A24) to the preset store and make export, tests and undo depend on the library.
- MODIFIED A26@1 → A26@2
- Tasks: 019/T001 (never started) replaced by 019/T009, which covers A26@2

## 2026-10-10 — A7 lists `/api/animations`
Why: wording fix; the endpoint was added by 019 under A26, and A7's list of endpoints left it out. Meaning unchanged.
- REWORDED A7@3

## 2026-10-10 — tool names are snake_case
Why: MCP tool names allow only `[a-zA-Z0-9_-]` (MCP specification); dotted names such as `scene.export` are rejected by some clients.
- MODIFIED A20@1 → A20@2
- Tasks: 007/T001, 008/T001, 009/T001, 011/T006 (never started) re-pointed to A20@2; 010/R1, 010/R2, 010/D3, 011/R6, 011/D5 reworded to the new names

## 2026-10-15 — testing policy: minimal tests for daily development (KISS / YAGNI)
Why: clarify testing scope to prevent test bloat; prioritize pure engine logic, timing math and schema boundaries over redundant E2E/micro-tests so daily development remains fast. Meaning unchanged.
- REWORDED A14@1


## 2026-10-22 — user fonts on disk (045)
Why: users need their own fonts per project and globally, and a way to fetch Google Fonts from the app; A12@1 allowed only bundled fonts.
- MODIFIED A12@1 → A12@2
- Tasks: 001/T004 re-pointed to A12@2 (the bundled fonts it loads still hold); 045 tasks cover the user fonts

## 2026-10-23 — Mediabunny 1.61.6+ for MP4s that play on phones
Why: MP4s exported in Firefox on Windows played on desktop but not on phones or WhatsApp. Firefox's H.264 encoder emits an avcC with each SPS/PPS header byte repeated (`67 67 64…`); the in-band parameter sets are correct, so desktop players cope while phones read the broken record. Mediabunny 1.61.6 detects and rebuilds it (mediabunny #559, Bugzilla 2082867). Two earlier fixes targeted the wrong cause and were reverted: forcing the software H.264 encoder (cb28a62) and requesting Annex B output (2a2443c, which Firefox ignores); both were checked only in Edge, which never shows the bug.
- MODIFIED A10@1 → A10@2
- Tasks: 001/T005 re-pointed to A10@2 (still valid); no cleanup tasks, the workarounds were already reverted in 8afdef6

## 2026-10-24 — no CI/CD
Why: the owner removes everything CI/CD from the project; lint, typecheck and test run locally.
- REMOVED A15@1
- Tasks: 001/T010 deletes `.github/workflows/ci.yml`; 001/T008 and 039/T009 re-pointed (still valid)

## 2026-10-27 — project workspaces in A7; shared rules (077)
Why: A7@3 still put scenes and assets at the repo root, which spec 040 moved into `projects/<project>/`; and 075 found that rules re-implemented per writer (shot timing in each tool, shot edits in the editor) were why QA rounds kept finding the same failures.
- MODIFIED A7@3 → A7@4
- ADDED A27@1
- Tasks: 077/T003 writes both; 075 tasks already built A27 (`src/model/shot-timing.ts`, `setShotIn` / `removeShotIn`)

## 2026-10-28 — testing policy: complete tests of rules, writers and tools (082)
Why: "minimal tests" was applied as one test per reported case; nine QA rounds (067–081) kept finding the same rules broken in the next writer, 34 of 43 tools have at most one failing-input test, and `traits` and `export` have none. Minimal now means no tests of implementation details, not fewer rules covered.
- MODIFIED A14@1 → A14@2
- Tasks: 082/T001 rewrites A14 and the AGENTS.md test rule; 082/T017–T023 build the matrix; 082/T024–T040 rewrite the suite

## 2026-10-28 — tools live with their functionality (082)
Why: `src/service` held 165 files, 32 of them loose, and a tool, its logic and its tests were in three places; the test rewrite of 082 groups each functionality in one folder. Meaning of A20 unchanged: one file per tool, one registry, thin adapters.
- MODIFIED A20@2 → A20@3
- Tasks: 082/T005–T015 move the files; 082/T015 rewrites the A20 path


## 2026-10-30 — engineering principles alignment across specs and contracts (085)
- Scope: `ENGINEERING.md`, `planning/specs/050-084`.
- What Changed: `ENGINEERING.md` updated to enumerate all 10 Core Engineering Principles explicitly, restoring P5 (Small Interfaces & Pure Functions), linking P6/P7 to `TESTING.md` standards, defining P8 (Stack Standards), P9 (Research & Citations), and P10 (Document Trade-offs). Historical specs 050, 065–084 updated to align Requirements, Design, and Tasks with these principles (eliminating single-use abstractions, compound tasks, anecdotal bug fixes, unparameterized test tasks, and uncited decisions).
- Why: Systematic audit against the craftsmanship and engineering principles of the repository.
- Replaced Items: Incomplete 6-principle template in `ENGINEERING.md`.

## 2026-10-29 — move to the current spectrace governance
- Scope: repository governance, `planning/`, git tooling.
- What Changed: decision records moved from `planning/product.md`, `planning/architecture.md` and `planning/changes.md` to seven root contracts (`AGENTS.md`, `PRODUCT.md`, `ARCHITECTURE.md`, `ENGINEERING.md`, `DESIGN.md`, `TESTING.md`, `CHANGES.md`) plus `.agentignore`; `planning/` keeps only the roadmap and the specs; `planning/qa-log.md` moved to `docs/qa-log.md`; the three spectrace skills are installed. The git hooks (`.githooks/`), the `Spec:` commit trailer, the `spectrace` workflow, the `core.hooksPath` setting and the automatic roadmap `Status` are removed: commits are plain Conventional Commits and `Status` is edited by hand. The `## Docs` list of the product file and the mandatory `reviewed:` line of `Review:` tasks are gone; a docs task is added when an API, command or architectural boundary changes (`Verify:` and `verified:` stay by convention).
- Why: the new spectrace governance replaces enforcement by hooks with root contracts that agents read; the old machinery added friction and one more thing to keep in sync.
- Replaced Items: A17 (the `Spec:` trailer clause dropped; Conventional Commits stays); the roadmap note about the pre-commit hook; specs 050 and 065–084 are retired (all were `done` under the old governance) and kept in `planning/specs/` as history. Paths named inside those specs map as `planning/changes.md` → `CHANGES.md`, `planning/architecture.md` → `ARCHITECTURE.md`, `planning/qa-log.md` → `docs/qa-log.md`.

## 2026-10-31 — brand guide file and asset folders (086)
- Scope: `ProjectStore`, `project_create`, `project_update`, `project_inspect`, `scene_generate_speech`, A7.
- What Changed: a project keeps its written brand guide in `projects/<project>/brand.md` (Markdown, up to 20 000 characters), taken as `guide` by `project_create` / `project_update` and returned by `project_inspect`. `project_inspect` and `project_update` share one brand font rule (`brandFontNotices`), which now also names a project font that is not declared. `scene_generate_speech` saves clips in `assets/voice/<scene>/` instead of the root of `assets/`. A7 documents the asset folder convention (`brand/`, `voice/<scene>/`, `<scene>/`).
- Why: the brand guide had nowhere to live, so it ended up in one video's brief; a project's undeclared fonts went unreported; generated clips at the root of `assets/` could not be told apart from the brand's files or from other videos'.
- Replaced Items: `project.json` as the place of the brand guide (A7 wording); `project_update`'s inline font notice code.

## 2026-10-31 — research principle gated by decision impact
- Scope: `ENGINEERING.md` §1, §9, §10, `AGENTS.md`, spectrace skills.
- What Changed: §9 now requires research only when the choice is hard to reverse, depends on an outside fact, or breaks a factual tie, and cites sources as `Source: <url> (accessed YYYY-MM-DD)`. §1 and §10 headings match the spectrace template so `spectrace-init --upgrade` recognises them. AGENTS.md principle lists name DRY, research and trade-offs; spectrace skills updated to the current suite.
- Why: Spectrace added principle 7: research is required only when the choice is hard to reverse, depends on a fact outside the repository, or breaks a factual tie. Mandatory research on every choice invites invented citations and ritual browsing; gating it keeps citations where they change the decision.
- Replaced Items: §9 "Research & Cite Sources for Non-Obvious Decisions".

## 2026-10-31 — seven engineering principles, as in the spectrace template
- Scope: `ENGINEERING.md` principles and Project Standards.
- What Changed: `ENGINEERING.md` lists the seven spectrace principles in template order: 1 KISS/YAGNI, 2 SRP, 3 DRY via composition, 4 anti-corruption layer / DIP, 5 stack standards, 6 trade-offs, 7 research. The old §6 (partitioning, contracts, invariants) and §7 (test hygiene) are dropped: `TESTING.md` already states both in full. The old §5 (small interfaces, pure functions) becomes the "Pure functions" bullet of Project Standards, tied to A3, A24 and A27. Old §8, §10 and §9 are now §5, §6 and §7 with unchanged wording.
- Why: spectrace audits cite principles by number (`ENG-1` … `ENG-7`); with ten sections numbered differently, a citation such as `ENG-7` pointed at test hygiene instead of research, and spec audits had to stop. No spec or contract cited a principle number, so nothing else needed renumbering.
- Replaced Items: the ten-principle layout recorded by 085 ("engineering principles alignment across specs and contracts").
