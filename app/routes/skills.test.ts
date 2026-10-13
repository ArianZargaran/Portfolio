import { loader, pausedSkillsResponse, RESUME_ROUTE_EXISTS } from "./skills";

const thrownBy = (fn: () => unknown): Response => {
  try {
    fn();
  } catch (e) {
    return e as Response;
  }
  throw new Error("expected the loader to throw a Response");
};

describe("/skills loader", () => {
  const ORIGINAL = process.env.FEATURE_SKILLS_CHAT;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.FEATURE_SKILLS_CHAT;
    else process.env.FEATURE_SKILLS_CHAT = ORIGINAL;
  });

  // When app/routes/resume.tsx lands this test fails on purpose: switch it to
  // expect the 302 (and update the Cypress smoke test).
  it("/resume is not built yet, so the paused route is a 404 today", () => {
    expect(RESUME_ROUTE_EXISTS).toBe(false);
    delete process.env.FEATURE_SKILLS_CHAT;
    expect(thrownBy(() => loader()).status).toBe(404);
  });

  it("renders when FEATURE_SKILLS_CHAT=1", () => {
    process.env.FEATURE_SKILLS_CHAT = "1";
    expect(loader()).toBeNull();
  });
});

describe("pausedSkillsResponse", () => {
  it("is a temporary 302 to /resume once /resume exists", () => {
    const res = pausedSkillsResponse(true);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/resume");
  });

  it("is a 404 while /resume does not exist", () => {
    expect(pausedSkillsResponse(false).status).toBe(404);
  });
});
