import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  importHotspotBoxes,
  intersects,
  type BoxesFile,
  type ImportConfig,
} from "./import";
import {
  LAPTOP_BOXES_SOURCE,
  LAPTOP_HIT_ORDER,
  LAPTOP_RECTS,
} from "./laptop.generated";
import {
  DEFAULT_HIT_ORDER,
  GRAPH_PROPOSALS,
  GRAPH_ROUTE_OBJECTS,
  HOTSPOT_MAP,
  LOCAL_EXTRA_RECTS,
  MUST_STAY_CLEAR,
  NO_HIT_BOXES,
  REFERENCE_BOXES,
  STACKING_RULES,
} from "./mapping";

const fixture = (name: string) =>
  readFileSync(resolve(__dirname, "__fixtures__", name));
const load = (name: string) =>
  JSON.parse(fixture(name).toString("utf8")) as BoxesFile;

const cfg: ImportConfig = {
  map: HOTSPOT_MAP,
  noHit: NO_HIT_BOXES,
  reference: REFERENCE_BOXES,
  mustStayClear: MUST_STAY_CLEAR,
  stacking: STACKING_RULES,
  defaultOrder: DEFAULT_HIT_ORDER,
  extraRects: LOCAL_EXTRA_RECTS,
};

const V2 = "HOTSPOT_BOXES_t995_v2.json";
const V1 = "HOTSPOT_BOXES_t995.json";

describe("hotspot importer: t995 v2 fixture", () => {
  const res = importHotspotBoxes(load(V2), cfg);
  const byId = Object.fromEntries(res.hotspots.map((h) => [h.id, h]));

  it("validates with no errors", () => {
    expect(res.errors).toEqual([]);
    expect(res.ok).toBe(true);
    expect(res.version).toBe(2);
  });

  it("decision 1: laptop = screen_lid", () => {
    expect(byId.laptop.from).toEqual(["laptop.screen_lid"]);
    expect(byId.laptop.rects).toEqual([[442, 420, 639, 573]]);
  });

  it("decision 2: speakers on the Stanley, mug-sip gets no hit area", () => {
    expect(byId.speakers.rects).toEqual([[402, 429, 451, 571]]);
    expect(byId.speakers.route).toBe("/podcast");
    expect(res.hotspots.map((h) => h.id)).not.toContain("mug-sip");
  });

  it("decision 3: hit order with the phone above the notebook", () => {
    expect(res.order).toEqual([
      "bookshelf",
      "lego",
      "queen-poster",
      "laptop",
      "notebook",
      "phone",
      "speakers",
    ]);
    expect(res.order.indexOf("phone")).toBeGreaterThan(
      res.order.indexOf("notebook"),
    );
  });

  it("decision 4: 3-box bookshelf + photo frames, lower tier focusable, jersey clear", () => {
    expect(byId.bookshelf.from).toEqual([
      "bookshelf.lower_tier_and_base",
      "bookshelf.middle_tier",
      "bookshelf.hutch",
      "bookshelf.photo_frames_on_top",
      "bookshelf.left_plinth (local)",
    ]);
    expect(byId.bookshelf.rects).toEqual([
      [913, 514, 1440, 866],
      [951, 388, 1374, 530],
      [994, 268, 1329, 404],
      [1035, 203, 1265, 295],
      [879, 672, 913, 817], // Dusk's optional 5th rect, approved by Atlas
    ]);
    expect(byId.bookshelf.route).toBe("/resume");
    const jersey = load(V2).informational!.find(
      (i) => i.id === "jersey-frame",
    )!.hit_xyxy!;
    expect(
      res.hotspots.flatMap((h) => h.rects).filter((r) => intersects(r, jersey)),
    ).toEqual([]);
    // Nothing routes to the jersey.
    expect(res.hotspots.flatMap((h) => h.from).join()).not.toMatch(/jersey/);
  });

  it("flags the v2 hit_order bookshelf rect order (same rects, hutch listed first)", () => {
    expect(res.warnings).toEqual([
      expect.stringMatching(/^bookshelf: hit_order lists the same rects/),
    ]);
  });

  it("matches the committed laptop.generated.ts (v2 is wired in)", () => {
    expect(LAPTOP_BOXES_SOURCE.sha256).toBe(
      createHash("sha256").update(fixture(V2)).digest("hex"),
    );
    expect([...LAPTOP_HIT_ORDER]).toEqual(res.order);
    expect(LAPTOP_RECTS).toEqual(
      Object.fromEntries(res.hotspots.map((h) => [h.id, h.rects])),
    );
  });
});

describe("hotspot importer: t995 v1 fixture (not wired)", () => {
  const res = importHotspotBoxes(load(V1), cfg);

  it("is rejected: no 3-box bookshelf split", () => {
    expect(res.ok).toBe(false);
    expect(res.errors).toEqual([
      expect.stringMatching(/^bookshelf: no rects\[\] split/),
      // and the local plinth rect has no bookshelf to attach to
      'bookshelf.left_plinth (local): no imported object "bookshelf"',
    ]);
  });

  it("falls back to the default order and ignores mug-sip's v1 hit box", () => {
    expect(res.order).toEqual([...DEFAULT_HIT_ORDER]);
    expect(res.warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^mug-sip: has a hit box/),
      ]),
    );
  });
});

