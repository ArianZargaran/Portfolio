import { loader } from "./skills";

describe("/skills loader", () => {
  const ORIGINAL = process.env.FEATURE_SKILLS_CHAT;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.FEATURE_SKILLS_CHAT;
    else process.env.FEATURE_SKILLS_CHAT = ORIGINAL;
  });

  it("404s by default (flag off)", () => {
    delete process.env.FEATURE_SKILLS_CHAT;
    let thrown: unknown;
    try {
      loader();
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(404);
  });

  it("renders when FEATURE_SKILLS_CHAT=1", () => {
    process.env.FEATURE_SKILLS_CHAT = "1";
    expect(loader()).toBeNull();
  });
});
