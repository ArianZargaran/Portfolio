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
      for (const f of ["nod", "s1a", "t6"] as const)
        expect(b.charge(largest(f, codec).clip)).toBe(true);
      expect(b.spent).toBeLessThanOrEqual(VISIT_BUDGET_BYTES[codec]);
      spent[codec] = b.spent;
    }
    // 632.2 kB AV1 / 836.1 kB H.264 (check:media's worst case): typing +
    // nod.k180 + the largest S1a variant (s1a.k180 AV1 90,507 B, s1a.k36
    // H.264 119,543 B) + the largest T6 variant (t6.k72 AV1 93,644 B,
    // t6.k36 H.264 126,461 B).
    expect(spent).toEqual({ av1: 632_154, h264: 836_107 });
    // nod, S1a and T6 are installed (S1b/T2 wait for their locks).
    expect(new Set(Object.values(ACTIONS).map((a) => a.family))).toEqual(
      new Set(["nod", "s1a", "t6"]),
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
  it("repeated glances (review N1): base + the egg nod reserved + at most 3 S1a variants, the nod still fits after, in both codecs", () => {
    const s1a = Object.values(ACTIONS)
      .filter((a) => a.family === "s1a")
      .sort((a, b) => a.entry - b.entry);
    const nod = ACTIONS["nod.k180"]!.clip;
    for (const codec of ["av1", "h264"] as const) {
      const b = createBudget();
      b.setCodec(codec);
      expect(b.charge(BASE_LOOP.clip)).toBe(true);
      const took: string[] = [];
      for (const a of [...s1a, ...s1a]) {
        if (!b.canFetchKeeping(a.clip, [nod])) continue;
        expect(b.charge(a.clip)).toBe(true);
        if (!took.includes(a.id)) took.push(a.id);
      }
      expect({ codec, glances: took.length }).toEqual({ codec, glances: 3 });
      expect(b.canFetch(nod)).toBe(true); // the egg still fits
      expect(b.charge(nod)).toBe(true);
      expect(b.spent).toBeLessThanOrEqual(VISIT_BUDGET_BYTES[codec]);
      // Without the reserve a 4th variant would fit and starve the nod.
      const greedy = createBudget();
      greedy.setCodec(codec);
      greedy.charge(BASE_LOOP.clip);
      s1a.slice(0, 4).forEach((a) => greedy.charge(a.clip));
      expect(greedy.canFetch(nod)).toBe(false);
    }
  });

  it("canFetchKeeping ignores a reserve that is the clip itself or already fetched", () => {
    const nod = ACTIONS["nod.k180"]!.clip;
    const b = createBudget();
    b.setCodec("av1");
    b.charge(BASE_LOOP.clip);
    expect(b.canFetchKeeping(nod, [nod])).toBe(b.canFetch(nod));
    b.charge(nod);
    const s = ACTIONS["s1a.k0"]!.clip;
    expect(b.canFetchKeeping(s, [nod])).toBe(b.canFetch(s));
  });
});
