/* eslint-disable testing-library/no-node-access --
   The hero clips are aria-hidden <video>s with no role or text. */
/**
 * Test harness for the split hero player (Vitest only, never imported by
 * the app): a fake fetch() that serves each clip's real byte count (and can
 * hold responses to test aborts), object URLs, and a mount() that waits for
 * the loop's first frame and the lazy reactions chunk.
 */
import { act, render } from "@testing-library/react";
import type { ReactElement } from "react";

import { ACTIONS, BASE_LOOP } from "~/scene/hero/actions";
// Pre-load the lazy chunk's module so the player's import() resolves fast.
import "~/scene/hero/hero-reactions";

/** src -> clip id ("typing" or an action id), codec and size. */
export const CLIP_OF = new Map<
  string,
  { id: string; codec: "av1" | "h264"; bytes: number }
>();
for (const s of BASE_LOOP.clip.sources)
  CLIP_OF.set(s.src, { id: "typing", codec: s.codec, bytes: s.bytes });
for (const a of Object.values(ACTIONS))
  for (const s of a.clip.sources)
    CLIP_OF.set(s.src, { id: a.id, codec: s.codec, bytes: s.bytes });

export interface FetchCall {
  id: string;
  codec: "av1" | "h264";
  bytes: number;
  signal?: AbortSignal | null;
  aborted: boolean;
  /** Held responses only: send the body (the whole clip). */
  resolve(): void;
}

export interface FakeNet {
  calls: FetchCall[];
  /** Clip ids fetched, in order (one entry per fetch() call). */
  fetched(): string[];
  /** Bytes the fake network actually sent (completed bodies only). */
  sent(): number;
  /** Hold responses until resolve() (to test in-flight aborts). */
  hold: boolean;
  /** Answer a clip with an HTTP error status or a network error (review R1). */
  fail?: (c: ClipInfo) => number | "network" | undefined;
  /**
   * Simulated link per clip (review R3): the response headers arrive
   * `ttfbMs` after the request and the body takes bytes*8/bps. Turns on a
   * virtual Date.now() that only these downloads advance (the clip store
   * times downloads with Date.now()).
   */
  timeLinks(link: (c: ClipInfo) => { bps: number; ttfbMs: number }): void;
}

export interface ClipInfo {
  id: string;
  codec: "av1" | "h264";
  bytes: number;
}

/** Installs fetch / createObjectURL fakes; call in beforeEach. */
export function installFakeNet(): FakeNet {
  let link: ((c: ClipInfo) => { bps: number; ttfbMs: number }) | undefined;
  let netNow = 1_700_000_000_000;
  const net: FakeNet = {
    calls: [],
    hold: false,
    fetched: () => net.calls.map((c) => c.id),
    sent: () => sentBytes,
    timeLinks(l) {
      link = l;
      vi.spyOn(Date, "now").mockImplementation(() => netNow);
    },
  };
  let sentBytes = 0;
  let n = 0;
  globalThis.fetch = vi.fn(
    (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const src = String(input);
      const clip = CLIP_OF.get(src);
      if (!clip) return Promise.reject(new Error(`unknown ${src}`));
      const failure = net.fail?.(clip);
      if (failure) {
        net.calls.push({ ...clip, aborted: false, resolve: () => undefined });
        return failure === "network"
          ? Promise.reject(new TypeError("Failed to fetch"))
          : Promise.resolve(new Response(null, { status: failure }));
      }
      return new Promise<Response>((resolve, reject) => {
        let done = false;
        const call: FetchCall = {
          ...clip,
          signal: init?.signal,
          aborted: false,
          resolve: () => {
            if (call.aborted || done) return;
            done = true;
            sentBytes += clip.bytes;
            const l = link?.(clip);
            if (!l) return resolve(new Response(new Uint8Array(clip.bytes)));
            netNow += l.ttfbMs;
            // highWaterMark 0: pull() runs on the store's first read, after
            // it noted the headers time, not eagerly at construction.
            const body = new ReadableStream<Uint8Array>(
              {
                pull(ctrl) {
                  netNow += (clip.bytes * 8 * 1000) / l.bps;
                  ctrl.enqueue(new Uint8Array(clip.bytes));
                  ctrl.close();
                },
              },
              { highWaterMark: 0 },
            );
            resolve(new Response(body));
          },
        };
        init?.signal?.addEventListener("abort", () => {
          call.aborted = true;
          reject(new DOMException("aborted", "AbortError"));
        });
        net.calls.push(call);
        if (!net.hold) call.resolve();
      });
    },
  ) as typeof fetch;
  URL.createObjectURL = vi.fn(() => `blob:hero/${++n}`);
  URL.revokeObjectURL = vi.fn();
  return net;
}

/** Lets promises and the dynamic import settle (real macrotasks; timers may be fake). */
export const settle = async (rounds = 3) => {
  for (let i = 0; i < rounds; i++)
    await act(async () => {
      await new Promise((r) => setImmediate(r));
    });
};

/**
 * Renders the player, lets the typing loop fetch and show its first frame
 * (`firstFrame` fires a held requestVideoFrameCallback, if the test holds
 * them), and waits until the reactions chunk is attached.
 */
export async function mountHero(
  ui: ReactElement,
  { firstFrame }: { firstFrame?: (base: HTMLVideoElement) => void } = {},
) {
  const r = render(ui);
  const root = r.container.querySelector<HTMLElement>(".hero")!;
  const base = r.container.querySelector<HTMLVideoElement>(
    'video[data-clip="base"]',
  )!;
  Object.defineProperty(base, "readyState", {
    configurable: true,
    get: () => 4,
  });
  for (let i = 0; i < 40 && root.dataset.reactions !== "ready"; i++) {
    await settle(1);
    if (base.src) firstFrame?.(base);
  }
  return { ...r, root, base };
}

/** The action <video> the reactions chunk appended for `id`. */
export const clipEl = (c: HTMLElement, id: string) =>
  c.querySelector<HTMLVideoElement>(`video[data-clip="${id}"]`)!;
