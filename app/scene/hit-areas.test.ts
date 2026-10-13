import { HIT_OBJECTS } from "~/scene/hit-areas";
import { STILL_SOURCES } from "~/scene/still";

describe("scene hit areas", () => {
  it("cover all 7 routes", () => {
    expect(HIT_OBJECTS.map((o) => o.href).sort()).toEqual(
      [
        "/about",
        "/articles",
        "/case-studies",
        "/contact",
        "/podcast",
        "/resume",
        "/work",
      ].sort(),
    );
  });

  it.each(STILL_SOURCES)("every rect fits the $breakpoint canvas", (s) => {
    const bad = HIT_OBJECTS.flatMap((o) => o.rects[s.breakpoint]).filter(
      ([x1, y1, x2, y2]) =>
        !(x1 >= 0 && y1 >= 0 && x2 <= s.width && y2 <= s.height) ||
        x2 <= x1 ||
        y2 <= y1,
    );
    expect(bad).toEqual([]);
    expect(HIT_OBJECTS.every((o) => o.rects[s.breakpoint].length > 0)).toBe(
      true,
    );
  });

  it("flags the tablet and mobile poster boxes as estimated (Atlas)", () => {
    const estimated = HIT_OBJECTS.filter((o) => o.estimated?.length);
    expect(estimated.map((o) => [o.id, o.estimated])).toEqual([
      ["queen-poster", ["tablet", "mobile"]],
    ]);
  });

  it("stacks Lego above the bookshelf so it wins where they overlap", () => {
    const ids = HIT_OBJECTS.map((o) => o.id);
    expect(ids.indexOf("lego")).toBeGreaterThan(ids.indexOf("bookshelf"));
  });
});
