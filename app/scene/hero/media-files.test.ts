import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { ACTIONS, BASE_LOOP } from "./actions";
import { HERO_RECT } from "./media";

const MEDIA_DIR = path.resolve(__dirname, "media");
const ROOT = path.resolve(__dirname, "../../..");
const manifest = JSON.parse(
  readFileSync(path.join(ROOT, "scripts/hero/hero-media.build.json"), "utf8"),
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
      // Under Vitest the import resolves to the source path (the build hashes it).
      const name = path.basename(s.src);
      expect(existsSync(path.join(MEDIA_DIR, name))).toBe(true);
      const m = manifest.clips[name];
      expect(m.first_frame).toBe(c.firstFrame);
      expect(m.frames).toBe(c.frames);
      expect(m.fps).toBe(BASE_LOOP.fps);
      expect(s.bytes).toBe(m.bytes); // the budget's size table
      expect(name).toContain(s.codec === "av1" ? ".av1." : ".h264.");
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

  it("keeps clips and build metadata out of public/ (nothing internal is served)", () => {
    const pub = path.join(
      ROOT,
      "public/scene/home-office.desk.coding.dusk.clear/hero",
    );
    expect(existsSync(pub)).toBe(false);
  });
});
