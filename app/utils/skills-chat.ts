export type SkillTopic = "languages" | "frameworks" | "design" | "tools";

/** The natural-language question a quick-reply pill sends when tapped —
    phrased like something a person would actually type, not the bare
    topic label. */
export const QUICK_REPLY_QUESTIONS: Record<string, string> = {
  Languages: "What languages do you know best?",
  Frameworks: "What frameworks do you use?",
  Design: "And on the design side?",
  Tools: "What tools do you rely on?",
};

export const TOPIC_REPLIES: Record<SkillTopic, string> = {
  languages:
    "TypeScript and JavaScript top the list. I've shipped Remix, Next.js, and Node services in production for years.",
  frameworks:
    "React and Remix are home base — I've shipped production apps on both, plus Express and Node on the backend, and Framer Motion for interaction and animation.",
  design:
    "Figma daily. Comfortable owning interaction, motion, and visual systems end-to-end.",
  tools:
    "Three pillars for testing: Vitest for unit, Cypress for end-to-end, and Chromatic for visual regression. I introduced and owned Chromatic at Airtable — paired with Storybook, PR-triggered via GitHub Actions only when a UI change was actually detected — and used it again at Freshworks. Plus ESLint for linting, Figma for design, Git for everything else.",
};

const FALLBACK_REPLY =
  "I mostly talk about my languages, frameworks, design, and tools — tap one of the quick replies below, or ask me directly!";

/** Keyword → topic, checked in this order so the first match wins when an
    input could plausibly hit more than one (e.g. "tools" also containing
    the substring "ui" would be a false positive if design were checked
    first — order matters more than the list itself here). */
const TOPIC_KEYWORDS: ReadonlyArray<[SkillTopic, string[]]> = [
  ["languages", ["language", "typescript", "javascript", " js", " ts"]],
  [
    "frameworks",
    ["framework", "react", "remix", "next.js", "nextjs", "node", "express"],
  ],
  ["design", ["design", "figma", "ux", "ui"]],
  [
    "tools",
    [
      "tool",
      "test",
      "vitest",
      "cypress",
      "eslint",
      "git",
      "chromatic",
      "visual regression",
      "storybook",
    ],
  ],
];

export const matchTopic = (input: string): SkillTopic | null => {
  const normalized = ` ${input.toLowerCase()} `;
  for (const [topic, keywords] of TOPIC_KEYWORDS) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return topic;
    }
  }
  return null;
};

export const getSkillReply = (input: string): string => {
  const topic = matchTopic(input);
  return topic ? TOPIC_REPLIES[topic] : FALLBACK_REPLY;
};
