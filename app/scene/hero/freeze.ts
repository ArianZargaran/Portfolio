/**
 * Shared freeze state for the hero motion (WCAG 2.2.2 Pause, Stop, Hide).
 *
 * One store per page. Every pause mechanism (the scene background, the
 * focus-revealed pause button, Esc, and later the F5 footer link) toggles
 * this one state, and the player and the reaction queue read it. Freeze
 * is an instant stop: the player holds the current frame, with no easing.
 *
 * F3: the state is persisted in localStorage under FREEZE_STORAGE_KEY, so it
 * survives reloads and route changes. If storage is unavailable (private
 * mode, quota, SSR), the state lives in memory for this page only.
 */

export const FREEZE_STORAGE_KEY = "hero:frozen";

export interface FreezeStore {
  get(): boolean;
  set(frozen: boolean): void;
  /**
   * Freeze for this page only, without writing storage (the network gate's
   * "inconclusive -> start frozen", M7). Playing afterwards clears it.
   */
  freezeForPage(): void;
  toggle(): boolean;
  /** Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

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
    frozen = storage?.getItem(FREEZE_STORAGE_KEY) === "1";
  } catch {
    frozen = false;
  }
  const listeners = new Set<() => void>();
  const store: FreezeStore = {
    get: () => frozen,
    set(next) {
      if (next === frozen) return;
      frozen = next;
      try {
        if (next) storage?.setItem(FREEZE_STORAGE_KEY, "1");
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
    toggle() {
      store.set(!frozen);
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

/**
 * Elements inside the scene that keep their own click/keyboard behaviour.
 * A click whose target is (inside) one of these never toggles freeze, so
 * the hotspot links navigate exactly as before.
 */
export const INTERACTIVE_SELECTOR =
  "a[href], button, input, select, textarea, summary, [role='button'], [role='link'], [data-scene-own-click]";

/** True when a click/tap on `target` is a click on the scene background. */
export function isBackgroundActivation(
  target: EventTarget | null,
  scene: Element,
): boolean {
  if (!(target instanceof Element) || !scene.contains(target)) return false;
  const own = target.closest(INTERACTIVE_SELECTOR);
  return !own || !scene.contains(own);
}

/** Esc must not steal the key from an open dialog or menu. */
export function overlayOpen(doc: Document): boolean {
  return !!doc.querySelector(
    "dialog[open], [aria-modal='true'], [role='menu']:not([hidden])",
  );
}
