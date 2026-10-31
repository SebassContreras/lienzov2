/**
 * The editor's controls and the tools write the same scene JSON (062/R5): each case applies
 * the edit the editor makes to a saved scene and compares it with what the tool saved.
 */
import { cp, mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { groupElements, ungroupElement } from "../../engine/groups.ts";
import { writeAt } from "../../engine/tracks.ts";
import type { Element, Scene } from "../../model/model.ts";
import {
  removeShotIn,
  setShot,
  setShotIn,
  toggleCameraKey,
} from "../../model/shots.ts";
import { trackEntry, trackKeys } from "../../model/track.ts";
import { recipeFromElement } from "../../presets/diff.ts";
import { resolveOrigin } from "../compact/layout.ts";
import { type Ctx, createCtx } from "../core/ctx.ts";
import { fakeRenderer } from "../render/fake-renderer.ts";
import { registry } from "../tools/index.ts";

const project = "parity";
let ctx: Ctx;
let root: string;

async function ok(tool: string, input: Record<string, unknown>) {
  const result = await registry.call(tool, { project, ...input }, ctx);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value as Record<string, unknown>;
}

const saved = async () =>
  (await ok("scene_get", { scene: "s", full: true })) as unknown as Scene;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "lienzo-parity-"));
  await cp("presets/built-in", join(root, "presets", "built-in"), {
    recursive: true,
  });
  await mkdir(join(root, "presets", "animations"), { recursive: true });
  ctx = createCtx(root, fakeRenderer());
  await registry.call(
    "project_create",
    { project: project, name: "Parity" },
    ctx,
  );
  await ok("scene_create", { scene: "s" });
});

