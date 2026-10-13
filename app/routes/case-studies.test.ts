import { readdirSync } from "node:fs";

import {
  SKILLS_CHAT_CARD_ID,
  WORK_ROWS,
  visibleWorkRows,
} from "~/constants/work-cards";
import { CASE_STUDIES, LEGACY_DIAGRAM_REDIRECTS } from "~/content/case-studies";

import { loader as workLoader } from "./work.($slug)";
import { loader } from "./work_.diagrams.$diagram";

const thrown = (fn: () => unknown): Response => {
  try {
    fn();
  } catch (e) {
    return e as Response;
  }
  throw new Error("expected a thrown Response");
};
const args = (params: Record<string, string>) =>
  ({ params, request: new Request("http://x/"), context: {} }) as never;

describe("case studies", () => {
  it("has 7 cases covering the 9 old diagram pages", () => {
    expect(CASE_STUDIES).toHaveLength(7);
    expect(Object.keys(LEGACY_DIAGRAM_REDIRECTS)).toHaveLength(9);
  });

  it("every redirect target has a route file", () => {
    const files = readdirSync(__dirname);
    const paths = Object.values(LEGACY_DIAGRAM_REDIRECTS).map(
      (to) => `${to.slice(1).replaceAll("/", ".")}.tsx`,
    );
    expect(paths.filter((f) => !files.includes(f))).toEqual([]);
  });

  it.each(Object.entries(LEGACY_DIAGRAM_REDIRECTS))(
    "301s /work/diagrams/%s to %s",
    (old, to) => {
      const res = thrown(() => loader(args({ diagram: old })));
      expect(res.status).toBe(301);
      expect(res.headers.get("Location")).toBe(to);
    },
  );

  it("404s unknown legacy diagrams", () => {
    expect(thrown(() => loader(args({ diagram: "nope" }))).status).toBe(404);
  });
});

describe("live-on-this-site card follows FEATURE_SKILLS_CHAT", () => {
  const ORIGINAL = process.env.FEATURE_SKILLS_CHAT;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.FEATURE_SKILLS_CHAT;
    else process.env.FEATURE_SKILLS_CHAT = ORIGINAL;
  });
  const ids = (rows: { id: string }[][]) => rows.flat().map((c) => c.id);

  it("is hidden from the grid and its deep link 404s when off", () => {
    delete process.env.FEATURE_SKILLS_CHAT;
    expect(ids(visibleWorkRows(false))).not.toContain(SKILLS_CHAT_CARD_ID);
    expect(ids(visibleWorkRows(false))).toHaveLength(ids(WORK_ROWS).length - 1);
    const res = thrown(() => workLoader(args({ slug: "live-on-this-site" })));
    expect(res.status).toBe(404);
    expect(workLoader(args({ slug: "motion" }))).toEqual({
      skillsChat: false,
    });
  });

  it("shows when on", () => {
    process.env.FEATURE_SKILLS_CHAT = "1";
    expect(ids(visibleWorkRows(true))).toContain(SKILLS_CHAT_CARD_ID);
    expect(workLoader(args({ slug: "live-on-this-site" }))).toEqual({
      skillsChat: true,
    });
  });
});
