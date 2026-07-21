import classnames from "classnames";
import React, { useEffect, useRef, useState } from "react";

import "./work-grid.css";
import { WorkCardTile } from "./work-card";
import { WORK_ROWS } from "~/constants/work-cards";

/* Every card runs its own independent lifecycle — there is no auto-close and
   no card-to-card switching: any number of cards can be open at once, and a
   card only closes when the user closes it.

   Opening and closing are exact mirrors of each other, run in the opposite
   order, because flexbox cannot animate an item moving between wrap lines —
   an item must be fully invisible before the line it's leaving/joining
   reflows, or it visibly snaps mid-flight. Five phases:

   vacating  — (open) row-mates shrink toward the gutter, invisible, BEFORE
               this card claims the line.
   open      — full-width line, body open; row-mates sit relocated on the
               line(s) below, at rest.
   closing   — (close, mirrors open) body exits; nothing about width or
               row-mates changes yet — the row-mates stay exactly as they
               are while the body animates away first. The step out of this
               phase is primarily driven by Framer's real onExitComplete
               event rather than a matching timer — a duration guess kept
               racing the actual animation (it starts a frame or two late),
               which made the body's disappearance and the row's
               rearrangement overlap instead of running as two clean,
               separate beats. But that event depends on the animation
               actually running to completion, and browsers can suspend
               CSS/WAAPI animations entirely while a tab is backgrounded
               (switching tabs, a notification, even some screen-recording
               focus changes) — onExitComplete then never fires, and without
               a bound the row hangs in "closing" indefinitely. BODY_EXIT_FALLBACK_MS
               is that bound: a generous timer that only matters if the real
               event doesn't arrive first.
   leaving   — (close, mirrors vacating) row-mates shrink toward invisible
               IN PLACE, while this card is still pinned full-width — so by
               the time the line actually reflows, nothing on it is
               mid-transition.
   settling  — the atomic step: this card's pinned width is released (the
               row reflows to one line) and row-mates simultaneously play
               their reappear-on-this-line animation, in the same commit —
               nothing changes state without also getting a corresponding
               animation to ride, which is what removes the blink.
*/
type Phase = "vacating" | "open" | "closing" | "leaving" | "settling";

const VACATE_MS = 350; // row-mate shrink/reappear transition duration
const SETTLE_MS = 300; // matches the sibling's reenter transition duration
/* How long the closing card's own "is-settling-dip" class stays on before
   being lifted again — short on purpose. The dip only needs to exist long
   enough for the opacity/transform transition to visibly start moving
   before reversing course back to normal; a full dip-and-hold would look
   like its own separate beat instead of a single soft "settle" flourish
   synced with the atomic width snap. See work-card.css for why this exists. */
const SETTLE_DIP_MS = 90;
/* Safety net for the body's onExitComplete event — see the "closing" note
   above. Comfortably longer than the body's real ~300ms exit so it never
   fires first in the normal case; only matters if the tab was backgrounded
   and the real event never arrives. */
const BODY_EXIT_FALLBACK_MS = 900;

