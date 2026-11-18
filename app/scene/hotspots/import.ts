/**
 * Typed importer/validator for Dusk's HOTSPOT_BOXES_*.json (t995 schema).
 * Pure: no fs, no aliases, only type imports, so the CLI
 * (scripts/hotspots/import-hotspots.mjs) runs it under plain Node and Vitest
 * runs it against the fixtures. Only the laptop composition is measured;
 * tablet and mobile stay on hit-areas.ts.
 */
import type { Rect } from "../hit-areas";

import type { BoxSource, HotspotMapEntry } from "./mapping";

/** [x, y, w, h] in composition px. */
export type Box = [number, number, number, number];

export interface BoxesSubBox {
  tight?: Box;
  hit?: Box | null;
  method?: string;
  [k: string]: unknown;
}

export interface BoxesPart {
  part: string;
  tight?: Box;
  hit: Box;
  pointer_only?: boolean;
}

export interface BoxesHotspot {
  id: string;
  /** v2: "hit" | "no_hit" | "reference (…)". Absent in v1. */
  role?: string;
  tight?: Box | null;
  tight_xyxy?: Rect | null;
  hit?: Box | null;
  hit_xyxy?: Rect | null;
  sub_boxes?: Record<string, BoxesSubBox> | null;
  /** v2 bookshelf split. */
  rects?: BoxesPart[];
  [k: string]: unknown;
}

export interface BoxesInformational {
  id: string;
  tight_xyxy?: Rect;
  hit_xyxy?: Rect;
  [k: string]: unknown;
}

export interface BoxesFile {
  task: string;
  version?: number;
  scene: string;
  scene_size: [number, number];
  units: string;
  hit_rule: { pad_px: number; min_side_px: number; clamp: [number, number] };
  hotspots: BoxesHotspot[];
  informational?: BoxesInformational[];
  hit_order?: {
    dom_order_later_wins: string[];
    entries?: { id: string; rects_xyxy: Rect[] }[];
  };
  [k: string]: unknown;
}

export interface ImportedHotspot {
  id: string;
  route: string;
  /** First rect focusable, the rest pointer-only. */
  rects: Rect[];
  /** Box-file provenance of each rect ("laptop.screen_lid", "bookshelf.hutch"…). */
  from: string[];
}

export interface ImportConfig {
  map: readonly HotspotMapEntry[];
  noHit: readonly string[];
  reference: readonly string[];
  mustStayClear: readonly string[];
  stacking: readonly (readonly [string, string])[];
  defaultOrder: readonly string[];
}

export interface ImportResult {
  ok: boolean;
  task: string;
  version: number;
  /** Laptop stacking order, later wins. */
  order: string[];
  /** In `order`. Objects whose source failed are left out. */
  hotspots: ImportedHotspot[];
  errors: string[];
  warnings: string[];
}

export const SCENE_SIZE: [number, number] = [1440, 900];

export const boxToRect = ([x, y, w, h]: Box): Rect => [x, y, x + w, y + h];

export const intersects = (a: Rect, b: Rect) =>
  a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

const sameRect = (a: Rect, b: Rect) => a.every((v, i) => v === b[i]);
const key = (r: Rect) => r.join(",");
const isNum4 = (v: unknown): v is [number, number, number, number] =>
  Array.isArray(v) && v.length === 4 && v.every((n) => Number.isInteger(n));

