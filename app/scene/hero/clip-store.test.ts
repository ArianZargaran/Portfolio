import { createClipStore, pickSource } from "./clip-store";

const ok = (n: number) => () =>
  Promise.resolve(new Response(new Uint8Array(n)));

describe("clip store (change 2: one fetch per clip per visit)", () => {
  beforeEach(() => {
    let i = 0;
    URL.createObjectURL = vi.fn(() => `blob:x/${++i}`);
    URL.revokeObjectURL = vi.fn();
  });

  it("fetches a clip once into a blob and counts its bytes", async () => {
    const f = vi.fn(ok(1234));
    const s = createClipStore(f as unknown as typeof fetch);
    const a = s.load("/a.mp4", "video/mp4");
    const b = s.load("/a.mp4", "video/mp4"); // joins the same fetch
    expect(await a).toBe("blob:x/1");
    expect(await b).toBe("blob:x/1");
    expect(await s.load("/a.mp4", "video/mp4")).toBe("blob:x/1"); // re-use
    expect(f).toHaveBeenCalledTimes(1);
    expect(s.fetches).toBe(1);
    expect(s.state("/a.mp4")).toBe("done");
    expect(s.received("/a.mp4")).toBe(1234);
  });

  it("abort stops an in-flight fetch, returns the bytes received, and a later load fetches again", async () => {
    let release!: () => void;
    const f = vi.fn((_: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
        release = () => resolve(new Response(new Uint8Array(10)));
      });
    });
    const s = createClipStore(f as unknown as typeof fetch);
    const p = s.load("/a.mp4", "video/mp4");
    expect(s.abort("/a.mp4")).toBe(0);
    await expect(p).rejects.toThrow();
    expect(s.state("/a.mp4")).toBe("aborted");
    expect(s.abort("/a.mp4")).toBe(0); // not in flight any more
    const q = s.load("/a.mp4", "video/mp4");
    release();
    expect(await q).toMatch(/^blob:/);
    expect(s.fetches).toBe(2);
  });

  it("a failed fetch is marked failed and rejects", async () => {
    const s = createClipStore((() =>
      Promise.resolve(new Response("", { status: 404 }))) as typeof fetch);
    await expect(s.load("/a.mp4", "video/mp4")).rejects.toThrow(/404/);
    expect(s.state("/a.mp4")).toBe("failed");
  });

  it("dispose revokes every object URL", async () => {
    const s = createClipStore(ok(5) as unknown as typeof fetch);
    await s.load("/a.mp4", "video/mp4");
    s.dispose();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:x/1");
    expect(s.url("/a.mp4")).toBeUndefined();
  });

  it("pickSource takes the first source the browser can play", () => {
    const src = [
      { type: "video/mp4", codecs: "av01.0.01M.08", id: "av1" },
      { type: "video/mp4", codecs: "avc1.640020", id: "h264" },
    ];
    expect(pickSource(src, () => "probably")?.id).toBe("av1");
    expect(
      pickSource(src, (t) => (t.includes("av01") ? "" : "maybe"))?.id,
    ).toBe("h264");
    expect(pickSource(src, () => "")).toBeUndefined();
  });
});

describe("clip store release (review N6)", () => {
  beforeEach(() => {
    let i = 0;
    URL.createObjectURL = vi.fn(() => `blob:y/${++i}`);
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it("release(): revokes the object URL of an unusable clip once; bytes stay counted", async () => {
    const s = createClipStore(ok(99) as unknown as typeof fetch);
    const url = await s.load("/a.mp4", "video/mp4");
    s.release("/a.mp4");
    s.release("/a.mp4");
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
    expect(s.url("/a.mp4")).toBeUndefined();
    expect(s.received("/a.mp4")).toBe(99);
    s.dispose();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});
