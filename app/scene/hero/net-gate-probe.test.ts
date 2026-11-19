import { readFileSync } from "node:fs";
import path from "node:path";

import { fresh, type TimingEntry } from "./net-gate";

/* The Safari probe (scripts/hero/safari-probe/probe.html, plain JS) carries a
   copy of the gate's cache-hit rule so Ari's device run reports what the
   gate would decide. This keeps the copy in sync with net-gate.ts. */
const html = readFileSync(
  path.resolve(__dirname, "../../../scripts/hero/safari-probe/probe.html"),
  "utf8",
);
const src = /\/\/ BEGIN gateFresh[^\n]*\n([\s\S]*?)\/\/ END gateFresh/.exec(
  html,
)?.[1];
// eslint-disable-next-line @typescript-eslint/no-implied-eval -- test-only: evaluates the probe's own snippet
const gateFresh = new Function(`${src ?? ""}; return gateFresh;`)() as (
  e: Partial<TimingEntry> | undefined,
) => boolean;

const base = { name: "x", entryType: "resource", startTime: 0, responseEnd: 1 };
const shapes: [string, Partial<TimingEntry>][] = [
  ["genuine download", { transferSize: 120_000, encodedBodySize: 119_700 }],
  ["Chromium cached", { transferSize: 300, encodedBodySize: 0 }],
  ["304 headers only", { transferSize: 300, encodedBodySize: 119_700 }],
  ["cache hit", { transferSize: 0, encodedBodySize: 119_700 }],
  ["TAO-less", { transferSize: 0, encodedBodySize: 0 }],
  ["no sizes", {}],
  ["no encodedBodySize", { transferSize: 120_000 }],
  ["no transferSize", { encodedBodySize: 119_700 }],
];

describe("Safari probe gateFresh matches net-gate fresh()", () => {
  it("has the snippet", () => expect(src).toContain("function gateFresh"));
  it.each(shapes)("%s", (_, sizes) => {
    const e = { ...base, ...sizes } as TimingEntry;
    expect(gateFresh(e)).toBe(fresh(e));
  });
  it("treats a missing entry as a cache hit", () =>
    expect(gateFresh(undefined)).toBe(false));
});
