/**
 * Case studies: the 9 former /work/diagrams/* pages grouped into 7 cases.
 * Brandkit owns three diagram subpages; every other case renders its single
 * diagram on the case page itself. Slugs are public URLs — do not rename.
 */
export interface CaseStudy {
  slug: string;
  title: string;
  summary: string;
  /** Subpages (only Brandkit has more than one diagram). */
  parts?: { slug: string; title: string }[];
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "brandkit",
    title: "Brandkit",
    summary:
      "A multi-brand design system: semantic theming, one naming convention across three tools, and the architecture behind it.",
    parts: [
      { slug: "theming", title: "Semantic Theming" },
      { slug: "naming-convention", title: "One Name, Three Tools" },
      { slug: "architecture", title: "Architecture & Data Flow" },
    ],
  },
  {
    slug: "marshal",
    title: "Marshal — Cabify Design System",
    summary: "Reference for the Cabify design system.",
  },
  {
    slug: "ask-nova",
    title: "Ask Nova — AI Mode Reference",
    summary: "An AI mode reference and the eval that found four bugs.",
  },
  {
    slug: "ai-design-to-code",
    title: "Structure Over Agents",
    summary: "AI design-to-code: structure beats more agents.",
  },
  {
    slug: "content-modeling",
    title: "Two Ways to Model Content",
    summary: "Architecture judgment in content modeling.",
  },
  {
    slug: "motion-spec-sheet",
    title: "Motion Spec Sheet",
    summary: "A motion specification for shipping animation with intent.",
  },
  {
    slug: "murmuration",
    title: "Murmuration",
    summary: "Shipping under pressure with a distributed team.",
  },
];

/** Old /work/diagrams/<x> → new /case-studies path (301). */
export const LEGACY_DIAGRAM_REDIRECTS: Record<string, string> = {
  "brandkit-theming": "/case-studies/brandkit/theming",
  "brandkit-naming-convention": "/case-studies/brandkit/naming-convention",
  "brandkit-architecture": "/case-studies/brandkit/architecture",
  marshal: "/case-studies/marshal",
  "ask-nova": "/case-studies/ask-nova",
  "ai-design-to-code": "/case-studies/ai-design-to-code",
  "content-modeling": "/case-studies/content-modeling",
  "motion-spec-sheet": "/case-studies/motion-spec-sheet",
  murmuration: "/case-studies/murmuration",
};
