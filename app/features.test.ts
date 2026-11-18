import { DEFAULT_FEATURES, readFeatures } from "./features";

describe("readFeatures", () => {
  it("defaults every flag to off", () => {
    expect(readFeatures({})).toEqual({
      skillsChat: false,
      heroFreezeHint: false,
      heroPauseLink: false,
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

describe("hero freeze hooks (F4/F5, pending Ari)", () => {
  it("are off by default and switch on independently", () => {
    expect(readFeatures({ FEATURE_HERO_FREEZE_HINT: "1" })).toMatchObject({
      heroFreezeHint: true,
      heroPauseLink: false,
    });
    expect(readFeatures({ FEATURE_HERO_PAUSE_LINK: "on" })).toMatchObject({
      heroFreezeHint: false,
      heroPauseLink: true,
    });
  });
});
