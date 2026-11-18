import {
  intentHeroReaction,
  onHeroReaction,
  requestHeroReaction,
} from "./reaction-bus";

describe("reaction bus", () => {
  it("delivers intents and requests to subscribers until they unsubscribe", () => {
    const l = vi.fn();
    const off = onHeroReaction(l);
    intentHeroReaction("speaker");
    requestHeroReaction("speaker");
    expect(l).toHaveBeenNthCalledWith(1, "speaker", "intent");
    expect(l).toHaveBeenNthCalledWith(2, "speaker", "request");
    off();
    requestHeroReaction("phone");
    expect(l).toHaveBeenCalledTimes(2);
  });
});