function rectsFor(
  h: BoxesHotspot,
  src: BoxSource,
  errors: string[],
): { rects: Rect[]; from: string[] } | undefined {
  const where = `${h.id}`;
  if (src.kind === "hit") {
    if (!isNum4(h.hit_xyxy)) {
      errors.push(`${where}: no hit_xyxy`);
      return undefined;
    }
    if (isNum4(h.hit) && !sameRect(boxToRect(h.hit), h.hit_xyxy))
      errors.push(`${where}: hit and hit_xyxy disagree`);
    return { rects: [h.hit_xyxy], from: [h.id] };
  }
  if (src.kind === "sub") {
    const sub = h.sub_boxes?.[src.sub];
    if (!sub || !isNum4(sub.hit)) {
      errors.push(`${where}: no sub-box "${src.sub}" with a hit box`);
      return undefined;
    }
    return { rects: [boxToRect(sub.hit)], from: [`${h.id}.${src.sub}`] };
  }
  const parts = h.rects ?? [];
  if (!parts.length) {
    errors.push(
      `${where}: no rects[] split (needs ${src.parts.join(", ")}); decision 4 needs the 3-box bookshelf`,
    );
    return undefined;
  }
  const names = parts.map((p) => p.part);
  const missing = src.parts.filter((p) => !names.includes(p));
  const extra = names.filter((p) => !src.parts.includes(p));
  if (missing.length)
    errors.push(`${where}: missing parts ${missing.join(", ")}`);
  if (extra.length) errors.push(`${where}: unmapped parts ${extra.join(", ")}`);
  if (missing.length || extra.length) return undefined;
  const ordered = src.parts.map((name) => parts.find((p) => p.part === name)!);
  ordered.forEach((p, i) => {
    if (!isNum4(p.hit)) errors.push(`${where}.${p.part}: bad hit box`);
    if (i === 0 && p.pointer_only)
      errors.push(
        `${where}.${p.part}: the first (focusable) rect is pointer_only`,
      );
  });
  return {
    rects: ordered.map((p) => boxToRect(p.hit)),
    from: ordered.map((p) => `${h.id}.${p.part}`),
  };
}

