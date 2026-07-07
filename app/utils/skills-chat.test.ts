import { describe, expect, it } from "vitest";

import {
  getSkillReply,
  matchTopic,
  QUICK_REPLY_QUESTIONS,
} from "./skills-chat";

describe("matchTopic", () => {
  it("matches languages keywords", () => {
    expect(matchTopic("What languages do you know best?")).toBe("languages");
    expect(matchTopic("Do you know TypeScript?")).toBe("languages");
  });

  it("matches frameworks keywords", () => {
    expect(matchTopic("What frameworks do you use?")).toBe("frameworks");
    expect(matchTopic("Do you know React?")).toBe("frameworks");
  });

  it("matches design keywords", () => {
    expect(matchTopic("And on the design side?")).toBe("design");
    expect(matchTopic("Do you use Figma?")).toBe("design");
  });

  it("matches tools keywords", () => {
    expect(matchTopic("What tools do you rely on?")).toBe("tools");
    expect(matchTopic("Do you write tests?")).toBe("tools");
    expect(matchTopic("Do you use Chromatic?")).toBe("tools");
    expect(matchTopic("Any visual regression testing?")).toBe("tools");
  });

  it("is case-insensitive", () => {
    expect(matchTopic("REACT")).toBe("frameworks");
  });

  it("returns null when nothing matches", () => {
    expect(matchTopic("What's your favorite food?")).toBeNull();
  });
});

describe("getSkillReply", () => {
  it("returns the topic reply when a topic matches", () => {
    expect(getSkillReply("What languages do you know best?")).toMatch(
      /TypeScript/,
    );
  });

  it("returns a fallback reply when nothing matches", () => {
    const reply = getSkillReply("What's your favorite food?");
    expect(reply).toMatch(/languages, frameworks, design, and tools/i);
  });
});

describe("QUICK_REPLY_QUESTIONS", () => {
  it("has a phrased question for every quick-reply option", () => {
    expect(Object.keys(QUICK_REPLY_QUESTIONS)).toEqual([
      "Languages",
      "Frameworks",
      "Design",
      "Tools",
    ]);
  });

  it("every quick-reply question resolves to a real topic", () => {
    for (const question of Object.values(QUICK_REPLY_QUESTIONS)) {
      expect(matchTopic(question)).not.toBeNull();
    }
  });
});
