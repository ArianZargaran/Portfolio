/**
 * The server-rendered still frame of the current scene. Placeholder until the
 * Motion handoff: always the approved v3.2 baseline. One composition per
 * breakpoint (laptop, tablet and mobile are separate paintings, never a
 * scaled copy of each other). Files live in public/scene/<sceneId>/.
 */
export const PLACEHOLDER_SCENE_ID = "home-office.desk.coding.dusk.clear.v3.2";

export type Breakpoint = "laptop" | "tablet" | "mobile";

export interface StillSource {
  breakpoint: Breakpoint;
  /** Media query that selects this composition (first match wins). */
  media: string;
  /** Canvas size in px (the coordinate space for hit areas). */
  width: number;
  height: number;
  srcSet: { src: string; width: number }[];
}

const dir = `/scene/${PLACEHOLDER_SCENE_ID}`;

export const STILL_SOURCES: StillSource[] = [
  {
    breakpoint: "mobile",
    media: "(max-width: 600px)",
    width: 390,
    height: 844,
    srcSet: [
      { src: `${dir}/mobile-390.webp`, width: 390 },
      { src: `${dir}/mobile-780.webp`, width: 780 },
    ],
  },
  {
    breakpoint: "tablet",
    media: "(min-width: 601px) and (max-width: 1024px)",
    width: 820,
    height: 1180,
    srcSet: [{ src: `${dir}/tablet-820.webp`, width: 820 }],
  },
  {
    breakpoint: "laptop",
    media: "(min-width: 1025px)",
    width: 1440,
    height: 900,
    srcSet: [
      { src: `${dir}/laptop-960.webp`, width: 960 },
      { src: `${dir}/laptop-1440.webp`, width: 1440 },
    ],
  },
];

export const STILL_ALT =
  "Painted scene at dusk: Arian codes at a standing desk in his home office, " +
  "headphones on, a city skyline glowing through the window. Around him: a " +
  "laptop, a phone on a stand, a notebook, speakers, a Queen concert poster, " +
  "and a bookshelf with a lit Lego figure.";

export const srcSetAttr = (s: StillSource) =>
  s.srcSet.map((x) => `${x.src} ${x.width}w`).join(", ");
