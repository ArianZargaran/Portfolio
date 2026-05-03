import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useMediaQuery } from "./useMediaQuery";

type MqlListener = (event: { matches: boolean }) => void;

interface MockMql {
  matches: boolean;
  addEventListener: (event: "change", listener: MqlListener) => void;
  removeEventListener: (event: "change", listener: MqlListener) => void;
  addListener: (listener: MqlListener) => void;
  removeListener: (listener: MqlListener) => void;
  dispatch: (matches: boolean) => void;
}

const createMockMql = (initial: boolean): MockMql => {
  const listeners = new Set<MqlListener>();
  const mql: MockMql = {
    matches: initial,
    addEventListener: (_event, listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_event, listener) => {
      listeners.delete(listener);
    },
    addListener: (listener) => {
      listeners.add(listener);
    },
    removeListener: (listener) => {
      listeners.delete(listener);
    },
    dispatch: (matches) => {
      mql.matches = matches;
      listeners.forEach((listener) => listener({ matches }));
    },
  };
  return mql;
};

describe("useMediaQuery", () => {
  let mql: MockMql;
  let matchMediaSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mql = createMockMql(false);
    matchMediaSpy = vi.fn().mockReturnValue(mql);
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: matchMediaSpy,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false on the initial render before the effect runs", () => {
    const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));
    // Effect synchronously updates only when the initial mql.matches differs from state.
    expect(result.current).toBe(false);
  });

  it("syncs to true when matchMedia reports a match on mount", () => {
    mql = createMockMql(true);
    matchMediaSpy.mockReturnValue(mql);

    const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));

    expect(result.current).toBe(true);
    expect(matchMediaSpy).toHaveBeenCalledWith("(max-width: 768px)");
  });

  it("updates when the media query changes after mount", () => {
    const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));

    expect(result.current).toBe(false);

    act(() => {
      mql.dispatch(true);
    });
    expect(result.current).toBe(true);

    act(() => {
      mql.dispatch(false);
    });
    expect(result.current).toBe(false);
  });

  it("falls back to addListener / removeListener when addEventListener is missing", () => {
    const legacyMql = createMockMql(false);
    // Remove the modern API to exercise the legacy branch.
    (legacyMql as Partial<MockMql>).addEventListener = undefined;
    (legacyMql as Partial<MockMql>).removeEventListener = undefined;
    matchMediaSpy.mockReturnValue(legacyMql);

    const { result, unmount } = renderHook(() =>
      useMediaQuery("(max-width: 768px)"),
    );

    act(() => {
      legacyMql.dispatch(true);
    });
    expect(result.current).toBe(true);

    // Should not throw on cleanup even on the legacy path.
    expect(() => unmount()).not.toThrow();
  });

  it("removes its listener on unmount", () => {
    const removeSpy = vi.spyOn(mql, "removeEventListener");
    const { unmount } = renderHook(() =>
      useMediaQuery("(max-width: 768px)"),
    );

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
