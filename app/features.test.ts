import { DEFAULT_FEATURES, readFeatures } from "./features";

describe("readFeatures", () => {
  it("defaults every flag to off", () => {
    expect(readFeatures({})).toEqual({
      skillsChat: false,
      heroPauseLink: false,
      heroRotationPrefetch: false,
      heroRotationNod: false,
    });
    expect(DEFAULT_FEATURES).toEqual(readFeatures({}));
  });
  it.each(["1", "true", "TRUE", "on", "yes", " 1 "])("treats %j as on", (v) => {
    expect(readFeatures({ FEATURE_SKILLS_CHAT: v }).skillsChat).toBe(true);
  });
  it.each(["", "0", "false", "off", "no", "maybe"])("treats %j as off", (v) => {
    expect(readFeatures({ FEATURE_SKILLS_CHAT: v }).skillsChat).toBe(false);
  });
});

describe("hero pause link (F5, pending Ari)", () => {
  it("is off by default; the F4 click-to-pause hint flag is gone", () => {
    expect(readFeatures({}).heroPauseLink).toBe(false);
    expect(readFeatures({ FEATURE_HERO_PAUSE_LINK: "on" }).heroPauseLink).toBe(
      true,
    );
    expect(
      Object.keys(readFeatures({ FEATURE_HERO_FREEZE_HINT: "1" })),
    ).not.toContain("heroFreezeHint");
  });
});

describe("hero rotation prefetch (pending Ari)", () => {
  it("is off by default and read from FEATURE_HERO_ROTATION_PREFETCH", () => {
    expect(DEFAULT_FEATURES.heroRotationPrefetch).toBe(false);
    expect(
      readFeatures({ FEATURE_HERO_ROTATION_PREFETCH: "1" })
        .heroRotationPrefetch,
    ).toBe(true);
  });
});

describe("hero rotation nod (review N1, pending Ari)", () => {
  it("is off by default and read from FEATURE_HERO_ROTATION_NOD", () => {
    expect(DEFAULT_FEATURES.heroRotationNod).toBe(false);
    expect(readFeatures({}).heroRotationNod).toBe(false);
    expect(
      readFeatures({ FEATURE_HERO_ROTATION_NOD: "1" }).heroRotationNod,
    ).toBe(true);
  });
});
