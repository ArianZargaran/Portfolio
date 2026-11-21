import { useCallback, useSyncExternalStore } from "react";

import { heroFreeze, type FreezeSource } from "~/scene/hero/freeze";

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
  const setFrozen = useCallback(
    (v: boolean, source?: FreezeSource) => heroFreeze().set(v, source),
    [],
  );
  const toggle = useCallback(
    (source?: FreezeSource) => heroFreeze().toggle(source),
    [],
  );
  return { frozen, setFrozen, toggle };
}
