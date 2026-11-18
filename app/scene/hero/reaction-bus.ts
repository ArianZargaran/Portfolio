/**
 * Page-wide channel from event sources to the hero player, which owns the
 * reaction queue. Two kinds of message:
 *
 * - "intent": hover/focus has started on something that can trigger the
 *   reaction. The player fetches the clip (within the per-visit budget) so
 *   it is buffered by the time the 250 ms dwell confirms. This is the only
 *   way reaction media is fetched: there is no idle prefetch (M3).
 * - "request": the dwell (or an idle/tab-return trigger) confirmed; the
 *   player enqueues it.
 *
 * Handlers must stay cheap (INP): the player only records here; all video
 * work happens on its next animation frame or in a media call.
 */
import type { ReactionId } from "./reactions";

export type HeroMessage = "intent" | "request";
type Listener = (id: ReactionId, kind: HeroMessage) => void;
const listeners = new Set<Listener>();

export function requestHeroReaction(id: ReactionId): void {
  listeners.forEach((l) => l(id, "request"));
}

export function intentHeroReaction(id: ReactionId): void {
  listeners.forEach((l) => l(id, "intent"));
}

export function onHeroReaction(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
