/**
 * Per-visit hero media (resize-refreeze fix, Ari t1038s5660).
 *
 * "Per visit" means this page load (the SPA session): the byte budget, the
 * fetch-once clip store and the loop source the browser picked live here,
 * at module level, not inside the player's mount effect. The player
 * unmounts whenever motion stops being allowed (the window narrows below
 * the 1025 px laptop breakpoint, reduced motion turns on) or the scene
 * leaves the page (a hotspot opens a content page); before, each remount
 * created a fresh budget and store, so returning re-downloaded the loop
 * (with the HTTP cache off) and reset `data-bytes`, which also let a visit
 * spend its cap more than once. Now a remount re-attaches the blobs it
 * already has, joins any fetch still in flight, and keeps charging the
 * same budget, so 768,000 B AV1 / 993,280 B H.264 hold for the whole
 * page load.
 *
 * Nothing here is persisted: a reload or a new tab is a new visit with a
 * new budget (and a new network gate decision). The blobs are kept until
 * the page goes away (at most the visit's budget, < 1 MB).
 */
import type { ClipSource } from "./base-loop";
import { createBudget, type Budget } from "./budget";
import { createClipStore, type ClipStore } from "./clip-store";

export interface VisitMedia {
  budget: Budget;
  store: ClipStore;
  /** The loop source in use (after any AV1 -> H.264 fallback), once picked. */
  source?: ClipSource;
}

let visit: VisitMedia | undefined;

/** This page load's hero media (created on first use, client only). */
export function heroVisitMedia(): VisitMedia {
  visit ??= { budget: createBudget(), store: createClipStore() };
  return visit;
}

/** Tests only: a new visit (aborts fetches, revokes blobs). */
export function resetHeroVisitForTests(): void {
  visit?.store.dispose();
  visit = undefined;
}