export const WorkGrid: React.FC = () => {
  const [phases, setPhases] = useState<Record<string, Phase>>({});
  /* Set for exactly one short beat when a card enters "settling" — see
     is-settling-dip in work-card.css. A plain window.setTimeout (not the
     shared schedule()/timers bookkeeping below) because it's cosmetic only
     and keyed independently of the real phase-advance timer already
     scheduled for the same id at that same moment. */
  const [dipping, setDipping] = useState<Record<string, boolean>>({});
  const timers = useRef<Record<string, number>>({});
  /* Mirrors `phases` synchronously for the onBodyExitComplete callback,
     which fires from Framer's own event loop — by the time it runs, the
     closure from render may be stale, so it reads this ref instead of
     capturing `phases` directly. */
  const phasesRef = useRef<Record<string, Phase>>({});
  phasesRef.current = phases;

  const clearCardTimer = (id: string) => {
    if (timers.current[id] !== undefined) {
      window.clearTimeout(timers.current[id]);
      const { [id]: _, ...rest } = timers.current;
      timers.current = rest;
    }
  };

  const schedule = (id: string, ms: number, fn: () => void) => {
    clearCardTimer(id);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timeout = window.setTimeout(
      () => {
        const { [id]: _, ...rest } = timers.current;
        timers.current = rest;
        fn();
      },
      reducedMotion ? 0 : ms,
    );
    timers.current = { ...timers.current, [id]: timeout };
  };

  const setCardPhase = (id: string, phase: Phase | null) => {
    setPhases((prev) => {
      if (phase === null) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: phase };
    });
  };

  const openCard = (id: string) => {
    setCardPhase(id, "vacating");
    schedule(id, VACATE_MS, () => setCardPhase(id, "open"));
  };

  const startLeaving = (id: string) => {
    setCardPhase(id, "leaving");
    schedule(id, VACATE_MS, () => {
      setCardPhase(id, "settling");
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (!reducedMotion) {
        setDipping((prev) => ({ ...prev, [id]: true }));
        window.setTimeout(() => {
          setDipping((prev) => {
            const { [id]: _, ...rest } = prev;
            return rest;
          });
        }, SETTLE_DIP_MS);
      }
      schedule(id, SETTLE_MS, () => setCardPhase(id, null));
    });
  };

  const closeCard = (id: string, fromOpen: boolean) => {
    if (fromOpen) {
      setCardPhase(id, "closing");
      /* Fallback timer alongside the real onExitComplete event (below) —
         whichever fires first wins. Framer's event depends on the exit
         animation actually running, which browsers can suspend entirely
         while the tab is backgrounded; without this bound, a card closed
         right before losing focus would sit permanently mid-collapse. */
      schedule(id, BODY_EXIT_FALLBACK_MS, () => startLeaving(id));
    } else {
      startLeaving(id);
    }
  };

  /* Fired by the card whose body just finished its exit animation for
     real — the primary, prompt signal that it's safe to rearrange the row.
     Guarded against stale firings via phasesRef: once either this or the
     fallback timer above has already moved the phase past "closing", the
     other one's callback finds phase no longer "closing" and becomes a
     no-op — the two paths can't both take effect. */
  const handleBodyExitComplete = (id: string) => {
    if (phasesRef.current[id] === "closing") {
      startLeaving(id);
    }
  };

  /* Only the two STABLE rest states are toggleable: undefined (fully closed)
     and "open" (fully open, body showing). Every other phase — vacating,
     closing, leaving, settling — is mid-transition, and a click landing
     during one used to get misrouted: handleToggle only ever distinguished
     "closed" from "everything else", so a re-expand click that arrived
     while a card was still "leaving" (mid-collapse) read as "currently
     open, close it again" and silently restarted the close chain instead
     of reversing it — the card would end up in the wrong final state, with
     the row-mate left stuck on a stale is-relocated class at opacity 0
     until something else nudged it. Rather than build genuine
     mid-animation reversal (real complexity, easy to get subtly wrong
     again), a click during any transient phase is simply ignored — the
     control settles before it accepts the next input, same as many native
     animated toggles. */
  const handleToggle = (id: string) => {
    const current = phases[id];
    if (current === undefined) {
      openCard(id);
      return;
    }
    if (current === "open") {
      closeCard(id, true);
    }
  };

  useEffect(() => {
    const active = timers.current;
    return () => {
      Object.values(active).forEach((t) => window.clearTimeout(t));
    };
  }, []);

  /* Scroll rides along with each newly-opened card's body animation; the
     card's top edge is stable while the body grows downward. Closing a card
     never scrolls — the reader stays where they are. */
  const openIds = Object.keys(phases).filter((id) => phases[id] === "open");
  const lastOpened = openIds[openIds.length - 1];
  useEffect(() => {
    if (!lastOpened) return;
    const el = document.querySelector(`[data-work-card="${lastOpened}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [lastOpened]);

  const anyActive = Object.keys(phases).length > 0;

  return (
    <div data-testid="work-grid" className="work-grid">
      {WORK_ROWS.map((row, rowIdx) => {
        const rowPhases = row.map((card) => phases[card.id]);
        const rowHasActive = rowPhases.some((p) => p !== undefined);
        /* Row-mates shrink (is-vacating) whenever some card in the row is
           actively claiming OR giving back the line — the two moments a
           line's contents are about to reflow and must already be
           invisible. They sit at rest (is-relocated) whenever some card is
           steadily holding the line (open/closing) or has just released it
           (settling, where the reenter transition plays). */
        const anyClaimingOrReturning = rowPhases.some(
          (p) => p === "vacating" || p === "leaving",
        );
        const anyHoldingOrReleasing = rowPhases.some(
          (p) => p === "open" || p === "closing" || p === "settling",
        );
        return (
          <ul
            key={rowIdx}
            data-testid="work-row"
            className={classnames("work-row", {
              "is-active-row": rowHasActive,
            })}
          >
            {row.map((card) => {
              const phase = phases[card.id];
              const isSibling = phase === undefined && rowHasActive;
              return (
                <WorkCardTile
                  key={card.id}
                  card={card}
                  isExpanded={
                    phase === "open" ||
                    phase === "vacating" ||
                    phase === "closing" ||
                    phase === "leaving"
                  }
                  anyExpanded={anyActive}
                  showBody={phase === "open"}
                  stateClass={classnames({
                    /* Pinned full-width and static through open, closing,
                       and leaving — released only at settling, in the same
                       commit the row-mate's reenter animation starts. */
                    "is-expanded":
                      phase === "open" ||
                      phase === "closing" ||
                      phase === "leaving",
                    "is-vacating": isSibling && anyClaimingOrReturning,
                    "is-relocated":
                      isSibling &&
                      !anyClaimingOrReturning &&
                      anyHoldingOrReleasing,
                    "is-settling-dip": dipping[card.id] === true,
                  })}
                  onBodyExitComplete={() => handleBodyExitComplete(card.id)}
                  onToggle={() => handleToggle(card.id)}
                />
              );
            })}
          </ul>
        );
      })}
    </div>
  );
};
