import type { RefObject } from "react";
import { useEffect, useRef } from "react";

import { useHeroFreeze } from "~/components/scene/use-hero-freeze";
import { heroFreeze, escAppliesToScene } from "~/scene/hero/freeze";

export const FREEZE_HINT_ID = "scene-freeze-hint";

/** Accessible name of the scene group: says what it is and how to pause. */
export const sceneLabel = (frozen: boolean) =>
  frozen
    ? "Animated scene, paused. Press Enter or Space to play"
    : "Animated scene. Press Enter or Space to pause, or Esc";

/**
 * Wires the WCAG 2.2.2 pause mechanisms onto the scene frame, keyboard
 * only (Ari, Nov 21 2026, t1034u: a click or tap anywhere on the scene
 * never pauses or freezes; hotspots navigate):
 * - Enter or Space while the scene frame itself has focus toggles it;
 * - Esc anywhere on the page pauses (unless a dialog or menu is open), and
 *   turns a network-gate freeze into a keyboard freeze;
 * - N2 (Ari, Nov 22 2026, t1035s5644): a click or tap on the scene (not on
 *   a hotspot link or a button) starts a scene the network gate left
 *   frozen, and does nothing else (freeze.ts `startFromTap`).
 * Freezes made here are stored tagged `v2:keyboard` (freeze.ts).
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
    const onKey = (e: KeyboardEvent) => {
      if (e.target !== frame) return; // keys on a hotspot link stay its own
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault(); // Space would scroll the page
      cb.current(toggle("keyboard"));
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (!escAppliesToScene(document, frame)) return;
      const was = heroFreeze().get();
      setFrozen(true, "keyboard"); // no-op unless playing or gate-frozen
      if (!was) cb.current(true);
    };
    const onClick = (e: MouseEvent) => {
      // Hotspots (links) and buttons keep their own click.
      if ((e.target as Element | null)?.closest?.("a[href], button")) return;
      if (heroFreeze().startFromTap()) cb.current(false);
    };
    frame.addEventListener("keydown", onKey);
    frame.addEventListener("click", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      frame.removeEventListener("keydown", onKey);
      frame.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [enabled, frameRef, setFrozen, toggle]);

  return frozen;
}

/**
 * F1-F2: rendered as the first children of the scene frame when motion
 * runs. Nothing here is visible to pointer users (no pause UI, no hover
 * hint; the old F4 "Click to pause" caption went with click-to-pause).
 * - F1: a native toggle button, visually hidden until it has keyboard focus
 *   (skip-link pattern); aria-pressed=true means "paused". Its activation
 *   is keyboard (Enter/Space) or assistive tech; stored as `v2:keyboard`.
 * - F2: the instructions the scene group points at with aria-describedby.
 * - A polite status message after each user toggle.
 */
export function SceneFreezeControls({
  frozen,
  announcement,
  onToggle,
}: {
  frozen: boolean;
  announcement: string;
  onToggle: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className="scene_pause"
        aria-pressed={frozen}
        onClick={onToggle}
      >
        Pause animation
        <span className="scene_pause-state" aria-hidden="true">
          {" "}
          (paused)
        </span>
      </button>
      <span id={FREEZE_HINT_ID} className="visually-hidden">
        Press Esc, or Enter or Space on the scene, to pause the animation; press
        Enter or Space on the scene again to play. Choose an object to open its
        page.
      </span>
      <span role="status" aria-live="polite" className="visually-hidden">
        {announcement}
      </span>
    </>
  );
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
      onClick={() => toggle("control")}
    >
      Pause animations
    </button>
  );
}
