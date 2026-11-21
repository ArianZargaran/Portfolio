# Scene hotspots: importing Dusk's box files

Laptop hit areas (1440×900 composition) come from Dusk's measured `HOTSPOT_BOXES_*.json` in the brain (`designs/`). A new box file is a **pure data drop**: run the importer, review the diff, commit the regenerated file. Tablet and mobile are still unmeasured and stay as hand-written data in `app/scene/hit-areas.ts`.

| File                                     | Role                                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| `app/scene/hotspots/import.ts`           | Typed schema plus a pure importer/validator (no fs, runs under Node and Vitest)        |
| `app/scene/hotspots/mapping.ts`          | Box id → app hotspot id/route, Atlas's decisions, stacking rules, graph.yaml proposals |
| `app/scene/hotspots/laptop.generated.ts` | **Generated.** Laptop rects, hit order and source sha256. Do not edit                  |
| `app/scene/hotspots/__fixtures__/`       | Byte-identical copies of the brain files (tests check the sha256; prettier-ignored)    |
| `scripts/hotspots/import-hotspots.mjs`   | CLI                                                                                    |

## Run

```sh
cp /workspace/portfolio-brain/designs/HOTSPOT_BOXES_<task>.json app/scene/hotspots/__fixtures__/
npm run hotspots:import -- app/scene/hotspots/__fixtures__/HOTSPOT_BOXES_<task>.json                      # validate + diff vs live
npm run hotspots:import -- app/scene/hotspots/__fixtures__/HOTSPOT_BOXES_<task>.json --preview out.md     # preview report only
npm run hotspots:import -- app/scene/hotspots/__fixtures__/HOTSPOT_BOXES_<task>.json --write             # regenerate (refuses on errors)
```

Then point the sha/fixture name in `import.test.ts` at the new file and run the checks. Needs Node ≥ 22.18 (type stripping).

## What the validator enforces

- `scene_size` 1440×900; units state exclusive `*_xyxy` rects (the `Rect` convention).
- Every box-file hotspot is mapped, no-hit (`mug-sip`) or reference (`character`); an unknown id is an error.
- Rects inside the canvas, no side under `hit_rule.min_side_px` (44), `hit` and `hit_xyxy` agree.
- Nothing touches the jersey frame (`informational[]`).
- The hit order is a permutation of the mapped ids and obeys `STACKING_RULES` (lego > bookshelf, phone > notebook, notebook/phone/headphones > laptop).
- The file's own `hit_order.entries` rects equal the derived rects (order inside an object comes from the mapping: the first rect is focusable).

## Atlas's decisions (Nov 17 2026), encoded in `mapping.ts`

1. Laptop hit area = `laptop.screen_lid` (the full body is reference only).
2. The sip sits on the navy Stanley and is timer-only, so `mug-sip` gets no hit box. T6/podcast used to sit on the Stanley too (the box file's `speakers`); since Nov 21 2026 (Ari, t1034u) it is Ari's on-head **headphones**, see below.

### Local hotspots (not in the box file)

A `HOTSPOT_MAP` entry can use `source: { kind: "local", rect, name, why }` for an object the box file has no box for. The rect is exclusive xyxy in the 1440x900 composition, focusable, checked for bounds and the 44 px minimum like any other, and stacks on top of the file's hit order (it is appended in mapping order). A box-file hotspot it replaces goes in `SUPERSEDED_BOXES`: the importer ignores it (with a warning) in the hotspots and in `hit_order`; without that entry it stays an "unmapped hotspot" error, so nothing is dropped silently.

- `headphones` (`/podcast`, the T6 groove trigger and the second step of the E2 egg): `[246, 298, 356, 410]` (110 x 112 px), measured on the V12 dusk still `public/scene/home-office.desk.coding.dusk.clear/laptop-1440.webp` around the headband (from x 300, y 305) and both ear cups (near x 313–348, y 363–406; far x 250–262, y 370–400), padded about 4 px for the head bob. It sits inside the character's reference box `[197, 298, 543, 824]` and clears every other hit rect. `speakers` (the Stanley, `[402, 429, 451, 571]`) is in `SUPERSEDED_BOXES`.
- Tablet `[168, 632, 224, 750]` and mobile `[88, 540, 132, 604]` are by eye on the v3.2 placeholder stills (flagged `estimated`).
- Accessible name "Podcast (headphones)"; it stays the last tab stop (where `speakers` was).
- Checks: `import.test.ts` and `hit-areas.test.ts` (no overlap at any breakpoint), and `cypress/e2e/hotspots-geometry.cy.ts` (bounding rects inside the viewport and clear of the poster and every other hotspot at 1440x900, 1025/1280/1920x900, 1280x800 and 1920x1080).
3. Phone above notebook.
4. Bookshelf = 3 cabinet boxes (lower tier and base first: focusable and the zoom origin; middle tier; hutch) plus the photo frames on top (pointer-only). The jersey frame opens nothing. `/resume` stays on the bookshelf.

## Local overrides (`LOCAL_EXTRA_RECTS` in `mapping.ts`)

Rects that are not in Dusk's file but are approved for the app. They are appended after the object's file rects, are always pointer-only, go through the same canvas and jersey checks, and are left out of the `hit_order.entries` comparison. The 44 px minimum applies unless the entry is marked `minSideExempt` (a thin pointer-only sliver attached to a large object).

| Object              | Rect (x1,y1,x2,y2)                 | Origin                                                                                                                                                          | Jersey gap                                                                            |
| ------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| bookshelf (/resume) | [879, 672, 913, 817] `left_plinth` | Dusk's optional 5th rect (t995 v2 review item 1, given as x,y,w,h [879,672,34,145]); approved by Atlas, Nov 17 2026. Covers the left plinth corner and left leg | 308 px below the jersey hit box (316 px below its tight box); shares columns x879–913 |

## Stacking vs tab order

DOM order (= tab order, deep-link lookup) stays the `HIT_OBJECTS` order. Stacking is per breakpoint (`HIT_STACK`, rendered as `z-index` inside each `.scene_hits` stacking context): laptop uses the box file's hit order, tablet/mobile keep the old array order, so their behaviour is unchanged.

## Current source

`HOTSPOT_BOXES_t995_v2.json` (sha256 `4b823c56…`, review PASS WITH NOTES). v1 (`HOTSPOT_BOXES_t995.json`) is rejected on purpose: it has no 3-box bookshelf split.

## graph.yaml vocabulary (proposals for Atlas, not edits)

See `GRAPH_PROPOSALS` in `mapping.ts`: `headphones` (routes.map says "pair of speakers"; it is Ari's on-head headphones since Nov 21 2026), `lego` (X-Wing diorama bay, not a Lego figure), `mug-sip` (graph calls it `tumbler_sip`) and `jersey-frame` (decorative, not in routes.map).
