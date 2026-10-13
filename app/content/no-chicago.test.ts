/**
 * Ari is based in Dallas, TX. No user-facing copy may place him in Chicago:
 * page content, meta/OG/structured data, public text assets, the resume PDF.
 * Technical time-zone code (America/Chicago defaults, app/server, docs) is
 * not user-facing and is deliberately out of scope.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const USER_FACING_DIRS = [
  "app/content",
  "app/constants",
  "app/components",
  "app/routes",
  "app/utils",
  "public",
];
const USER_FACING_FILES = ["app/root.tsx"];
const TEXT_EXT = /\.(tsx?|jsx?|json|xml|txt|md|html|webmanifest)$/;
// "Chicago" that is not part of the IANA zone id "America/Chicago".
const CHICAGO = /(?<!America\/)\bChicago\b/i;

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    if (/\.test\.tsx?$/.test(name) || /\.server\.tsx?$/.test(name)) return [];
    return TEXT_EXT.test(name) ? [full] : [];
  });

describe("no user-facing copy says Chicago", () => {
  it("in site source, meta and public text assets", () => {
    const files = [
      ...USER_FACING_DIRS.flatMap((d) => walk(path.join(ROOT, d))),
      ...USER_FACING_FILES.map((f) => path.join(ROOT, f)),
    ];
    const hits = files.flatMap((f) =>
      readFileSync(f, "utf8")
        .split("\n")
        .map((line, i) => ({ f: path.relative(ROOT, f), i: i + 1, line }))
        .filter(({ line }) => CHICAGO.test(line))
        .map(({ f, i }) => `${f}:${i}`),
    );
    expect(hits).toEqual([]);
  });

  it("in the resume PDF text and metadata", () => {
    const pdf = path.join(ROOT, "public/arian-zargaran-resume.pdf");
    const text = execFileSync("pdftotext", [pdf, "-"], { encoding: "utf8" });
    const info = execFileSync("pdfinfo", [pdf], { encoding: "utf8" });
    expect(text).not.toMatch(CHICAGO);
    expect(info).not.toMatch(CHICAGO);
    expect(text).toMatch(/Dallas/);
  });
});
