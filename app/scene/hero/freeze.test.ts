import {
  createFreezeStore,
  FREEZE_STORAGE_KEY,
  freezeValue,
  LEGACY_FREEZE_VALUE,
  readStoredFreeze,
  escAppliesToScene,
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

  it("restores a stored keyboard freeze (reload / route change)", () => {
    const s = memoryStorage({ [FREEZE_STORAGE_KEY]: "v2:keyboard" });
    expect(createFreezeStore(s).get()).toBe(true);
    expect(s.data.get(FREEZE_STORAGE_KEY)).toBe("v2:keyboard");
  });

  it("v2 migration: clears the untagged v1 value (a legacy click freeze) and plays", () => {
    const s = memoryStorage({ [FREEZE_STORAGE_KEY]: LEGACY_FREEZE_VALUE });
    expect(LEGACY_FREEZE_VALUE).toBe("1");
    expect(createFreezeStore(s).get()).toBe(false);
    expect(s.data.has(FREEZE_STORAGE_KEY)).toBe(false);
  });

  it("v2: honours both tags, clears anything else", () => {
    for (const [v, frozen] of [
      ["v2:keyboard", true],
      ["v2:control", true],
      ["1", false],
      ["true", false],
      ["v2:click", false],
      ["v3:keyboard", false],
      ["", false],
    ] as const) {
      const s = memoryStorage({ [FREEZE_STORAGE_KEY]: v });
      expect([v, readStoredFreeze(s)]).toEqual([v, frozen]);
      expect([v, s.data.has(FREEZE_STORAGE_KEY)]).toEqual([v, frozen]);
    }
    expect(freezeValue("keyboard")).toBe("v2:keyboard");
    expect(freezeValue("control")).toBe("v2:control");
  });

  it("persists set and toggle tagged (default keyboard), and clears the key when resumed", () => {
    const s = memoryStorage();
    const store = createFreezeStore(s);
    store.set(true);
    expect(s.data.get(FREEZE_STORAGE_KEY)).toBe("v2:keyboard");
    expect(createFreezeStore(s).get()).toBe(true); // a "reload"
    expect(store.toggle()).toBe(false);
    expect(s.data.has(FREEZE_STORAGE_KEY)).toBe(false);
    expect(store.toggle("control")).toBe(true);
    expect(s.data.get(FREEZE_STORAGE_KEY)).toBe("v2:control");
  });

  it("freezeForPage (net gate) never writes storage", () => {
    const s = memoryStorage();
    const store = createFreezeStore(s);
    store.freezeForPage();
    expect(store.get()).toBe(true);
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

describe("N2: startFromTap (a click or tap starts a gate-frozen scene only)", () => {
  it("starts a scene the network gate froze, writing nothing", () => {
    const s = memoryStorage();
    const store = createFreezeStore(s);
    const l = vi.fn();
    store.subscribe(l);
    store.freezeForPage();
    expect(store.startFromTap()).toBe(true);
    expect(store.get()).toBe(false);
    expect(s.data.has(FREEZE_STORAGE_KEY)).toBe(false);
    expect(l).toHaveBeenCalledTimes(2);
  });

  it("never pauses a moving scene", () => {
    const s = memoryStorage();
    const store = createFreezeStore(s);
    expect(store.startFromTap()).toBe(false);
    expect(store.startFromTap()).toBe(false);
    expect(store.get()).toBe(false);
    expect(s.data.has(FREEZE_STORAGE_KEY)).toBe(false);
  });

  it("never overrides a stored keyboard or control freeze", () => {
    for (const src of ["keyboard", "control"] as const) {
      const s = memoryStorage({ [FREEZE_STORAGE_KEY]: freezeValue(src) });
      const store = createFreezeStore(s);
      store.freezeForPage(); // the gate also says frozen: already frozen
      expect(store.startFromTap()).toBe(false);
      expect(store.get()).toBe(true);
      expect(s.data.get(FREEZE_STORAGE_KEY)).toBe(freezeValue(src));
    }
  });

  it("never overrides a keyboard or control freeze made this page (stored)", () => {
    for (const src of ["keyboard", "control"] as const) {
      const s = memoryStorage();
      const store = createFreezeStore(s);
      store.set(true, src);
      store.freezeForPage();
      expect(store.startFromTap()).toBe(false);
      expect(store.get()).toBe(true);
      expect(s.data.get(FREEZE_STORAGE_KEY)).toBe(freezeValue(src));
    }
  });

  /* REVIEW-4 S1: storage that can't persist (writes blocked by policy, quota
     errors, or storage denied outright). Nothing is stored, so the
     cross-tab storage read can't cover for the in-memory guard: only
     `byGate` (cleared by every user set()) keeps a tap from resuming a
     keyboard or control freeze. Before, the "memory-only" case passed
     `undefined`, which fell back to jsdom localStorage and persisted. */
  const unpersistable = () => {
    const calls = { set: 0 };
    return {
      calls,
      writeFails: {
        getItem: () => null,
        setItem: () => {
          calls.set++;
          throw new DOMException("quota", "QuotaExceededError");
        },
        removeItem: () => undefined,
      },
      denied: {
        getItem: (): string | null => {
          throw new DOMException("denied", "SecurityError");
        },
        setItem: () => {
          calls.set++;
          throw new DOMException("denied", "SecurityError");
        },
        removeItem: () => {
          throw new DOMException("denied", "SecurityError");
        },
      },
    };
  };
  describe.each(["writeFails", "denied"] as const)(
    "storage that can't persist (%s): the in-memory guard alone",
    (kind) => {
      it.each(["keyboard", "control"] as const)(
        "a %s freeze, then the gate's freeze: a tap does nothing",
        (src) => {
          const u = unpersistable();
          const store = createFreezeStore(u[kind]);
          store.set(true, src);
          expect(u.calls.set).toBe(1); // the write was tried and failed
          store.freezeForPage();
          expect(store.startFromTap()).toBe(false);
          expect(store.get()).toBe(true);
        },
      );

      it.each(["keyboard", "control"] as const)(
        "the gate's freeze, then a %s freeze over it: a tap does nothing",
        (src) => {
          const u = unpersistable();
          const store = createFreezeStore(u[kind]);
          store.freezeForPage();
          store.set(true, src); // Esc / the F5 control on the frozen scene
          expect(u.calls.set).toBe(1);
          expect(store.startFromTap()).toBe(false);
          expect(store.get()).toBe(true);
        },
      );

      it.each(["keyboard", "control"] as const)(
        "the gate's freeze, %s play then pause: a tap does nothing",
        (src) => {
          const u = unpersistable();
          const store = createFreezeStore(u[kind]);
          store.freezeForPage();
          store.toggle(src); // play
          expect(store.get()).toBe(false);
          store.toggle(src); // pause
          expect(store.startFromTap()).toBe(false);
          expect(store.get()).toBe(true);
        },
      );

      it("a gate freeze alone still starts on tap", () => {
        const store = createFreezeStore(unpersistable()[kind]);
        store.freezeForPage();
        expect(store.startFromTap()).toBe(true);
        expect(store.get()).toBe(false);
      });
    },
  );

  it("a keyboard pause over a gate freeze becomes a keyboard freeze (stored, tap-proof)", () => {
    const s = memoryStorage();
    const store = createFreezeStore(s);
    store.freezeForPage();
    store.set(true, "keyboard"); // Esc on the gate-frozen scene
    expect(s.data.get(FREEZE_STORAGE_KEY)).toBe("v2:keyboard");
    expect(store.startFromTap()).toBe(false);
    expect(store.get()).toBe(true);
  });

  it("after the keyboard plays and pauses again, a tap does nothing", () => {
    const store = createFreezeStore(memoryStorage());
    store.freezeForPage();
    store.toggle("keyboard"); // play
    store.toggle("keyboard"); // pause
    expect(store.startFromTap()).toBe(false);
    expect(store.get()).toBe(true);
  });

  it("a tagged freeze written by another tab after the gate froze wins", () => {
    const s = memoryStorage();
    const store = createFreezeStore(s);
    store.freezeForPage();
    s.data.set(FREEZE_STORAGE_KEY, "v2:keyboard");
    expect(store.startFromTap()).toBe(false);
    expect(store.get()).toBe(true);
  });

  it("only one start per gate freeze: a second tap on the now-moving scene is a no-op", () => {
    const store = createFreezeStore(memoryStorage());
    store.freezeForPage();
    expect(store.startFromTap()).toBe(true);
    expect(store.startFromTap()).toBe(false);
    expect(store.get()).toBe(false);
  });

  it("unreadable storage: the in-memory gate freeze still starts on tap", () => {
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    const store = createFreezeStore(broken);
    store.freezeForPage();
    expect(store.startFromTap()).toBe(true);
    expect(store.get()).toBe(false);
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

describe("escAppliesToScene (review N7)", () => {
  const setup = () => {
    const stage = document.createElement("div");
    const scene = document.createElement("div");
    scene.tabIndex = 0;
    const hotspot = document.createElement("a");
    hotspot.href = "/about";
    scene.append(hotspot);
    stage.append(scene);
    document.body.append(stage);
    return { stage, scene, hotspot };
  };

  it("applies on the body, the scene, its hotspots and plain page links", () => {
    const { stage, scene, hotspot } = setup();
    const link = document.createElement("a");
    link.href = "/work";
    document.body.append(link);
    (document.activeElement as HTMLElement | null)?.blur();
    expect(escAppliesToScene(document, scene)).toBe(true);
    for (const el of [scene, hotspot, link]) {
      el.focus();
      expect(escAppliesToScene(document, scene)).toBe(true);
    }
    stage.remove();
    link.remove();
  });

  it.each([
    ["input", () => document.createElement("input")],
    ["textarea", () => document.createElement("textarea")],
    [
      "combobox",
      () => {
        const d = document.createElement("div");
        d.setAttribute("role", "combobox");
        d.tabIndex = 0;
        return d;
      },
    ],
    [
      "button in a dialog",
      () => {
        const d = document.createElement("div");
        d.setAttribute("role", "dialog");
        d.append(document.createElement("button"));
        return d;
      },
    ],
  ])("leaves Esc to a focused %s", (_, make) => {
    const { stage, scene } = setup();
    const el = make();
    document.body.append(el);
    const target = (el.querySelector("button") ?? el) as HTMLElement;
    target.focus();
    expect(escAppliesToScene(document, scene)).toBe(false);
    el.remove();
    stage.remove();
  });

  it("leaves Esc to an open listbox or expanded popup", () => {
    const { stage, scene } = setup();
    const t = document.createElement("button");
    t.setAttribute("aria-expanded", "true");
    document.body.append(t);
    expect(overlayOpen(document)).toBe(true);
    expect(escAppliesToScene(document, scene)).toBe(false);
    t.remove();
    stage.remove();
  });
});
