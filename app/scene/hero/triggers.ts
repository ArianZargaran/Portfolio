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
 * - Idle 20 s (no pointer, key, wheel or scroll on the page): bounce, once
 *   per idle period.
 * - 45 s on the page: sip, once.
 * - Tab back after at least 30 s hidden, or the scene back in view (at
 *   least half visible) after being scrolled away: bounce.
 * - Pointer and focus both out of the scene: "leave" (disarms the E2 egg).
 *
 * Requests without a clip (speaker, phone, sip today) are refused by the
 * queue as "unknown"; they start working when their clips are registered.
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
  speakers: "speaker",
  phone: "phone",
};

export const TRIGGERS = {
  dwellMs: 250,
  idleS: 20,
  timeOnPageS: 45,
  tabReturnS: 30,
  inViewRatio: 0.5,
  idleReaction: "bounce",
  timeOnPageReaction: "sip",
  returnReaction: "bounce",
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
  now?: () => number;
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
  const now = env.now ?? (() => win.performance.now());
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

  // Idle: one bounce per idle period.
  let idleTimer = 0;
  const armIdle = () => {
    win.clearTimeout(idleTimer);
    idleTimer = win.setTimeout(
      () => sink.request(TRIGGERS.idleReaction),
      TRIGGERS.idleS * 1000,
    );
  };
  for (const type of [
    "pointermove",
    "pointerdown",
    "keydown",
    "wheel",
    "scroll",
  ])
    on(win, type, armIdle, { passive: true, capture: true });
  armIdle();
  off.push(() => win.clearTimeout(idleTimer));

  // Time on page.
  const pageTimer = win.setTimeout(
    () => sink.request(TRIGGERS.timeOnPageReaction),
    TRIGGERS.timeOnPageS * 1000,
  );
  off.push(() => win.clearTimeout(pageTimer));

  // Tab return.
  let hiddenAt: number | null = doc.hidden ? now() : null;
  on(doc, "visibilitychange", () => {
    if (doc.hidden) {
      hiddenAt = now();
      cancel();
    } else if (hiddenAt !== null) {
      if (now() - hiddenAt >= TRIGGERS.tabReturnS * 1000)
        sink.request(TRIGGERS.returnReaction);
      hiddenAt = null;
    }
  });

  // Back in view after being scrolled away.
  const IO = (
    win as Window & { IntersectionObserver?: typeof IntersectionObserver }
  ).IntersectionObserver;
  if (IO) {
    let away: boolean | null = null;
    const io = new IO(
      (entries) => {
        const ratio = entries[entries.length - 1]?.intersectionRatio ?? 0;
        const inView = ratio >= TRIGGERS.inViewRatio;
        if (inView && away) sink.request(TRIGGERS.returnReaction);
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
