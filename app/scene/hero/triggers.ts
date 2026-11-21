/**
 * Event wiring for hero reactions (M5, PLAN v3.3 §3). Attached by the lazy
 * player chunk to the scene frame, so none of this runs before the player
 * mounts (and never under reduced motion, a stored freeze, or off laptop).
 *
 * Hotspots are found by their `data-object` id (hit-areas.ts ids), never by
 * geometry: the laptop boxes in HIT_OBJECTS come from Dusk's measured box
 * file via the importer (docs/hotspots.md), so new boxes drop in as data
 * without touching this file.
 *
 * Sources:
 * - Hover (pointer devices that can hover: HOVER_MQ) and keyboard focus on
 *   a hotspot: after DWELL_MS still on it, "intent" (the player fetches the
 *   clip), the hotspot "visit" and, if the hotspot has a reaction, the
 *   request, in that order. Leaving before the dwell sends nothing, so a
 *   quick swipe fetches nothing (review N3). Touch never hovers; a tap
 *   navigates.
 * - Hover/focus on queen-poster: glance-up (S1a, locked t1014s5523),
 *   fetched on intent (only the variant for the next reachable join). The
 *   poster visit also arms the E2 egg, as before.
 * - Hover/focus on headphones: speaker groove (T6 v3, locked t1029s5606),
 *   fetched on intent the same way (one t6.k<join> variant). A headphones
 *   visit within 10 s of a poster visit completes the E2 egg (egg.ts): T6
 *   plays through the queue and the nod is armed for the f180 after it.
 * - No idle/return reaction or 45 s doze timer on this install: S1b / T2
 *   are unlocked, preserved on the local branch hero-reactions-s1a-s1b-t2.
 * - Pointer and focus both out of the scene: "leave" (disarms the E2 egg).
 *
 * Sip stays off until S4 exists (planned timer-only at 90 s, not 45 s).
 *
 * Requests without a clip (phone today) are refused by the queue
 * as "unknown"; they start working when their clips are registered. Every
 * request still goes through the queue: cooldowns, freeze, one slot.
 */
import {
  heroHotspot,
  intentHeroReaction,
  requestHeroReaction,
  type HotspotMessage,
} from "./reaction-bus";
import type { ReactionId } from "./reactions";

/** Hotspot id -> reaction it triggers (hit-areas.ts ids). Data, not code. */
export const HOTSPOT_REACTIONS: Readonly<Record<string, ReactionId>> = {
  "queen-poster": "glance-up",
  headphones: "speaker",
  phone: "phone",
};

export const TRIGGERS = {
  dwellMs: 250,
  inViewRatio: 0.5,
} as const satisfies Record<string, number | ReactionId>;

/** Hover intent only where a pointer can hover (not touch-first devices). */
export const HOVER_MQ = "(any-hover: hover) and (any-pointer: fine)";

export interface TriggerSink {
  intent(id: ReactionId): void;
  request(id: ReactionId): void;
  hotspot(id: string, kind: HotspotMessage): void;
}

const busSink: TriggerSink = {
  intent: intentHeroReaction,
  request: requestHeroReaction,
  hotspot: heroHotspot,
};

export interface TriggerEnv {
  win?: Window;
  hoverOK?: boolean;
  hotspots?: Readonly<Record<string, ReactionId>>;
}

const hotspotOf = (t: EventTarget | null, frame: HTMLElement) => {
  const el = (t as Element | null)?.closest?.("[data-object]");
  return el && frame.contains(el) ? el.getAttribute("data-object") : null;
};

const focusVisible = (t: EventTarget | null) => {
  try {
    return (t as Element).matches(":focus-visible");
  } catch {
    return true;
  }
};

export function wireTriggers(
  frame: HTMLElement,
  sink: TriggerSink = busSink,
  env: TriggerEnv = {},
): () => void {
  const win = env.win ?? window;
  const doc = win.document;
  const hotspots = env.hotspots ?? HOTSPOT_REACTIONS;
  const hoverOK = env.hoverOK ?? win.matchMedia?.(HOVER_MQ).matches ?? false;
  const off: (() => void)[] = [];
  const on = <K extends string>(
    target: EventTarget,
    type: K,
    fn: (e: Event) => void,
    opts?: AddEventListenerOptions,
  ) => {
    target.addEventListener(type, fn, opts);
    off.push(() => target.removeEventListener(type, fn, opts));
  };

  // Hotspot intent + dwell.
  let current: { id: string; via: "hover" | "focus"; timer: number } | null =
    null;
  let hovering = false;
  let focused = false;
  const cancel = () => {
    if (current) win.clearTimeout(current.timer);
    current = null;
  };
  const enter = (id: string, via: "hover" | "focus") => {
    if (current?.id === id) return;
    cancel();
    const r = hotspots[id];
    // Intent (and so any clip fetch) only once the dwell confirms it, so a
    // quick swipe across a hotspot pulls no media (review N3, PLAN §4).
    const timer = win.setTimeout(() => {
      current = null;
      sink.hotspot(id, "intent");
      if (r) sink.intent(r);
      sink.hotspot(id, "visit");
      if (r) sink.request(r);
    }, TRIGGERS.dwellMs);
    current = { id, via, timer };
  };
  const exit = (via: "hover" | "focus") => {
    if (current?.via === via) cancel();
  };
  const maybeLeave = () => {
    if (!hovering && !focused) sink.hotspot("", "leave");
  };

  if (hoverOK) {
    on(frame, "pointerover", (e) => {
      if ((e as PointerEvent).pointerType === "touch") return;
      const id = hotspotOf(e.target, frame);
      if (id) enter(id, "hover");
      else exit("hover");
    });
  }
  on(frame, "pointerenter", (e) => {
    if ((e as PointerEvent).pointerType !== "touch") hovering = true;
  });
  on(frame, "pointerleave", () => {
    hovering = false;
    exit("hover");
    maybeLeave();
  });
  on(frame, "focusin", (e) => {
    focused = true;
    const id = hotspotOf(e.target, frame);
    if (id && focusVisible(e.target)) enter(id, "focus");
    else exit("focus");
  });
  on(frame, "focusout", (e) => {
    const to = (e as FocusEvent).relatedTarget as Node | null;
    if (to && frame.contains(to)) return;
    focused = false;
    exit("focus");
    maybeLeave();
  });

  // A hidden tab cancels pending dwell. No return reaction until S1b locks.
  on(doc, "visibilitychange", () => {
    if (doc.hidden) cancel();
  });

  // Scene scrolled out of view: "leave" (disarms the E2 egg).
  const IO = (
    win as Window & { IntersectionObserver?: typeof IntersectionObserver }
  ).IntersectionObserver;
  if (IO) {
    let away: boolean | null = null;
    const io = new IO(
      (entries) => {
        const ratio = entries[entries.length - 1]?.intersectionRatio ?? 0;
        const inView = ratio >= TRIGGERS.inViewRatio;
        if (!inView && away === false) sink.hotspot("", "leave");
        away = !inView;
      },
      { threshold: [0, TRIGGERS.inViewRatio] },
    );
    io.observe(frame);
    off.push(() => io.disconnect());
  }

  return () => {
    cancel();
    off.forEach((f) => f());
  };
}
