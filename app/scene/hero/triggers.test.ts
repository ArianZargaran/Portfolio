import { HIT_OBJECTS } from "~/scene/hit-areas";

import { HOTSPOT_REACTIONS, TRIGGERS, wireTriggers } from "./triggers";

function scene() {
  document.body.innerHTML = `
    <div class="scene_frame" tabindex="0">
      <nav class="scene_hits">
        <a class="scene_hit" href="/podcast" data-object="speakers"><span>Podcast</span></a>
        <a class="scene_hit" href="/about" data-object="queen-poster"><span>About me</span></a>
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
    over(hit("speakers").querySelector("span")!);
    vi.advanceTimersByTime(TRIGGERS.dwellMs - 1);
    expect(s.intent).not.toHaveBeenCalled();
    expect(s.hotspot).not.toHaveBeenCalled();
    expect(s.request).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(s.intent).toHaveBeenCalledWith("speaker");
    expect(s.request).toHaveBeenCalledWith("speaker");
    expect(s.hotspot.mock.calls).toEqual([
      ["speakers", "intent"],
      ["speakers", "visit"],
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
    over(hit("speakers"));
    vi.advanceTimersByTime(100);
    over(frame); // onto the background
    vi.advanceTimersByTime(500);
    expect(s.intent).not.toHaveBeenCalled();
    expect(s.hotspot).not.toHaveBeenCalledWith("speakers", "intent");
    expect(s.request).not.toHaveBeenCalled();
    off();
  });

  it("hotspots without a reaction still report visits (E2 egg)", () => {
    const s = sink();
    const off = wireTriggers(scene(), s, { hoverOK: true });
    over(hit("queen-poster"));
    vi.advanceTimersByTime(TRIGGERS.dwellMs);
    expect(s.hotspot).toHaveBeenCalledWith("queen-poster", "visit");
    expect(s.intent).not.toHaveBeenCalled();
    expect(s.request).not.toHaveBeenCalled();
    off();
  });

  it("no hover intent on touch or on devices that cannot hover", () => {
    const s = sink();
    let off = wireTriggers(scene(), s, { hoverOK: true });
    over(hit("speakers"), "touch");
    off();
    off = wireTriggers(scene(), s, { hoverOK: false });
    over(hit("speakers"));
    vi.advanceTimersByTime(TRIGGERS.dwellMs);
    expect(s.intent).not.toHaveBeenCalled();
    expect(s.request).not.toHaveBeenCalled();
    off();
  });

  it("keyboard focus on a hotspot counts as intent, whatever the device", () => {
    const s = sink();
    const off = wireTriggers(scene(), s, { hoverOK: false });
    hit("speakers").focus();
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

  it("idle 20 s: one bounce per idle period; 45 s on the page: sip", () => {
    const s = sink();
    const off = wireTriggers(scene(), s, { hoverOK: true });
    vi.advanceTimersByTime(19_000);
    window.dispatchEvent(new Event("keydown"));
    vi.advanceTimersByTime(19_000);
    expect(s.request).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(s.request).toHaveBeenCalledWith("bounce");
    vi.advanceTimersByTime(6_000); // 45 s since wiring
    expect(s.request).toHaveBeenLastCalledWith("sip");
    vi.advanceTimersByTime(60_000);
    expect(s.request).toHaveBeenCalledTimes(2);
    off();
  });

  it("tab return after 30 s hidden: bounce", () => {
    const s = sink();
    let t = 0;
    let hidden = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
    const off = wireTriggers(scene(), s, { hoverOK: true, now: () => t });
    const flip = (h: boolean) => {
      hidden = h;
      document.dispatchEvent(new Event("visibilitychange"));
    };
    flip(true);
    t = 10_000;
    flip(false);
    expect(s.request).not.toHaveBeenCalled();
    flip(true);
    t = 41_000;
    flip(false);
    expect(s.request).toHaveBeenCalledWith("bounce");
    off();
    Reflect.deleteProperty(document, "hidden");
  });

  it("back in view after being scrolled away: bounce", () => {
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
    const off = wireTriggers(scene(), s, { hoverOK: false, win });
    const io = {} as IntersectionObserver;
    const see = (r: number) =>
      cb([{ intersectionRatio: r } as IntersectionObserverEntry], io);
    see(1); // initial: in view, nothing
    see(0.2);
    expect(s.request).not.toHaveBeenCalled();
    see(0.6);
    expect(s.request).toHaveBeenCalledWith("bounce");
    off();
  });
});
