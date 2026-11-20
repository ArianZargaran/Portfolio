import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { ACTIONS, BASE_LOOP, LOCK_RECORDS } from "./actions";
import { HERO_JOIN, V5_2_LOCK_RECORD, V5_2_LOCK_SHA256 } from "./join-config";
import { HERO_RECT } from "./media";

const MEDIA_DIR = path.resolve(__dirname, "media");
const ROOT = path.resolve(__dirname, "../../..");
const manifest = JSON.parse(
  readFileSync(path.join(ROOT, "scripts/hero/hero-media.build.json"), "utf8"),
) as {
  rect_xywh: number[];
  locks: Record<string, { record: string; sha256: string }>;
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

  it("stays small enough to commit (< 4 MB for every clip together)", () => {
    // Design A ships one baked clip per entry; the locked install has 8
    // clips x 2 codecs (about 2.29 MB in git). A visit fetches far less (the base plus at most one
    // variant per action, budget.ts / check:media).
    const total = Object.values(manifest.clips).reduce(
      (a, c) => a + c.bytes,
      0,
    );
    expect(total).toBeLessThan(4 * 1024 * 1024);
  });

  it("ships no orphans: media/ = the registry = the build manifest", () => {
    const registry = [
      BASE_LOOP.clip,
      ...Object.values(ACTIONS).map((a) => a.clip),
    ]
      .flatMap((c) => c.sources.map((s) => path.basename(s.src)))
      .sort();
    const files = readdirSync(MEDIA_DIR)
      .filter((f) => f.endsWith(".mp4"))
      .sort();
    expect(files).toEqual(registry);
    expect(Object.keys(manifest.clips).sort()).toEqual(registry);
  });

  it("keeps clips and build metadata out of public/ (nothing internal is served)", () => {
    const pub = path.join(
      ROOT,
      "public/scene/home-office.desk.coding.dusk.clear/hero",
    );
    expect(existsSync(pub)).toBe(false);
  });
});

describe("lock ids and shas have one source (LOCK_RECORDS)", () => {
  it("join-config derives the v5_2 record and sha from LOCK_RECORDS.typing", () => {
    expect(V5_2_LOCK_RECORD).toBe(LOCK_RECORDS.typing.record);
    expect(V5_2_LOCK_SHA256).toBe(LOCK_RECORDS.typing.sha256);
    expect(HERO_JOIN.loop).toBe(LOCK_RECORDS.typing.record);
  });

  it("every installed action cites its LOCK_RECORDS entry", () => {
    const byFamily = {
      nod: LOCK_RECORDS.nod,
      s1a: LOCK_RECORDS.s1a,
      t6: LOCK_RECORDS.t6,
    } as const;
    for (const a of Object.values(ACTIONS)) {
      const l = byFamily[a.family];
      expect(a.lock).toBe(`${l.record} (sha256 ${l.sha256})`);
    }
  });

  it("the S1a lock is the one Ari approved (t1014s5523, locks_now29)", () => {
    expect(LOCK_RECORDS.s1a).toEqual({
      record: "LOCK_PAINTED_CHAR_ACTION_S1A_GLANCE_UP_V2",
      sha256:
        "6de9b1acea9264c7f62a4c5d46f72c00bd2af177b9b646b0a9a151b185538027",
    });
  });

  it("the T6 lock is the one Ari approved (t1029s5606, locks_now30)", () => {
    expect(LOCK_RECORDS.t6).toEqual({
      record: "LOCK_PAINTED_CHAR_ACTION_T6_SPEAKER_GROOVE_V3",
      sha256:
        "129bda2dd2c58afb35151b6a04dba9ac96ed56ed6d280afc0456dbf1673fa709",
    });
  });

  it("hero-media.build.json's locks block agrees with LOCK_RECORDS", () => {
    expect(manifest.locks.t6).toMatchObject(LOCK_RECORDS.t6);
    expect(manifest.locks.typing).toMatchObject(LOCK_RECORDS.typing);
    expect(manifest.locks.nod_v4).toMatchObject(LOCK_RECORDS.nod);
    expect(manifest.locks.s1a).toMatchObject(LOCK_RECORDS.s1a);
  });

  it("every S1a clip file is the one baked for its entry (s1a.k<entry>.*)", () => {
    for (const a of Object.values(ACTIONS).filter((x) => x.family === "s1a")) {
      expect(a.id).toBe(`s1a.k${a.entry}`);
      for (const s of a.clip.sources)
        expect(path.basename(s.src).startsWith(`s1a.k${a.entry}.`)).toBe(true);
      const m = manifest.clips as Record<string, { join?: number }>;
      expect(m[`s1a.k${a.entry}.av1.mp4`].join).toBe(a.entry);
      expect(m[`s1a.k${a.entry}.h264.mp4`].join).toBe(a.entry);
    }
  });

  it("ships no S1b or T2 media (not locked)", () => {
    const files = readdirSync(MEDIA_DIR);
    expect(files.filter((f) => /^(s1b|t2|bounce)\./.test(f))).toEqual([]);
    expect(
      Object.keys(manifest.clips).filter((f) => /^(s1b|t2|bounce)\./.test(f)),
    ).toEqual([]);
  });
});
