import { BASE_LOOP } from "./actions";
import {
  HERO_JOIN,
  HERO_JOIN_VERSION,
  JOIN_CONFIGS,
  JOIN_V5_1,
  JOIN_V5_2,
  joinPointsEvery,
  nextJoinAbs,
  V5_2_LOCK_RECORD,
  V5_2_LOCK_SHA256,
  validateJoinConfig,
  type JoinConfig,
} from "./join-config";

describe("join points (3 s home pose, 18 s loop)", () => {
  it("are every 36 frames on the 216-frame loop: f0/36/72/108/144/180", () => {
    expect(JOIN_V5_1.points).toEqual([0, 36, 72, 108, 144, 180]);
    expect(JOIN_V5_1.step / JOIN_V5_1.fps).toBe(3);
    expect(BASE_LOOP.frames / BASE_LOOP.fps).toBe(18);
  });

  it("the active config fits the shipped base loop", () => {
    expect(validateJoinConfig(HERO_JOIN)).toEqual([]);
    expect(HERO_JOIN.homePoseClean).toBe(true); // B1: v5_2
  });

  it("B1 hook: a different loop config is validated, not hard-coded", () => {
    const v5_2: JoinConfig = {
      ...JOIN_V5_1,
      loop: "V5_2",
      homePoseClean: true,
    };
    expect(validateJoinConfig(v5_2)).toEqual([]);
    expect(validateJoinConfig({ ...JOIN_V5_1, loopFrames: 288 })).toContain(
      "loopFrames 288 != base 216",
    );
    expect(validateJoinConfig({ ...JOIN_V5_1, step: 50 })).toContain(
      "step 50 does not divide the loop",
    );
    expect(joinPointsEvery(36, 288)).toHaveLength(8);
  });

  it("v5_2: locked, joins every 36 frames, character home pose clean", () => {
    expect(JOIN_V5_2.points).toEqual([0, 36, 72, 108, 144, 180]);
    expect(JOIN_V5_2.step).toBe(36);
    expect(JOIN_V5_2.homePoseClean).toBe(true);
    expect(JOIN_V5_2.provisional).toBeUndefined();
    expect(JOIN_V5_2.loop).toBe(V5_2_LOCK_RECORD);
    expect(V5_2_LOCK_SHA256).toBe(
      "14563ba506716c358c08cec7e81799844084833088ac7e0fd1c2a5f085b5b712",
    );
    expect(validateJoinConfig(JOIN_V5_2)).toEqual([]);
    expect(JOIN_CONFIGS).toEqual({ v5_1: JOIN_V5_1, v5_2: JOIN_V5_2 });
  });

  it("this build installs the locked v5_2 loop", () => {
    expect(HERO_JOIN_VERSION).toBe("v5_2");
    expect(HERO_JOIN).toBe(JOIN_V5_2);
  });

  it("the active config is never provisional and names the verified lock", () => {
    expect(HERO_JOIN.provisional).toBeUndefined();
    expect(HERO_JOIN.loop).toBe("LOCK_PAINTED_CHAR_TYPING_LOOP_V5_2");
  });

  it("rejects points off the step grid", () => {
    expect(
      validateJoinConfig({ ...JOIN_V5_2, points: [0, 36, 70, 108, 144, 180] }),
    ).toContain("points not on the 36-frame grid");
  });

  it("nextJoinAbs finds the earliest allowed join, wrapping to the next cycle", () => {
    expect(nextJoinAbs(0, [72], 216)).toBe(72);
    expect(nextJoinAbs(73, [72], 216)).toBe(216 + 72);
    expect(nextJoinAbs(200, [0, 180], 216)).toBe(216);
    expect(nextJoinAbs(5 * 216 + 1, JOIN_V5_1.points, 216)).toBe(5 * 216 + 36);
    expect(nextJoinAbs(10, [], 216)).toBeUndefined();
  });
});
