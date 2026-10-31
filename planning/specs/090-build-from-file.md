# 090 — build-from-file

## Goal
`scene_build` and `scene_validate` read a compact scene from a JSON file on disk, so a generator's
output is built through MCP without pasting it into the call. Verification: `scene_build` with
`compactFile` set to Animator's `videos/ringana-skin-perfection/scene.json` saves the same scene
as passing its contents in `compact`; `pnpm test` and `pnpm typecheck` pass.

## Context (Animator video `ringana-skin-perfection`, 2026-10-31)
- Animator's generators write `scene.json` (36 KB for a 20 s, six-shot reel). Passing it inline
  in the MCP call is impractical, so the build went through the CLI
  (`pnpm lienzo scene_build --json @file`), which the MCP route does not offer.
- `asset_add` already takes a local file path and copies it into the project, so the server
  already reads caller-named files.

## Principles applied
| Principle | How it shows here |
|---|---|
| 1 KISS / YAGNI | One optional input, read once, then the existing build path. |
| 2 SRP | Reading the file is input resolution; building is unchanged. |
| 4 Service layer / DIP | The file is read through the same file access `asset_add` uses. |

## Requirements
- R1: `scene_build` and `scene_validate` accept `compactFile`, an absolute path to a JSON file
  holding a compact scene; exactly one of `compact` and `compactFile` is given.
  Partitions: `compact` only (unchanged); `compactFile` only; both (error naming both); neither
  (error); a missing file; a file that is not JSON; a JSON file whose root is not an object; a
  relative path (error asking for an absolute one); a file over the content cap (error).
  Invariant: for the same content, `compactFile` and `compact` give byte-identical saved scenes,
  `errors` and `notices`.
- R2: Errors name the path and the problem in Spanish, with a `snake_case` code, like the other
  input errors.
- R3: Tool descriptions, README and `lienzo-usage` mention `compactFile`.

### Who it serves
Generator-driven workflows (Animator's `lienzo-animate` step 3).

### Out of scope
- Watching the file for changes.

### Dependencies
- None.

### Owner split
Agent tasks.

## Design
- D1 (R1): resolve `compactFile` to `compact` at the top of both tools, before any other check, so
  the rest of the pipeline is unchanged. Size cap = the existing content cap of `scene_build`
  (assumed; T001 finds it).
- D2 (R1): which paths are readable follows `asset_add`'s rule (T001 records it).

### Trade-offs
- D1. Pros: no new build path. Cons: the server reads a file named by the caller. Mitigation: the
  same rule as `asset_add`, JSON only, size-capped, and the file is never written.

## Tasks
- [ ] 090/T001 [agent] Verify: `asset_add`'s path rule and the content cap of `scene_build`; record `verified:` — covers D1, D2
- [ ] 090/T002 [agent] Tests on the R1 partitions and the identity invariant — covers R1, R2
- [ ] 090/T003 [agent] `compactFile` in both tools (D1) — covers R1, R2, D1
- [ ] 090/T004 [agent] Docs (R3) — covers R3
