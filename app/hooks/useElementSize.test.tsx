import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useElementSize } from "./useElementSize";

type ResizeCallback = (entries: ResizeObserverEntry[]) => void;

interface MockObserver {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  trigger: () => void;
}

const observers: MockObserver[] = [];

class MockResizeObserver {
  private callback: ResizeCallback;
  observe = vi.fn();
  disconnect = vi.fn();

  constructor(callback: ResizeCallback) {
    this.callback = callback;
    observers.push({
      observe: this.observe,
      disconnect: this.disconnect,
      trigger: () => this.callback([]),
    });
  }
}

const HtmlProbe = ({
  onReady,
}: {
  onReady: (dims: { width: number; height: number }) => void;
}) => {
  const { ref, dimensions } = useElementSize<HTMLDivElement>();
  useEffect(() => {
    onReady(dimensions);
  }, [dimensions, onReady]);
  return <div ref={ref} data-testid="probe" />;
};

const SvgProbe = ({
  onReady,
}: {
  onReady: (dims: { width: number; height: number }) => void;
}) => {
  const { ref, dimensions } = useElementSize<SVGSVGElement>();
  useEffect(() => {
    onReady(dimensions);
  }, [dimensions, onReady]);
  return (
    <svg
      ref={ref}
      data-testid="probe"
      width={120}
      height={60}
      xmlns="http://www.w3.org/2000/svg"
    />
  );
};

describe("useElementSize", () => {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads clientWidth/clientHeight for HTML elements on mount", () => {
    const onReady = vi.fn();
    render(<HtmlProbe onReady={onReady} />);
    const div = screen.getByTestId("probe") as HTMLElement;

    Object.defineProperty(div, "clientWidth", { value: 320, configurable: true });
    Object.defineProperty(div, "clientHeight", { value: 180, configurable: true });

    act(() => {
      observers[0].trigger();
    });

    expect(onReady).toHaveBeenLastCalledWith({ width: 320, height: 180 });
  });

  it("uses getBBox for SVG elements", () => {
    const onReady = vi.fn();
    render(<SvgProbe onReady={onReady} />);
    const svg = screen.getByTestId("probe") as unknown as SVGSVGElement;

    (svg as SVGSVGElement & { getBBox: () => DOMRect }).getBBox = () =>
      ({ width: 200, height: 100 }) as DOMRect;

    act(() => {
      observers[0].trigger();
    });

    expect(onReady).toHaveBeenLastCalledWith({ width: 200, height: 100 });
  });

  it("registers a ResizeObserver against the element and disconnects on unmount", () => {
    const noop = vi.fn();
    const { unmount } = render(<HtmlProbe onReady={noop} />);

    expect(observers).toHaveLength(1);
    expect(observers[0].observe).toHaveBeenCalledTimes(1);

    unmount();

    expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
  });
});
