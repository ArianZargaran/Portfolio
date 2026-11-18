import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";

import { useHeroFreeze } from "~/components/scene/use-hero-freeze";
import {
  heroFreeze,
  isBackgroundActivation,
  overlayOpen,
} from "~/scene/hero/freeze";

export const FREEZE_HINT_ID = "scene-freeze-hint";
const HINT_SEEN_KEY = "hero:freeze-hint-seen";
const HINT_MS = 2000;

/** Accessible name of the scene group: says what it is and how to pause. */
export const sceneLabel = (frozen: boolean) =>
  frozen
    ? "Animated scene, paused. Press Enter or Space to play"
    : "Animated scene. Press Enter or Space to pause, or Esc";

/**
 * Wires the WCAG 2.2.2 pause mechanisms onto the scene frame:
 * - a click or tap on the background (not on a hotspot link or a button)
 *   toggles freeze; hotspots keep navigating as before;
 * - Enter or Space while the scene frame itself has focus toggles it;
 * - Esc anywhere on the page pauses (unless a dialog or menu is open).
 * Freeze is an instant stop (the player holds the current frame).
 */
export function useSceneFreezeHandlers(
  frameRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  onToggled: (frozen: boolean) => void,
) {
  const { frozen, setFrozen, toggle } = useHeroFreeze();
  const cb = useRef(onToggled);
  cb.current = onToggled;

  useEffect(() => {
    const frame = frameRef.current;
    if (!enabled || !frame) return;
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!isBackgroundActivation(e.target, frame)) return;
      if (window.getSelection?.()?.toString()) return; // selecting text
      cb.current(toggle());
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.target !== frame) return; // keys on a hotspot link stay its own
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault(); // Space would scroll the page
      cb.current(toggle());
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (overlayOpen(document) || heroFreeze().get()) return;
      setFrozen(true);
      cb.current(true);
    };
    frame.addEventListener("click", onClick);
    frame.addEventListener("keydown", onKey);
    document.addEventListener("keydown", onEsc);
    return () => {
      frame.removeEventListener("click", onClick);
      frame.removeEventListener("keydown", onKey);
      document.removeEventListener("keydown", onEsc);
    };
  }, [enabled, frameRef, setFrozen, toggle]);

  return frozen;
}

/**
 * F1-F2 (and the F4 hook): rendered as the first children of the scene
 * frame when motion runs.
 * - F1: a native toggle button, visually hidden until it has keyboard focus
 *   (skip-link pattern); aria-pressed=true means "paused".
 * - F2: the instructions the scene group points at with aria-describedby.
 * - A polite status message after each user toggle.
 * - F4 (flag, off by default): a brief "Click to pause" caption the first
 *   time the pointer enters the scene, once per visitor.
 */
export function SceneFreezeControls({
  frozen,
  announcement,
  onToggle,
  frameRef,
  hint = false,
}: {
  frozen: boolean;
  announcement: string;
  onToggle: () => void;
  frameRef: RefObject<HTMLElement | null>;
  hint?: boolean;
}) {
  const showHint = useFirstHoverHint(frameRef, hint && !frozen);
  return (
    <>
      <button
        type="button"
        className="scene_pause"
        aria-pressed={frozen}
        onClick={onToggle}
      >
        Pause animation
      </button>
      <span id={FREEZE_HINT_ID} className="visually-hidden">
        Click the scene background or press Esc to pause the animation; click it
        again, or press Enter or Space on the scene, to play. Choose an object
        to open its page.
      </span>
      <span role="status" aria-live="polite" className="visually-hidden">
        {announcement}
      </span>
      {showHint ? (
        <span className="scene_freeze-hint" aria-hidden="true">
          Click to pause
        </span>
      ) : null}
    </>
  );
}

/** F4 hook: true for HINT_MS after the pointer first enters the frame. */
function useFirstHoverHint(
  frameRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const frame = frameRef.current;
    if (!enabled || !frame) return;
    let timer: number | undefined;
    const seen = () => {
      try {
        return window.localStorage.getItem(HINT_SEEN_KEY) === "1";
      } catch {
        return false;
      }
    };
    const onEnter = () => {
      if (seen()) return;
      try {
        window.localStorage.setItem(HINT_SEEN_KEY, "1");
      } catch {
        /* show once per page instead */
      }
      frame.removeEventListener("pointerenter", onEnter);
      setShow(true);
      timer = window.setTimeout(() => setShow(false), HINT_MS);
    };
    frame.addEventListener("pointerenter", onEnter);
    return () => {
      frame.removeEventListener("pointerenter", onEnter);
      window.clearTimeout(timer);
    };
  }, [enabled, frameRef]);
  return show;
}

/**
 * F5 hook (flag, off by default): a "Pause animations" control outside the
 * scene that toggles the same shared freeze state. A <button>, since it
 * changes state rather than navigating.
 */
export function PauseAnimationsControl() {
  const { frozen, toggle } = useHeroFreeze();
  return (
    <button
      type="button"
      className="scene_pause-link"
      aria-pressed={frozen}
      onClick={() => toggle()}
    >
      Pause animations
    </button>
  );
}
