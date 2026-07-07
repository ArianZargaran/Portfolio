/** Fixed-window rate limiter. A factory (not a module-level singleton)
    so each call site gets its own isolated counter — the chat route wraps
    one instance in `singleton()` to persist it across requests within a
    single server process; tests instantiate their own to avoid shared state. */
export const createRateLimiter = (limit: number, windowMs: number) => {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    check: (key: string): boolean => {
      const now = Date.now();
      const entry = hits.get(key);

      if (!entry || now >= entry.resetAt) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }

      if (entry.count >= limit) return false;

      entry.count += 1;
      return true;
    },
  };
};