describe("editor and tools write the same JSON", () => {
  it("a shot edited in the editor matches shot_set", async () => {
    await ok("shot_set", { scene: "s", id: "a", start: 0, end: 2 });
    const before = await saved();
    const patch = { id: "a", end: 3, camera: { zoom: 1.5 } };

    const fromEditor = setShotIn(before, patch);
    await ok("shot_set", { scene: "s", ...patch });

    expect(fromEditor).toMatchObject({ scene: await saved() });
  });

  it("a shot moved in the editor moves its elements' tracks as shot_set does", async () => {
    await ok("shot_set", { scene: "s", id: "a", start: 0, end: 2 });
    await ok("element_add", {
      scene: "s",
      kind: "rect",
      patch: { id: "r", shot: "a" },
    });
    await ok("keyframe_set", {
      scene: "s",
      id: "r",
      path: "x",
      t: 1,
      value: 50,
    });
    const before = await saved();

    const fromEditor = setShotIn(before, { id: "a", start: 1, end: 3 });
    await ok("shot_set", { scene: "s", id: "a", start: 1, end: 3 });

    expect(fromEditor).toMatchObject({ scene: await saved() });
  });

  it("a shot removed in the editor unbinds its elements as shot_set does", async () => {
    await ok("shot_set", { scene: "s", id: "a", start: 1, end: 3 });
    await ok("element_add", {
      scene: "s",
      kind: "rect",
      patch: { id: "r", shot: "a" },
    });
    const before = await saved();

    const fromEditor = removeShotIn(before, "a");
    await ok("shot_set", { scene: "s", id: "a", remove: true });

    expect(fromEditor).toMatchObject({ scene: await saved(), unbound: ["r"] });
  });

  it("a camera keyframe set in the Tomas section matches shot_set", async () => {
    await ok("shot_set", {
      scene: "s",
      id: "a",
      start: 0,
      end: 2,
      camera: { zoom: 2 },
    });
    const shot = (await saved()).shots?.[0] as NonNullable<
      Scene["shots"]
    >[number];
    const camera = { tracks: toggleCameraKey(shot, "zoom", 1) };

    const fromEditor = setShot([shot], { id: "a", camera });
    await ok("shot_set", { scene: "s", id: "a", camera });

    expect(fromEditor).toEqual({ shots: (await saved()).shots });
  });

  it.each([
    { channel: "@rotate", t: 0.5, value: 0.5 },
    { channel: "@scale", t: 0.5, value: 0.5 },
    { channel: "@scaleX", t: 0.5, value: 0.5 },
    { channel: "@scaleX", t: 1, value: -1 },
    { channel: "@scaleY", t: 0, value: 5 },
  ])(
    "a $channel keyframe set in the Transformación section matches keyframe_set ($value at $t s)",
    async ({ channel, t, value }) => {
      const { id } = await ok("element_add", { scene: "s", kind: "rect" });
      const el = structuredClone((await saved()).elements[0] as Element);

      writeAt(el, channel, value, t, () => {});
      await ok("keyframe_set", { scene: "s", id, path: channel, t, value });

      expect((await saved()).elements[0]?.tracks).toEqual(el.tracks);
    },
  );

  it("a track loop set in the timeline matches keyframe_set", async () => {
    const { id } = await ok("element_add", { scene: "s", kind: "rect" });
    await ok("keyframe_set", { scene: "s", id, path: "x", t: 0, value: 0 });
    await ok("keyframe_set", { scene: "s", id, path: "x", t: 1, value: 50 });
    const keys = [...trackKeys((await saved()).elements[0]?.tracks?.x)];

    const fromEditor = trackEntry(keys, "loop", 3);
    await ok("keyframe_set", {
      scene: "s",
      id,
      path: "x",
      repeat: "loop",
      until: 3,
    });

    expect((await saved()).elements[0]?.tracks?.x).toEqual(fromEditor);
  });

  it("an origin picked on the anchor grid matches element_update", async () => {
    const { id } = await ok("element_add", { scene: "s", kind: "rect" });

    const fromEditor = resolveOrigin("bottom");
    await ok("element_update", {
      scene: "s",
      id,
      patch: { origin: fromEditor },
    });

    expect((await saved()).elements[0]?.origin).toEqual({ x: 0.5, y: 1 });
  });

  it("a scene setting changed in the editor matches scene_update", async () => {
    const before = await saved();

    const fromEditor = { ...before, duration: 7, fps: 24 };
    await ok("scene_update", { scene: "s", patch: { duration: 7, fps: 24 } });

    expect(await saved()).toEqual(fromEditor);
  });

  it("a Ctrl+G group matches element_group, and Ctrl+Shift+G matches element_ungroup", async () => {
    const a = await ok("element_add", { scene: "s", kind: "rect" });
    const b = await ok("element_add", { scene: "s", kind: "ellipse" });
    const before = await saved();
    const ids = [String(a.id), String(b.id)];

    const fromEditor = groupElements(before, ids).scene;
    const { id } = await ok("element_group", { scene: "s", ids });
    const grouped = await saved();
    const flatFromEditor = ungroupElement(grouped, String(id)).scene;
    await ok("element_ungroup", { scene: "s", id });

    expect([withGroupId(grouped, "g"), await saved()]).toEqual([
      withGroupId(fromEditor, "g"),
      flatFromEditor,
    ]);
  });

  it("a preset saved from the editor matches preset_save", async () => {
    const { id } = await ok("element_add", { scene: "s", kind: "rect" });
    const el = (await saved()).elements.find((e) => e.id === id) as Element;

    const fromEditor = recipeFromElement("Caja", { ...el, name: "Caja" });
    await ok("preset_save", { recipe: fromEditor });

    const file = join(root, "projects", project, "presets", "caja.json");
    expect(JSON.parse(await readFile(file, "utf8"))).toEqual(fromEditor);
  });
});

/** The group's generated id replaced, so two groupings compare by content. */
const withGroupId = (scene: Scene, id: string): Scene => ({
  ...scene,
  elements: scene.elements.map((el) =>
    el.kind === "group" ? { ...el, id } : el,
  ),
});
