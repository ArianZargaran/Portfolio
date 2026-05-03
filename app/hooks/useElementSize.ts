import { useState, useEffect, useRef } from "react";

interface Dimensions {
  width: number;
  height: number;
}

const getHtmlDimensions = (element: HTMLElement): Dimensions => ({
  width: element.clientWidth,
  height: element.clientHeight,
});

const getSvgDimensions = (element: SVGSVGElement): Dimensions => {
  const box = element.getBBox();
  return { width: box.width, height: box.height };
};

export const useElementSize = <T extends HTMLDivElement | SVGSVGElement>() => {
  const ref = useRef<T | null>(null);
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateSize = () => {
      if (element instanceof SVGSVGElement) {
        setDimensions(getSvgDimensions(element));
      } else if (element instanceof HTMLElement) {
        setDimensions(getHtmlDimensions(element));
      }
    };

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    updateSize();

    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref, dimensions };
};