export function importHotspotBoxes(
  file: BoxesFile,
  cfg: ImportConfig,
): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const version = file.version ?? 1;

  const [W, H] = file.scene_size ?? [0, 0];
  if (W !== SCENE_SIZE[0] || H !== SCENE_SIZE[1])
    errors.push(`scene_size ${W}x${H}, expected 1440x900 (laptop composition)`);
  if (!/exclusive/.test(file.units ?? "") || !/xyxy/.test(file.units ?? ""))
    errors.push("units must state exclusive *_xyxy rects (hit-areas.ts Rect)");
  const minSide = file.hit_rule?.min_side_px ?? 44;

  const byId = new Map(file.hotspots.map((h) => [h.id, h]));
  if (byId.size !== file.hotspots.length) errors.push("duplicate hotspot ids");

  // Every box-file hotspot is either mapped, no-hit, or reference.
  const mapped = new Set(cfg.map.map((e) => e.source.box));
  for (const h of file.hotspots) {
    if (mapped.has(h.id)) {
      if (h.role !== undefined && h.role !== "hit")
        errors.push(`${h.id}: role "${h.role}", expected "hit"`);
    } else if (cfg.noHit.includes(h.id)) {
      if (h.role !== undefined && h.role !== "no_hit")
        errors.push(`${h.id}: role "${h.role}", expected "no_hit"`);
      if (h.hit_xyxy)
        warnings.push(
          `${h.id}: has a hit box in the file; ignored (no-hit by decision)`,
        );
    } else if (cfg.reference.includes(h.id)) {
      // reference geometry only
    } else
      errors.push(
        `${h.id}: unmapped hotspot (add it to HOTSPOT_MAP or NO_HIT_BOXES)`,
      );
  }

  const imported = new Map<string, ImportedHotspot>();
  for (const e of cfg.map) {
    const h = byId.get(e.source.box);
    if (!h) {
      errors.push(`${e.id}: box "${e.source.box}" missing from the file`);
      continue;
    }
    const got = rectsFor(h, e.source, errors);
    if (!got) continue;
    got.rects.forEach((r, i) => {
      const at = got.from[i];
      if (!isNum4(r)) return;
      const [x1, y1, x2, y2] = r;
      if (x1 < 0 || y1 < 0 || x2 > W || y2 > H)
        errors.push(`${at}: [${r}] outside ${W}x${H}`);
      if (x2 <= x1 || y2 <= y1) errors.push(`${at}: [${r}] empty`);
      else if (x2 - x1 < minSide || y2 - y1 < minSide)
        errors.push(`${at}: [${r}] has a side under ${minSide} px`);
    });
    imported.set(e.id, { id: e.id, route: e.route, ...got });
  }

  // Must-stay-clear boxes (the jersey).
  for (const id of cfg.mustStayClear) {
    const info = file.informational?.find((i) => i.id === id);
    const clear = info?.hit_xyxy ?? info?.tight_xyxy;
    if (!clear) {
      warnings.push(`${id}: not in informational[]; clearance not checked`);
      continue;
    }
    for (const o of imported.values())
      o.rects.forEach((r, i) => {
        if (intersects(r, clear))
          errors.push(`${o.from[i]}: [${r}] intersects ${id} [${clear}]`);
      });
  }

  // Stacking order (later wins).
  const ids = cfg.map.map((e) => e.id);
  const fileOrder = file.hit_order?.dom_order_later_wins;
  const order = fileOrder ? [...fileOrder] : [...cfg.defaultOrder];
  if (!fileOrder)
    warnings.push("no hit_order in the file; using DEFAULT_HIT_ORDER");
  const perm = [...order].sort().join() === [...ids].sort().join();
  if (!perm)
    errors.push(`hit order [${order}] is not a permutation of [${ids}]`);
  for (const [lo, hi] of cfg.stacking)
    if (order.indexOf(hi) < order.indexOf(lo))
      errors.push(`stacking: ${hi} must sit above ${lo}`);

  // The file's own per-object rects must match what the mapping derives.
  for (const entry of file.hit_order?.entries ?? []) {
    const o = imported.get(entry.id);
    if (!o) {
      if (!ids.includes(entry.id))
        errors.push(`hit_order entry "${entry.id}" is unmapped`);
      continue;
    }
    const a = o.rects.map(key).sort().join("|");
    const b = entry.rects_xyxy.map(key).sort().join("|");
    if (a !== b)
      errors.push(`${entry.id}: hit_order rects differ from the derived rects`);
    else if (o.rects.map(key).join("|") !== entry.rects_xyxy.map(key).join("|"))
      warnings.push(
        `${entry.id}: hit_order lists the same rects in another order; using the mapping order (first = focusable: ${o.from[0]})`,
      );
  }

  const hotspots = order
    .map((id) => imported.get(id))
    .filter((o): o is ImportedHotspot => !!o);
  return {
    ok: errors.length === 0,
    task: file.task,
    version,
    order,
    hotspots,
    errors,
    warnings,
  };
}

export interface LaptopData {
  order: readonly string[];
  rects: Readonly<Record<string, readonly Rect[]>>;
}

/** Human-readable diff of two laptop hit-area sets (preview reports). */
export function diffLaptop(before: LaptopData, after: LaptopData): string[] {
  const out: string[] = [];
  if (before.order.join() !== after.order.join())
    out.push(
      `order: ${before.order.join(" < ")}  ->  ${after.order.join(" < ")}`,
    );
  const ids = [
    ...new Set([...Object.keys(before.rects), ...Object.keys(after.rects)]),
  ];
  for (const id of ids) {
    const a = (before.rects[id] ?? []).map((r) => `[${r.join(",")}]`).join(" ");
    const b = (after.rects[id] ?? []).map((r) => `[${r.join(",")}]`).join(" ");
    if (a !== b) out.push(`${id}: ${a || "(none)"}  ->  ${b || "(none)"}`);
  }
  return out;
}

export const toLaptopData = (r: ImportResult): LaptopData => ({
  order: r.order,
  rects: Object.fromEntries(r.hotspots.map((h) => [h.id, h.rects])),
});
