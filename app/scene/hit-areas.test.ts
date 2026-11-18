import { HIT_OBJECTS, HIT_STACK, LAYER06, stackIndex } from "~/scene/hit-areas";
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

  it("flags estimated boxes: laptop is measured (t995 v2); poster and shelf objects on tablet/mobile", () => {
    const estimated = HIT_OBJECTS.filter((o) => o.estimated?.length);
    expect(estimated.map((o) => [o.id, o.estimated])).toEqual([
      ["queen-poster", ["tablet", "mobile"]],
      ["bookshelf", ["tablet", "mobile"]],
      ["lego", ["tablet", "mobile"]],
    ]);
    expect(HIT_OBJECTS.some((o) => o.estimated?.includes("laptop"))).toBe(
      false,
    );
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

  it.each(["laptop", "tablet", "mobile"] as const)(
    "stacks Lego above the bookshelf on %s",
    (bp) => {
      expect(stackIndex(bp, "lego")).toBeGreaterThan(
        stackIndex(bp, "bookshelf"),
      );
    },
  );

  it("laptop: stacks the phone above the notebook, and both plus speakers above the laptop", () => {
    expect(HIT_STACK.laptop).toEqual([
      "bookshelf",
      "lego",
      "queen-poster",
      "laptop",
      "notebook",
      "phone",
      "speakers",
    ]);
    expect(stackIndex("laptop", "phone")).toBeGreaterThan(
      stackIndex("laptop", "notebook"),
    );
  });

  it("keeps the DOM/tab order and the tablet/mobile stacking unchanged", () => {
    const legacy = [
      "laptop",
      "queen-poster",
      "bookshelf",
      "lego",
      "phone",
      "notebook",
      "speakers",
    ];
    expect(HIT_OBJECTS.map((o) => o.id)).toEqual(legacy);
    expect(HIT_STACK.tablet).toEqual(legacy);
    expect(HIT_STACK.mobile).toEqual(legacy);
  });

  it("keeps tablet and mobile on their current (pre-t995) data", () => {
    expect(
      Object.fromEntries(
        HIT_OBJECTS.map((o) => [o.id, [o.rects.tablet, o.rects.mobile]]),
      ),
    ).toMatchInlineSnapshot(`
      {
        "bookshelf": [
          [
            [
              511,
              84,
              802,
              417,
            ],
            [
              681,
              760,
              820,
              1180,
            ],
          ],
          [
            [
              143,
              278,
              380,
              463,
            ],
          ],
        ],
        "laptop": [
          [
            [
              408,
              803,
              539,
              937,
            ],
          ],
          [
            [
              225,
              636,
              298,
              710,
            ],
          ],
        ],
        "lego": [
          [
            [
              762,
              930,
              805,
              1004,
            ],
          ],
          [
            [
              189,
              370,
              212,
              411,
            ],
          ],
        ],
        "notebook": [
          [
            [
              407,
              927,
              524,
              971,
            ],
          ],
          [
            [
              224,
              705,
              289,
              728,
            ],
          ],
        ],
        "phone": [
          [
            [
              266,
              834,
              312,
              899,
            ],
          ],
          [
            [
              147,
              653,
              172,
              689,
            ],
          ],
        ],
        "queen-poster": [
          [
            [
              578,
              506,
              742,
              808,
            ],
          ],
          [
            [
              12,
              22,
              100,
              187,
            ],
          ],
        ],
        "speakers": [
          [
            [
              593,
              837,
              662,
              927,
            ],
          ],
          [
            [
              327,
              655,
              366,
              705,
            ],
          ],
        ],
      }
    `);
  });

  it("splits the laptop bookshelf into 3 cabinet boxes + the photo frames, clear of the jersey frame", () => {
    const shelf = HIT_OBJECTS.find((o) => o.id === "bookshelf")!;
    expect(shelf.rects.laptop).toHaveLength(4);
    const jersey = [796, 134, 953, 364];
    for (const [x1, y1, x2, y2] of HIT_OBJECTS.flatMap((o) => o.rects.laptop))
      expect(
        x1 < jersey[2] && jersey[0] < x2 && y1 < jersey[3] && jersey[1] < y2,
      ).toBe(false);
  });
});
