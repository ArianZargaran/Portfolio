import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createRateLimiter } from "./rate-limit.server";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createRateLimiter", () => {
  it("allows requests up to the limit", () => {
    const limiter = createRateLimiter(3, 60_000);
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("a")).toBe(true);
  });

  it("blocks once the limit is exceeded within the window", () => {
    const limiter = createRateLimiter(3, 60_000);
    limiter.check("a");
    limiter.check("a");
    limiter.check("a");
    expect(limiter.check("a")).toBe(false);
  });

  it("tracks each key independently", () => {
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("b")).toBe(true);
    expect(limiter.check("a")).toBe(false);
  });

  it("resets once the window elapses", () => {
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("a")).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(limiter.check("a")).toBe(true);
  });
});
