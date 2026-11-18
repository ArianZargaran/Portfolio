import { ACTIONS, BASE_LOOP } from "./actions";
import { codecOfCurrentSrc, createBudget, VISIT_BUDGET_BYTES } from "./budget";

const KiB = 1024;

describe("per-visit byte budget (0.75 / 0.97 MB)", () => {
  it("is 750 KiB for AV1 and 970 KiB for H.264", () => {
    expect(VISIT_BUDGET_BYTES).toEqual({ av1: 750 * KiB, h264: 970 * KiB });
  });

  it("today's full visit (typing + nod + bounce) fits both codecs", () => {
    for (const codec of ["av1", "h264"] as const) {
      const b = createBudget();
      b.setCodec(codec);
      expect(b.charge(BASE_LOOP.clip)).toBe(true);
      expect(b.charge(ACTIONS.nod.clip)).toBe(true);
      expect(b.charge(ACTIONS.bounce.clip)).toBe(true);
      expect(b.spent).toBeLessThanOrEqual(VISIT_BUDGET_BYTES[codec]);
    }
    const av1 = createBudget();
    av1.setCodec("av1");
    [BASE_LOOP.clip, ACTIONS.nod.clip, ACTIONS.bounce.clip].forEach((c) =>
      av1.charge(c),
    );
    expect(Math.round(av1.spent / KiB)).toBe(576);
  });

  it("charges a clip once, and refuses one that would exceed the budget", () => {
    const b = createBudget({ av1: 400 * KiB, h264: 400 * KiB });
    b.setCodec("av1");
    expect(b.charge(BASE_LOOP.clip)).toBe(true); // 325.5 KiB
    expect(b.cost(BASE_LOOP.clip)).toBe(0);
    expect(b.charge(BASE_LOOP.clip)).toBe(true);
    expect(b.canFetch(ACTIONS.bounce.clip)).toBe(false); // +90.6 > 400
    expect(b.charge(ACTIONS.bounce.clip)).toBe(false);
    expect(Math.round(b.spent / KiB)).toBe(325);
  });

  it("charges H.264 sizes until the browser's codec is known", () => {
    const b = createBudget();
    expect(b.codec).toBe("h264");
    expect(b.cost(BASE_LOOP.clip)).toBe(445_269);
  });

  it("reads the codec from the element's currentSrc", () => {
    const [av1, h264] = BASE_LOOP.clip.sources;
    expect(codecOfCurrentSrc(BASE_LOOP.clip, `http://x${av1.src}`)).toBe("av1");
    expect(codecOfCurrentSrc(BASE_LOOP.clip, `http://x${h264.src}`)).toBe(
      "h264",
    );
  });
});
