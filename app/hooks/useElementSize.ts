import { useState, useEffect, useRef } from "react";

interface Dimensions {
  width: number;
  height: number;
}

export const useElementSize = <T extends HTMLDivElement | SVGSVGElement>() => {
  const ref = useRef<T | null>(null);
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
  });

  // Function to handle HTML element dimensions
  const getHtmlDimensions = (element: HTMLElement): Dimensions => ({
    width: element.clientWidth,
    height: element.clientHeight,
  });

  // Function to handle SVG element dimensions
  const getSvgDimensions = (element: SVGSVGElement): Dimensions => {
    const box = element.getBBox(); // Returns the bounding box of the SVG element
    return { width: box.width, height: box.height };
  };

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

    // Observe size changes
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(element);

    // Initial size
    updateSize();

    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref, dimensions };
};
