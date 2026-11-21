/**
 * Shared freeze state for the hero motion (WCAG 2.2.2 Pause, Stop, Hide).
 *
 * One store per page. Every pause mechanism (Enter/Space on the focused
 * scene group, the focus-revealed pause button, Esc, and later the F5
 * footer link) toggles this one state, and the player and the reaction
 * queue read it. Freeze is an instant stop: the player holds the current
 * frame, with no easing. A click or tap on the scene never pauses (Ari,
 * Nov 21 2026, t1034u): the pause is keyboard-first (WCAG 2.2.2).
 *
 * F3: the state is persisted in localStorage under FREEZE_STORAGE_KEY, so it
 * survives reloads and route changes. If storage is unavailable (private
 * mode, quota, SSR), the state lives in memory for this page only.
 *
 * Storage v2 (tagged values). The key is unchanged; the value says how the
 * freeze was made: `v2:keyboard` (scene group, Esc, the F1 button) or
 * `v2:control` (the F5 control outside the scene). Only tagged v2 values
 * are honoured. The v1 value `"1"` is untagged: the old build wrote it for
 * a background click as well as for the keyboard and can't tell them apart,
 * so on first read it is treated as a legacy click freeze and removed (the
 * visitor gets motion back; a keyboard user re-pauses once with Esc, which
 * is then stored tagged). Any other unknown value is removed the same way.
 */

export const FREEZE_STORAGE_KEY = "hero:frozen";
/** How a persisted freeze was made (storage v2 tag). */
export type FreezeSource = "keyboard" | "control";
export const FREEZE_SOURCES: readonly FreezeSource[] = ["keyboard", "control"];
/** v2 stored value for a freeze made by `source`. */
export const freezeValue = (source: FreezeSource) => `v2:${source}`;
/** The untagged v1 value (click or keyboard; cleared on read). */
export const LEGACY_FREEZE_VALUE = "1";

/** Reads (and migrates) the stored freeze: true only for a tagged v2 value. */
export function readStoredFreeze(storage: StorageLike | undefined): boolean {
  const v = storage?.getItem(FREEZE_STORAGE_KEY);
  if (v === null || v === undefined) return false;
  if (FREEZE_SOURCES.some((s) => v === freezeValue(s))) return true;
  storage?.removeItem(FREEZE_STORAGE_KEY); // v1 "1" (a click freeze) or junk
  return false;
}

export interface FreezeStore {
  get(): boolean;
  /** `source` tags a persisted freeze (storage v2); default keyboard. */
  set(frozen: boolean, source?: FreezeSource): void;
  /**
   * Freeze for this page only, without writing storage (the network gate's
   * "inconclusive -> start frozen", M7). Playing afterwards clears it.
   */
  freezeForPage(): void;
  toggle(source?: FreezeSource): boolean;
  /** Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function safeStorage(): StorageLike | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined; // e.g. storage disabled by policy
  }
}

export function createFreezeStore(
  storage: StorageLike | undefined = safeStorage(),
): FreezeStore {
  let frozen = false;
  try {
    frozen = readStoredFreeze(storage);
  } catch {
    frozen = false;
  }
  const listeners = new Set<() => void>();
  const store: FreezeStore = {
    get: () => frozen,
    set(next, source = "keyboard") {
      if (next === frozen) return;
      frozen = next;
      try {
        if (next) storage?.setItem(FREEZE_STORAGE_KEY, freezeValue(source));
        else storage?.removeItem(FREEZE_STORAGE_KEY);
      } catch {
        /* in-memory only */
      }
      listeners.forEach((l) => l());
    },
    freezeForPage() {
      if (frozen) return;
      frozen = true;
      listeners.forEach((l) => l());
    },
    toggle(source) {
      store.set(!frozen, source);
      return frozen;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return store;
}

let pageStore: FreezeStore | undefined;
/** The page's shared store (created lazily on the client). */
export function heroFreeze(): FreezeStore {
  pageStore ??= createFreezeStore();
  return pageStore;
}
/** Tests only: drop the page store so the next call re-reads storage. */
export function resetHeroFreezeForTests(): void {
  pageStore = undefined;
}

/** Esc must not steal the key from an open dialog, menu or popup. */
export function overlayOpen(doc: Document): boolean {
  return !!doc.querySelector(
    "dialog[open], [aria-modal='true'], [role='menu']:not([hidden]), [role='listbox']:not([hidden]), [aria-expanded='true']",
  );
}

/** Focus targets that own Esc themselves (form controls and composite widgets). */
export const ESC_OWNER_SELECTOR =
  "input, select, textarea, [contenteditable]:not([contenteditable='false']), dialog, [role='dialog'], [role='alertdialog'], [role='combobox'], [role='listbox'], [role='menu'], [role='menubar'], [role='menuitem'], [role='option'], [role='textbox'], [role='searchbox'], [role='slider'], [role='spinbutton'], [role='grid'], [role='tree'], [role='tablist'], [role='tab'], [aria-modal='true']";

/**
 * Esc pauses the scene only when the scene or the page itself has focus
 * (review N7): focus on the body, inside the scene (frame, hotspots, F1), or
 * on a plain link or button elsewhere. Never while focus is in a form
 * control, dialog or other widget, or while any overlay is open.
 */
export function escAppliesToScene(
  doc: Document,
  scene: Element | null,
): boolean {
  if (overlayOpen(doc)) return false;
  const active = doc.activeElement;
  if (!active || active === doc.body || active === doc.documentElement)
    return true;
  if (active.closest(ESC_OWNER_SELECTOR)) return false;
  if (scene?.parentElement?.contains(active)) return true;
  return active.matches("a[href], button");
}
