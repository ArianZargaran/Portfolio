import { HIT_OBJECTS, LAYER06 } from "~/scene/hit-areas";
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

  it("flags estimated boxes: every laptop box (V12 hand estimates), poster on tablet/mobile, layer 6 shelf objects everywhere", () => {
    const estimated = HIT_OBJECTS.filter((o) => o.estimated?.length);
    expect(estimated.map((o) => [o.id, o.estimated])).toEqual([
      ["laptop", ["laptop"]],
      ["queen-poster", ["laptop", "tablet", "mobile"]],
      ["bookshelf", ["laptop", "tablet", "mobile"]],
      ["lego", ["laptop", "tablet", "mobile"]],
      ["phone", ["laptop"]],
      ["notebook", ["laptop"]],
      ["speakers", ["laptop"]],
    ]);
  });

  it("maps /case-studies to the layer 6 Lego entity and /resume to the rest of the shelf", () => {
    const byId = Object.fromEntries(HIT_OBJECTS.map((o) => [o.id, o]));
    expect(byId.lego.href).toBe("/case-studies");
    expect(byId.lego.entities).toEqual([`${LAYER06}/item.lego`]);
    expect(byId.bookshelf.href).toBe("/resume");
    expect(byId.bookshelf.entities).toEqual(
      expect.arrayContaining([
        `${LAYER06}/shelf.frame`,
        `${LAYER06}/item.xwing`,
        `${LAYER06}/item.vader`,
        `${LAYER06}/item.r2d2`,
      ]),
    );
    expect(byId.bookshelf.entities).not.toContain(`${LAYER06}/item.lego`);
  });

  it("no longer references retired v3.2 cards (50_hot_lego etc.)", () => {
    const all = HIT_OBJECTS.flatMap((o) => o.entities ?? []);
    expect(
      all.filter((e) => /50_hot_|20_room_shelf-|^bookshelf$/.test(e)),
    ).toEqual([]);
  });

  it("keeps the Lego box inside the laptop shelf box", () => {
    const byId = Object.fromEntries(HIT_OBJECTS.map((o) => [o.id, o]));
    const [lx1, ly1, lx2, ly2] = byId.lego.rects.laptop[0];
    const [sx1, sy1, sx2, sy2] = byId.bookshelf.rects.laptop[0];
    expect(lx1 >= sx1 && ly1 >= sy1 && lx2 <= sx2 && ly2 <= sy2).toBe(true);
  });

  it("stacks Lego above the bookshelf so it wins where they overlap", () => {
    const ids = HIT_OBJECTS.map((o) => o.id);
    expect(ids.indexOf("lego")).toBeGreaterThan(ids.indexOf("bookshelf"));
  });
});
