import {
  createFreezeStore,
  FREEZE_STORAGE_KEY,
  isBackgroundActivation,
  overlayOpen,
} from "./freeze";

const memoryStorage = (init: Record<string, string> = {}) => {
  const data = new Map(Object.entries(init));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
};

describe("freeze store (F3 persistence)", () => {
  it("starts playing when nothing is stored", () => {
    expect(createFreezeStore(memoryStorage()).get()).toBe(false);
  });

  it("restores a stored freeze (reload / route change)", () => {
    const s = memoryStorage({ [FREEZE_STORAGE_KEY]: "1" });
    expect(createFreezeStore(s).get()).toBe(true);
  });

  it("persists set and toggle, and clears the key when resumed", () => {
    const s = memoryStorage();
    const store = createFreezeStore(s);
    store.set(true);
    expect(s.data.get(FREEZE_STORAGE_KEY)).toBe("1");
    expect(createFreezeStore(s).get()).toBe(true); // a "reload"
    expect(store.toggle()).toBe(false);
    expect(s.data.has(FREEZE_STORAGE_KEY)).toBe(false);
  });

  it("notifies subscribers only on real changes", () => {
    const store = createFreezeStore(memoryStorage());
    const l = vi.fn();
    const off = store.subscribe(l);
    store.set(false);
    store.set(true);
    store.set(true);
    expect(l).toHaveBeenCalledTimes(1);
    off();
    store.set(false);
    expect(l).toHaveBeenCalledTimes(1);
  });

  it("keeps working in memory when storage throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    const store = createFreezeStore(broken);
    expect(store.get()).toBe(false);
    expect(store.toggle()).toBe(true);
    expect(store.get()).toBe(true);
  });

  it("works without any storage (SSR)", () => {
    const store = createFreezeStore(undefined);
    store.set(true);
    expect(store.get()).toBe(true);
  });
});

describe("isBackgroundActivation (click/hotspot boundary)", () => {
  const scene = document.createElement("div");
  scene.innerHTML = `
    <img id="still" alt="">
    <nav><a id="hit" href="/about"><span id="label">About</span></a></nav>
    <button id="btn">Pause</button>`;
  document.body.append(scene);
  const el = (id: string) => scene.querySelector(`#${id}`)!;

  it("treats the still / background as a freeze toggle", () => {
    expect(isBackgroundActivation(el("still"), scene)).toBe(true);
    expect(isBackgroundActivation(scene, scene)).toBe(true);
  });

  it("leaves hotspot links (and their labels) to navigate", () => {
    expect(isBackgroundActivation(el("hit"), scene)).toBe(false);
    expect(isBackgroundActivation(el("label"), scene)).toBe(false);
  });

  it("leaves buttons to their own handlers", () => {
    expect(isBackgroundActivation(el("btn"), scene)).toBe(false);
  });

  it("ignores targets outside the scene", () => {
    expect(isBackgroundActivation(document.body, scene)).toBe(false);
    expect(isBackgroundActivation(null, scene)).toBe(false);
  });
});

describe("overlayOpen", () => {
  it("detects an open modal so Esc is left to it", () => {
    expect(overlayOpen(document)).toBe(false);
    const d = document.createElement("div");
    d.setAttribute("aria-modal", "true");
    document.body.append(d);
    expect(overlayOpen(document)).toBe(true);
    d.remove();
  });
});
