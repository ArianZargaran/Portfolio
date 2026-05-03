import { useCallback, useSyncExternalStore } from "react";

type MediaQuery =
  | "(max-width: 575px)"
  | "(max-width: 576px)"
  | "(max-width: 768px)"
  | "(max-width: 800px)"
  | "(max-width: 992px)"
  | "(max-width: 1200px)";

const getServerSnapshot = () => false;

export const useMediaQuery = (query: MediaQuery): boolean => {
  const subscribe = useCallback(
    (notify: () => void) => {
      const media = window.matchMedia(query);
      if (typeof media.addEventListener === "function") {
        media.addEventListener("change", notify);
        return () => media.removeEventListener("change", notify);
      }
      media.addListener(notify);
      return () => media.removeListener(notify);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
