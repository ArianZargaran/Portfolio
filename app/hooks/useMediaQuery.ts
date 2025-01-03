import { useEffect, useState } from "react";

type MediaQuery =
  | "(max-width: 575px)"
  | "(max-width: 576px)"
  | "(max-width: 768px)"
  | "(max-width: 992px)"
  | "(max-width: 1200px)";

export const useMediaQuery = (query: MediaQuery) => {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => {
      setMatches(media.matches);
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", listener);
    } else {
      media.addListener(listener);
    }

    return () => {
      if (typeof media.removeEventListener === "function") {
        media.removeEventListener("change", listener);
      } else {
        media.removeListener(listener);
      }
    };
  }, [matches, query]);

  return matches;
};
