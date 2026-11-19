import { fixtureVariant } from "./__fixtures__/actions";
import { ACTIONS, BASE_LOOP, type ActionFamily } from "./actions";
import { codecOfCurrentSrc, createBudget, VISIT_BUDGET_BYTES } from "./budget";

const KiB = 1024;

describe("per-visit byte budget (0.75 / 0.97 MB)", () => {
  it("is 750 KiB for AV1 and 970 KiB for H.264", () => {
    expect(VISIT_BUDGET_BYTES).toEqual({ av1: 750 * KiB, h264: 970 * KiB });
  });

  it("the worst-case visit (typing + the largest variant of every installed action) fits both codecs", () => {
    const largest = (family: ActionFamily, codec: "av1" | "h264") =>
      Object.values(ACTIONS)
        .filter((a) => a.family === family)
        .reduce((best, a) => {
          const size = (x: typeof a) =>
            x.clip.sources.find((s) => s.codec === codec)!.bytes;
          return size(a) > size(best) ? a : best;
        });
    const spent = { av1: 0, h264: 0 };
    for (const codec of ["av1", "h264"] as const) {
      const b = createBudget();
      b.setCodec(codec);
      expect(b.charge(BASE_LOOP.clip)).toBe(true);
      for (const f of ["nod"] as const)
        expect(b.charge(largest(f, codec).clip)).toBe(true);
      expect(b.spent).toBeLessThanOrEqual(VISIT_BUDGET_BYTES[codec]);
      spent[codec] = b.spent;
    }
    // 448.0 kB AV1 / 590.1 kB H.264 (check:media's worst case): typing + nod.k180.
    expect(spent).toEqual({ av1: 448_003, h264: 590_103 });
    // Only the nod family is installed (S1a/S1b/T2 wait for their locks).
    expect(new Set(Object.values(ACTIONS).map((a) => a.family))).toEqual(
      new Set(["nod"]),
    );
  });

  it("charges a clip once, and refuses one that would exceed the budget", () => {
    const b = createBudget({ av1: 400 * KiB, h264: 400 * KiB });
    b.setCodec("av1");
    expect(b.charge(BASE_LOOP.clip)).toBe(true); // 324.2 KiB
    expect(b.cost(BASE_LOOP.clip)).toBe(0);
    expect(b.charge(BASE_LOOP.clip)).toBe(true);
    const clip = fixtureVariant(0, "fx", { av1: 83_407, h264: 104_348 }).clip;
    expect(b.canFetch(clip)).toBe(false); // +81.5 > 400
    expect(b.charge(clip)).toBe(false);
    expect(Math.round(b.spent / KiB)).toBe(324);
  });

  it("charges H.264 sizes until the browser's codec is known", () => {
    const b = createBudget();
    expect(b.codec).toBe("h264");
    expect(b.cost(BASE_LOOP.clip)).toBe(442_525);
  });

  it("reads the codec from the element's currentSrc", () => {
    const [av1, h264] = BASE_LOOP.clip.sources;
    expect(codecOfCurrentSrc(BASE_LOOP.clip, `http://x${av1.src}`)).toBe("av1");
    expect(codecOfCurrentSrc(BASE_LOOP.clip, `http://x${h264.src}`)).toBe(
      "h264",
    );
  });
});
