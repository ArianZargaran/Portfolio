import { execFileSync } from "node:child_process";
import path from "node:path";

import { formatRange, RESUME } from "./resume";

describe("resume content", () => {
  it("has Airtable starting Oct 2021 (decision 2026-10-13)", () => {
    const airtable = RESUME.experience.find((r) => r.org === "Airtable")!;
    expect(airtable.start).toBe("2021-10");
    expect(formatRange(airtable)).toBe("Oct 2021 – May 2025");
  });

  it("lists experience newest first with valid ranges", () => {
    const starts = RESUME.experience.map((r) => r.start);
    expect([...starts].sort().reverse()).toEqual(starts);
    const ended = RESUME.experience.filter((r) => r.end);
    expect(ended.every((r) => r.end! >= r.start)).toBe(true);
  });

  it("matches the dates printed in the PDF", () => {
    const pdf = path.resolve(
      __dirname,
      "../../public/arian-zargaran-resume.pdf",
    );
    const text = execFileSync("pdftotext", ["-layout", pdf, "-"], {
      encoding: "utf8",
    }).replace(/\s+-\s+/g, " – ");
    for (const r of RESUME.experience) {
      expect(text).toContain(r.org);
      expect(text).toContain(formatRange(r));
    }
  });

  it("formats present roles", () => {
    expect(formatRange({ start: "2025-09" })).toBe("Sep 2025 – Present");
  });
});
