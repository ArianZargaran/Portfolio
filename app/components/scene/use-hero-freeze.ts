import { useCallback, useSyncExternalStore } from "react";

import { heroFreeze } from "~/scene/hero/freeze";

const subscribe = (l: () => void) => heroFreeze().subscribe(l);
const getSnapshot = () => heroFreeze().get();
/* SSR and hydration always render "playing"; the stored state applies right
   after hydration (the player isn't mounted before then anyway). */
const getServerSnapshot = () => false;

/** The page's shared freeze state, plus setters (see scene/hero/freeze.ts). */
export function useHeroFreeze() {
  const frozen = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const setFrozen = useCallback((v: boolean) => heroFreeze().set(v), []);
  const toggle = useCallback(() => heroFreeze().toggle(), []);
  return { frozen, setFrozen, toggle };
}
