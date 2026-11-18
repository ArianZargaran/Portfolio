import { onHeroReaction, requestHeroReaction } from "./reaction-bus";

describe("reaction bus", () => {
  it("delivers requests to subscribers until they unsubscribe", () => {
    const l = vi.fn();
    const off = onHeroReaction(l);
    requestHeroReaction("speaker");
    expect(l).toHaveBeenCalledWith("speaker");
    off();
    requestHeroReaction("phone");
    expect(l).toHaveBeenCalledTimes(1);
  });
});
