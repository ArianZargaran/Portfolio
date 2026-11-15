import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { ACTIONS, BASE_LOOP } from "./actions";
import { HERO_RECT } from "./media";

const PUBLIC = path.resolve(__dirname, "../../../public");
const manifest = JSON.parse(
  readFileSync(
    path.join(
      PUBLIC,
      "scene/home-office.desk.coding.dusk.clear/hero/hero-media.json",
    ),
    "utf8",
  ),
) as {
  rect_xywh: number[];
  clips: Record<
    string,
    { first_frame: number; frames: number; fps: number; bytes: number }
  >;
};

describe("shipped hero clips match the registry", () => {
  const clips = [BASE_LOOP.clip, ...Object.values(ACTIONS).map((a) => a.clip)];

  it.each(clips.flatMap((c) => c.sources.map((s) => ({ c, s }))))(
    "$s.src",
    ({ c, s }) => {
      expect(existsSync(path.join(PUBLIC, s.src))).toBe(true);
      const m = manifest.clips[path.basename(s.src)];
      expect(m.first_frame).toBe(c.firstFrame);
      expect(m.frames).toBe(c.frames);
      expect(m.fps).toBe(BASE_LOOP.fps);
    },
  );

  it("uses the same crop rect as the player", () => {
    expect(manifest.rect_xywh).toEqual([
      HERO_RECT.x,
      HERO_RECT.y,
      HERO_RECT.w,
      HERO_RECT.h,
    ]);
  });

  it("stays small enough to commit (< 2 MB for every clip together)", () => {
    const total = Object.values(manifest.clips).reduce(
      (a, c) => a + c.bytes,
      0,
    );
    expect(total).toBeLessThan(2 * 1024 * 1024);
  });
});
