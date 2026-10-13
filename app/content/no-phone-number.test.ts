/**
 * Decision (Arian, 2026-10-13): public contact is hello@ari.soy only. No phone
 * number anywhere: site source, meta/structured data, public text assets and
 * the resume PDF. This test fails the build if one sneaks back in.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");

// Phone-shaped strings: +1 (408) 809-6343, 408-809-6343, 408.809.6343,
// +34 600 123 456, and any tel: link.
const PHONE_PATTERNS: RegExp[] = [
  /tel:\s*[+\d(]/i,
  /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/,
  /\+\d{1,3}[\s.-]?\(?\d{2,4}\)?([\s.-]\d{2,4}){2,3}\b/,
  /809-?6343/,
];

const TEXT_EXT = /\.(tsx?|jsx?|css|json|xml|txt|md|html|webmanifest)$/;
// SVG path data is all numbers; it never contains the separators above in a
// phone shape, but skip generated build output and dependencies.
const SKIP_DIRS = new Set(["node_modules", "build", ".react-router", ".git"]);
const SELF = path.relative(ROOT, __filename);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (SKIP_DIRS.has(name)) return [];
    if (statSync(full).isDirectory()) return walk(full);
    return TEXT_EXT.test(name) ? [full] : [];
  });
}

function findPhones(text: string): string[] {
  return PHONE_PATTERNS.flatMap((re) => {
    const m = text.match(re);
    return m ? [m[0]] : [];
  });
}

describe("no phone number anywhere", () => {
  it("detects the shapes we care about (self-check)", () => {
    expect(findPhones("+1 (408) 809-6343")).not.toHaveLength(0);
    expect(findPhones("call 408.809.6343")).not.toHaveLength(0);
    expect(findPhones('href="tel:+1234567"')).not.toHaveLength(0);
    expect(findPhones("+34 600 123 456")).not.toHaveLength(0);
    expect(findPhones("hello@ari.soy, 2026, 5x faster")).toHaveLength(0);
  });

  const files = [
    ...walk(path.join(ROOT, "app")),
    ...walk(path.join(ROOT, "public")),
  ].filter((f) => path.relative(ROOT, f) !== SELF);

  it.each(files.map((f) => [path.relative(ROOT, f)]))(
    "%s has no phone number",
    (rel) => {
      const text = readFileSync(path.join(ROOT, rel), "utf8");
      expect(findPhones(text)).toEqual([]);
    },
  );

  it("the resume PDF has no phone number", () => {
    const pdf = path.join(ROOT, "public/arian-zargaran-resume.pdf");
    let text: string;
    try {
      text = execFileSync("pdftotext", ["-layout", pdf, "-"], {
        encoding: "utf8",
      });
    } catch {
      throw new Error(
        "pdftotext (poppler-utils) is required for this check; install it locally and in CI",
      );
    }
    expect(text.length).toBeGreaterThan(100);
    expect(findPhones(text)).toEqual([]);
  });
});
