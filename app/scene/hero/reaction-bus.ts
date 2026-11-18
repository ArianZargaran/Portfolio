/**
 * Page-wide channel from event sources (hotspot hover/focus, idle, tab
 * return: wired in M5) to the hero player, which owns the reaction queue.
 * Handlers must stay cheap (INP): the player only enqueues here; all video
 * work happens on its next animation frame.
 */
import type { ReactionId } from "./reactions";

type Listener = (id: ReactionId) => void;
const listeners = new Set<Listener>();

export function requestHeroReaction(id: ReactionId): void {
  listeners.forEach((l) => l(id));
}

export function onHeroReaction(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
