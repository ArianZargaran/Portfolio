import { HIT_OBJECTS } from "~/scene/hit-areas";

import { HOTSPOT_REACTIONS, TRIGGERS, wireTriggers } from "./triggers";

function scene() {
  document.body.innerHTML = `
    <div class="scene_frame" tabindex="0">
      <nav class="scene_hits">
        <a class="scene_hit" href="/podcast" data-object="headphones"><span>Podcast (headphones)</span></a>
        <a class="scene_hit" href="/about" data-object="queen-poster"><span>About me</span></a>
        <a class="scene_hit" href="/work" data-object="laptop"><span>Work</span></a>
      </nav>
    </div>
    <button id="outside">x</button>`;
  return document.querySelector<HTMLElement>(".scene_frame")!;
}
const sink = () => ({ intent: vi.fn(), request: vi.fn(), hotspot: vi.fn() });
const hit = (id: string) =>
  document.querySelector<HTMLElement>(`[data-object="${id}"]`)!;
const over = (el: Element, pointerType = "mouse") =>
  el.dispatchEvent(
    new PointerEvent("pointerover", { bubbles: true, pointerType }),
  );

describe("hero triggers (M5)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("maps only hotspot ids that exist in hit-areas.ts", () => {
    const ids = HIT_OBJECTS.map((o) => o.id);
    for (const id of Object.keys(HOTSPOT_REACTIONS)) expect(ids).toContain(id);
  });

  it("hover: intent, visit and request only after the 250 ms dwell (review N3)", () => {
    const s = sink();
    const off = wireTriggers(scene(), s, { hoverOK: true });
    over(hit("headphones").querySelector("span")!);
    vi.advanceTimersByTime(TRIGGERS.dwellMs - 1);
    expect(s.intent).not.toHaveBeenCalled();
    expect(s.hotspot).not.toHaveBeenCalled();
    expect(s.request).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(s.intent).toHaveBeenCalledWith("speaker");
    expect(s.request).toHaveBeenCalledWith("speaker");
    expect(s.hotspot.mock.calls).toEqual([
      ["headphones", "intent"],
      ["headphones", "visit"],
    ]);
    // Intent (the fetch) comes before the request that enqueues it.
    expect(s.intent.mock.invocationCallOrder[0]).toBeLessThan(
      s.request.mock.invocationCallOrder[0],
    );
    off();
  });

  it("a quick swipe (leaving before the dwell) sends no intent and no request", () => {
    const s = sink();
    const frame = scene();
    const off = wireTriggers(frame, s, { hoverOK: true });
    over(hit("headphones"));
    vi.advanceTimersByTime(100);
    over(frame); // onto the background
    vi.advanceTimersByTime(500);
    expect(s.intent).not.toHaveBeenCalled();
    expect(s.hotspot).not.toHaveBeenCalledWith("headphones", "intent");
    expect(s.request).not.toHaveBeenCalled();
    off();
  });

  it("hotspots without a reaction still report visits", () => {
    const s = sink();
    const off = wireTriggers(scene(), s, { hoverOK: true });
    over(hit("laptop"));
    vi.advanceTimersByTime(TRIGGERS.dwellMs);
    expect(s.hotspot).toHaveBeenCalledWith("laptop", "visit");
    expect(s.intent).not.toHaveBeenCalled();
    expect(s.request).not.toHaveBeenCalled();
    off();
  });

  it("queen-poster hover/focus: glance-up (S1a) after the dwell, plus the visit for the E2 egg", () => {
    expect(HOTSPOT_REACTIONS["queen-poster"]).toBe("glance-up");
    for (const how of ["hover", "focus"] as const) {
      const s = sink();
      const off = wireTriggers(scene(), s, { hoverOK: true });
      if (how === "hover") over(hit("queen-poster"));
      else hit("queen-poster").focus();
      vi.advanceTimersByTime(TRIGGERS.dwellMs - 1);
      expect(s.intent).not.toHaveBeenCalled(); // nothing before the dwell
      vi.advanceTimersByTime(1);
      expect(s.hotspot).toHaveBeenCalledWith("queen-poster", "intent");
      expect(s.intent).toHaveBeenCalledWith("glance-up");
      expect(s.hotspot).toHaveBeenCalledWith("queen-poster", "visit");
      expect(s.request).toHaveBeenCalledWith("glance-up");
      expect(s.request).toHaveBeenCalledTimes(1);
      off();
      document.body.innerHTML = "";
    }
  });

  it("headphones hover/focus: speaker groove (T6 v3, t1029s5606) after the dwell, plus the visit for the E2 egg", () => {
    expect(HOTSPOT_REACTIONS.headphones).toBe("speaker");
    expect(
      Object.entries(HOTSPOT_REACTIONS).filter(([, r]) => r === "speaker"),
    ).toEqual([["headphones", "speaker"]]);
    for (const how of ["hover", "focus"] as const) {
      const s = sink();
      const off = wireTriggers(scene(), s, { hoverOK: true });
      if (how === "hover") over(hit("headphones"));
      else hit("headphones").focus();
      vi.advanceTimersByTime(TRIGGERS.dwellMs - 1);
      expect(s.intent).not.toHaveBeenCalled(); // nothing before the dwell
      expect(s.hotspot).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      // intent (fetch) -> visit (egg) -> request (queue), in that order
      expect(s.hotspot.mock.calls).toEqual([
        ["headphones", "intent"],
        ["headphones", "visit"],
      ]);
      expect(s.intent.mock.calls).toEqual([["speaker"]]);
      expect(s.request.mock.calls).toEqual([["speaker"]]);
      expect(s.hotspot.mock.invocationCallOrder[1]).toBeLessThan(
        s.request.mock.invocationCallOrder[0],
      );
      off();
      document.body.innerHTML = "";
    }
  });

  it("poster then headphones (keyboard): two visits in order, glance-up then speaker, nothing extra", () => {
    const s = sink();
    const off = wireTriggers(scene(), s, { hoverOK: false });
    hit("queen-poster").focus();
    vi.advanceTimersByTime(TRIGGERS.dwellMs);
    hit("headphones").focus(); // focus moves inside the scene: no leave
    vi.advanceTimersByTime(TRIGGERS.dwellMs);
    expect(s.hotspot.mock.calls.filter(([, kind]) => kind === "visit")).toEqual(
      [
        ["queen-poster", "visit"],
        ["headphones", "visit"],
      ],
    );
    expect(s.hotspot).not.toHaveBeenCalledWith("", "leave");
    expect(s.request.mock.calls).toEqual([["glance-up"], ["speaker"]]);
    off();
  });

  it("queen-poster: a quick swipe (left before the dwell) requests nothing", () => {
    const s = sink();
    const off = wireTriggers(scene(), s, { hoverOK: true });
    over(hit("queen-poster"));
    vi.advanceTimersByTime(TRIGGERS.dwellMs / 2);
    over(hit("laptop"));
    vi.advanceTimersByTime(TRIGGERS.dwellMs);
    expect(s.intent).not.toHaveBeenCalledWith("glance-up");
    expect(s.request).not.toHaveBeenCalled();
    off();
  });

  it("only the poster triggers glance-up; no S1b / T2 triggers are wired", () => {
    expect(
      Object.entries(HOTSPOT_REACTIONS).filter(([, r]) => r === "glance-up"),
    ).toEqual([["queen-poster", "glance-up"]]);
    expect(Object.values(HOTSPOT_REACTIONS)).not.toContain("strong-bounce");
    expect(Object.values(HOTSPOT_REACTIONS)).not.toContain("doze");
    expect(Object.keys(TRIGGERS).sort()).toEqual(["dwellMs", "inViewRatio"]);
  });

  it("no hover intent on touch or on devices that cannot hover", () => {
    const s = sink();
    let off = wireTriggers(scene(), s, { hoverOK: true });
    over(hit("headphones"), "touch");
    off();
    off = wireTriggers(scene(), s, { hoverOK: false });
    over(hit("headphones"));
    vi.advanceTimersByTime(TRIGGERS.dwellMs);
    expect(s.intent).not.toHaveBeenCalled();
    expect(s.request).not.toHaveBeenCalled();
    off();
  });

  it("keyboard focus on a hotspot counts as intent, whatever the device", () => {
    const s = sink();
    const off = wireTriggers(scene(), s, { hoverOK: false });
    hit("headphones").focus();
    expect(s.intent).not.toHaveBeenCalled();
    vi.advanceTimersByTime(TRIGGERS.dwellMs);
    expect(s.intent).toHaveBeenCalledWith("speaker");
    expect(s.request).toHaveBeenCalledWith("speaker");
    off();
  });

  it("focus and pointer both out of the scene: leave", () => {
    const s = sink();
    const frame = scene();
    const off = wireTriggers(frame, s, { hoverOK: true });
    hit("queen-poster").focus();
    document.querySelector<HTMLElement>("#outside")!.focus();
    expect(s.hotspot).toHaveBeenCalledWith("", "leave");
    off();
  });

  it("no idle, doze, tab-return, back-in-view or time-on-page requests on this install (S1b/T2 unlocked, sip has no clip)", () => {
    expect(Object.keys(TRIGGERS).sort()).toEqual(["dwellMs", "inViewRatio"]);
    const s = sink();
    let cb: IntersectionObserverCallback = () => undefined;
    class FakeIO {
      constructor(c: IntersectionObserverCallback) {
        cb = c;
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }
    const win = Object.assign(Object.create(window), {
      IntersectionObserver: FakeIO,
      document,
    }) as Window;
    let hidden = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
    const off = wireTriggers(scene(), s, { hoverOK: false, win });
    const io = {} as IntersectionObserver;
    const see = (r: number) =>
      cb([{ intersectionRatio: r } as IntersectionObserverEntry], io);
    see(1);
    vi.advanceTimersByTime(120_000); // idle 20 s, doze 45 s, sip 90 s: nothing
    hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(60_000);
    hidden = false;
    document.dispatchEvent(new Event("visibilitychange")); // tab return
    see(0.2);
    see(0.6); // back in view
    vi.advanceTimersByTime(120_000);
    expect(s.request).not.toHaveBeenCalled();
    expect(s.intent).not.toHaveBeenCalled();
    off();
    Reflect.deleteProperty(document, "hidden");
  });

  it("scrolled out of view: leave (disarms the E2 egg); a hidden tab cancels a pending dwell", () => {
    const s = sink();
    let cb: IntersectionObserverCallback = () => undefined;
    class FakeIO {
      constructor(c: IntersectionObserverCallback) {
        cb = c;
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }
    const win = Object.assign(Object.create(window), {
      IntersectionObserver: FakeIO,
      document,
    }) as Window;
    let hidden = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
    const off = wireTriggers(scene(), s, { hoverOK: false, win });
    const io = {} as IntersectionObserver;
    const see = (r: number) =>
      cb([{ intersectionRatio: r } as IntersectionObserverEntry], io);
    see(1);
    see(0.2);
    expect(s.hotspot).toHaveBeenCalledWith("", "leave");
    hit("headphones").focus();
    hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(TRIGGERS.dwellMs);
    expect(s.intent).not.toHaveBeenCalled();
    off();
    Reflect.deleteProperty(document, "hidden");
  });
});
