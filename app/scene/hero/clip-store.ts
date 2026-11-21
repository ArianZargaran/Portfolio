/**
 * Fetch-once store for hero clips (change 2, per-clip byte counting).
 *
 * Every hero clip is downloaded with ONE fetch() into an in-memory Blob and
 * played from its object URL. A <video> playing a blob: URL never goes back
 * to the network: not when it loops, not when it is replayed later in the
 * visit, not after a long idle, and not with the browser's HTTP cache
 * disabled. So the bytes on the wire per visit are exactly the bytes of the
 * clips fetched (each once), which is what budget.ts charges, and the
 * per-visit cap (768,000 B AV1 / 993,280 B H.264) holds with the cache on
 * or off. (Before, the <video> elements streamed from the asset URLs and a
 * reused clip could be re-downloaded when the cache was off: 817 kB /
 * 1.08 MB measured on the 7c6ea46 preview.)
 *
 * A fetch can be aborted (change 3: a queued reaction replaced before it
 * plays). `received` counts the body bytes that actually arrived, so the
 * budget can keep charging exactly what crossed the wire.
 */

export type ClipFetchState = "fetching" | "done" | "aborted" | "failed";

/** Link speed seen by one finished download (review N1: adaptive lead). */
export interface LinkEstimate {
  /** Body bits per second, from first response byte to the end. */
  bps: number;
  /** fetch() call to response headers (round trip + server), ms. */
  ttfbMs: number;
}

// Wall clock, not performance.now(): the link estimate times a network
// download, and the hero clock (and test harnesses) may pin or virtualise
// performance.now(). Millisecond resolution is plenty for clip downloads.
const now = () => Date.now();

interface Entry {
  state: ClipFetchState;
  /** Body bytes received so far. */
  received: number;
  t0?: number;
  tHeaders?: number;
  tEnd?: number;
  url?: string;
  ctrl: AbortController;
  promise: Promise<string>;
}

export interface ClipStore {
  /** Starts (or joins) the single fetch of `src`; resolves to its object URL. */
  load(src: string, type: string): Promise<string>;
  state(src: string): ClipFetchState | undefined;
  /** Object URL once the fetch is done. */
  url(src: string): string | undefined;
  /** Body bytes received for `src` (so far, or in total). */
  received(src: string): number;
  /**
   * Aborts an in-flight fetch. Returns the bytes that had arrived (0 if the
   * fetch was not in flight). A later load() starts a new fetch.
   */
  abort(src: string): number;
  /**
   * Frees a finished clip that turned out to be unusable (the AV1 loop that
   * won't decode, review N6): revokes its object URL. Its bytes stay
   * counted by the caller's budget.
   */
  release(src: string): void;
  /**
   * Throughput and round trip of a finished download, if measurable
   * (undefined for an instant one, e.g. served from memory or a frozen
   * test clock).
   */
  link(src: string): LinkEstimate | undefined;
  /** Number of fetch() calls made (tests / data-fetches). */
  readonly fetches: number;
  /** Aborts everything and revokes every object URL. */
  dispose(): void;
}

export function createClipStore(
  fetchImpl: typeof fetch = (input, init) => fetch(input, init),
): ClipStore {
  const entries = new Map<string, Entry>();
  let fetches = 0;

  const run = async (src: string, type: string, e: Entry): Promise<string> => {
    e.t0 = now();
    const res = await fetchImpl(src, {
      signal: e.ctrl.signal,
      credentials: "same-origin",
    });
    e.tHeaders = now();
    if (!res.ok) throw new Error(`hero clip ${res.status}`);
    const parts: BlobPart[] = [];
    if (res.body) {
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        e.received += value.byteLength;
        parts.push(value);
      }
    } else {
      const b = await res.blob();
      e.received += b.size;
      parts.push(b);
    }
    if (e.ctrl.signal.aborted) throw new DOMException("aborted", "AbortError");
    e.tEnd = now();
    return URL.createObjectURL(new Blob(parts, { type }));
  };

  return {
    load(src, type) {
      const old = entries.get(src);
      if (old && (old.state === "fetching" || old.state === "done"))
        return old.promise;
      fetches++;
      const e = { state: "fetching", received: 0 } as Entry;
      e.ctrl = new AbortController();
      e.promise = run(src, type, e).then(
        (url) => {
          if (e.state !== "fetching") {
            URL.revokeObjectURL(url);
            throw new DOMException("aborted", "AbortError");
          }
          e.state = "done";
          e.url = url;
          return url;
        },
        (err: unknown) => {
          if (e.state === "fetching") e.state = "failed";
          throw err;
        },
      );
      // Callers that don't await must not see an unhandled rejection.
      e.promise.catch(() => undefined);
      entries.set(src, e);
      return e.promise;
    },
    state: (src) => entries.get(src)?.state,
    url: (src) => entries.get(src)?.url,
    received: (src) => entries.get(src)?.received ?? 0,
    abort(src) {
      const e = entries.get(src);
      if (!e || e.state !== "fetching") return 0;
      e.state = "aborted";
      e.ctrl.abort();
      return e.received;
    },
    release(src) {
      const e = entries.get(src);
      if (e?.url) URL.revokeObjectURL(e.url);
      if (e) e.url = undefined;
    },
    link(src) {
      const e = entries.get(src);
      if (!e || e.state !== "done" || e.t0 === undefined) return undefined;
      const body = (e.tEnd ?? 0) - (e.tHeaders ?? 0);
      if (!(body > 0) || e.received <= 0) return undefined;
      return {
        bps: (e.received * 8 * 1000) / body,
        ttfbMs: Math.max(0, (e.tHeaders ?? e.t0) - e.t0),
      };
    },
    get fetches() {
      return fetches;
    },
    dispose() {
      entries.forEach((e) => {
        if (e.state === "fetching") {
          e.state = "aborted";
          e.ctrl.abort();
        }
        if (e.url) URL.revokeObjectURL(e.url);
      });
      entries.clear();
    },
  };
}

/** The first source the browser says it can play (the <source> selection rule). */
export function pickSource<S extends { type: string; codecs: string }>(
  sources: readonly S[],
  canPlay: (type: string) => string,
): S | undefined {
  return sources.find((s) => canPlay(`${s.type}; codecs="${s.codecs}"`) !== "");
}