describe("hotspot importer: validation", () => {
  const base = () => load(V2);

  it("rejects a wrong scene size", () => {
    const f = { ...base(), scene_size: [1280, 800] as [number, number] };
    expect(importHotspotBoxes(f, cfg).errors[0]).toMatch(/scene_size/);
  });

  it("rejects an order that puts the notebook above the phone", () => {
    const f = base();
    const o = f.hit_order!.dom_order_later_wins;
    const [i, j] = [o.indexOf("notebook"), o.indexOf("phone")];
    [o[i], o[j]] = [o[j], o[i]];
    expect(importHotspotBoxes(f, cfg).errors).toContain(
      "stacking: phone must sit above notebook",
    );
  });

  it("rejects a bookshelf box that touches the jersey frame", () => {
    const f = base();
    const shelf = f.hotspots.find((h) => h.id === "bookshelf")!;
    shelf.rects!.find((p) => p.part === "hutch")!.hit = [871, 268, 458, 136];
    f.hit_order!.entries = undefined;
    expect(importHotspotBoxes(f, cfg).errors).toEqual([
      expect.stringMatching(/bookshelf\.hutch: .* intersects jersey-frame/),
    ]);
  });

  it("rejects an unmapped hotspot and a mug-sip that claims a hit role", () => {
    const f = base();
    f.hotspots.push({ id: "bat-lamp", role: "hit", hit_xyxy: [0, 0, 50, 50] });
    f.hotspots.find((h) => h.id === "mug-sip")!.role = "hit";
    const errs = importHotspotBoxes(f, cfg).errors;
    expect(errs).toContain(
      "bat-lamp: unmapped hotspot (add it to HOTSPOT_MAP or NO_HIT_BOXES)",
    );
    expect(errs).toContain('mug-sip: role "hit", expected "no_hit"');
  });

  it("rejects boxes under the 44 px minimum side or outside the canvas", () => {
    const f = base();
    f.hotspots.find((h) => h.id === "phone")!.hit_xyxy = [630, 469, 660, 584];
    f.hotspots.find((h) => h.id === "phone")!.hit = null;
    f.hotspots.find((h) => h.id === "lego")!.hit_xyxy = [1047, 552, 1450, 746];
    f.hotspots.find((h) => h.id === "lego")!.hit = null;
    f.hit_order!.entries = undefined;
    const errs = importHotspotBoxes(f, cfg).errors;
    expect(errs).toContain("phone: [630,469,660,584] has a side under 44 px");
    expect(errs).toContain("lego: [1047,552,1450,746] outside 1440x900");
  });
});

describe("hotspot importer: local extra rects", () => {
  it("the approved left-plinth rect sits 308 px below the jersey hit box", () => {
    const jersey = load(V2).informational!.find(
      (i) => i.id === "jersey-frame",
    )!.hit_xyxy!;
    const [x1, y1, x2] = LOCAL_EXTRA_RECTS[0].rect;
    expect(x1 < jersey[2] && jersey[0] < x2).toBe(true); // shares columns
    expect(y1 - jersey[3]).toBe(308);
  });

  it("rejects an extra rect that touches the jersey frame", () => {
    const res = importHotspotBoxes(load(V2), {
      ...cfg,
      extraRects: [
        {
          id: "bookshelf",
          rect: [879, 300, 913, 817],
          name: "bad",
          why: "test",
          minSideExempt: true,
        },
      ],
    });
    expect(res.errors).toEqual([
      expect.stringMatching(
        /bookshelf\.bad \(local\): .* intersects jersey-frame/,
      ),
    ]);
  });

  it("enforces the 44 px minimum unless the extra is explicitly exempt", () => {
    const res = importHotspotBoxes(load(V2), {
      ...cfg,
      extraRects: [{ ...LOCAL_EXTRA_RECTS[0], minSideExempt: false }],
    });
    expect(res.errors).toEqual([
      "bookshelf.left_plinth (local): [879,672,913,817] has a side under 44 px",
    ]);
  });
});

describe("hotspot mapping vs graph.yaml", () => {
  it("maps every route in routes.map exactly once", () => {
    expect(HOTSPOT_MAP.map((e) => e.route).sort()).toEqual(
      Object.keys(GRAPH_ROUTE_OBJECTS).sort(),
    );
  });

  it("lists every off-graph object as a proposal for Atlas", () => {
    const offGraph = HOTSPOT_MAP.filter((e) => e.graphObject).map((e) => e.id);
    const proposed = GRAPH_PROPOSALS.map((p) => p.id);
    expect(offGraph.every((id) => proposed.includes(id))).toBe(true);
    expect(proposed).toContain("speakers");
  });
});
