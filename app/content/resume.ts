/**
 * Resume content for /resume. Source: public/arian-zargaran-resume.pdf
 * (2026-10-13 edition, Airtable start corrected to Oct 2021). Keep the two in
 * sync; the PDF stays the downloadable artifact.
 */
export type YearMonth =
  `${number}-${"01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10" | "11" | "12"}`;

export interface ResumeRole {
  org: string;
  title: string;
  location: string;
  start: YearMonth;
  /** Absent = present. */
  end?: YearMonth;
  highlights: string[];
}

export interface ResumeProject {
  name: string;
  badge?: string;
  summary: string;
  stack: string[];
}

export interface Resume {
  summary: string;
  competencies: string[];
  experience: ResumeRole[];
  projects: ResumeProject[];
  education: { title: string; org: string; year: string; note?: string }[];
  certifications: { title: string; org: string; status: string }[];
  skills: { area: string; items: string }[];
  languages: { name: string; level: string }[];
  pdf: { href: string; label: string };
}

export const RESUME: Resume = {
  summary:
    'Design Engineer at the intersection of design systems and applied AI. Led the Brandkit Design System at Airtable (atomic design, 5x dev-time reduction) and own AI-first web architecture at Freshworks. Build Claude-powered tooling with MCP integrations (pouk.ai: agents, RAG, evals) and shipped AI Mode, a 2026 Webby "Best Use of AI" Honoree. Deep React / TypeScript / Next.js + headless CMS, web animation, Core Web Vitals, and end-to-end localization. Bilingual (EN/ES).',
  competencies: [
    "Design Systems Architecture",
    "Next.js / React / TypeScript",
    "Headless CMS",
    "Claude / MCP Tooling",
    "Web Animation",
    "Localization (i18n / l10n)",
    "Core Web Vitals",
    "Agentic Systems (RAG, evals)",
  ],
  experience: [
    {
      org: "Freshworks",
      title: "Staff Engineer, Web Operations",
      location: "Dallas, TX (Remote)",
      start: "2025-09",
      highlights: [
        'Built AI Mode, an AI-powered web assistant with direct LLM integration. 2026 Webby Awards Honoree, "Best Use of AI" (Features Design).',
        "Own the architecture of scalable, AI-first web systems on Next.js; partner with platform and security teams.",
        "Lead Core Web Vitals performance and accessibility best practices on content-heavy surfaces.",
      ],
    },
    {
      org: "Airtable",
      title: "Senior Front-End Engineer",
      location: "Dallas, TX (Remote) / Mountain View, CA",
      start: "2021-10",
      end: "2025-05",
      highlights: [
        "Design System Lead: owned the Brandkit DS architecture (atomic design, governance), 5x reduction in development time.",
        "Next.js on a headless CMS: content modeling and reusable web surfaces.",
      ],
    },
    {
      org: "Cabify",
      title: "Software Engineer II → III",
      location: "Madrid, Spain",
      start: "2019-10",
      end: "2021-10",
      highlights: [
        "Shipped multi-locale web experiences across European markets; drove compliance and security across platforms.",
        "Built high-performing web experiences for urban mobility; cross-functional delivery across international teams.",
      ],
    },
    {
      org: "Walmart Labs",
      title: "Front End Engineer",
      location: "Sunnyvale, CA",
      start: "2018-05",
      end: "2019-03",
      highlights: [
        "Optimized Cart and Checkout for performance and scalability at e-commerce scale.",
      ],
    },
    {
      org: "Apple",
      title: "QA & Localization",
      location: "Cupertino, CA",
      start: "2017-04",
      end: "2018-05",
      highlights: [
        "Localization / internationalization across languages and locales: translation accuracy, functionality, flow.",
        "Cross-department collaboration with marketing and engineering; international SCRUM.",
      ],
    },
  ],
  projects: [
    {
      name: "pouk.ai",
      badge: "Live",
      summary:
        "Claude-powered tooling: multi-agent orchestration, tool-using agents, MCP servers, and RAG pipelines.",
      stack: ["Claude", "LangGraph", "Claude Agent SDK", "MCP", "Python/TS"],
    },
    {
      name: "AI Mode (Freshworks)",
      badge: "Webby Honoree",
      summary: 'AI-powered web assistant; 2026 Webby "Best Use of AI" Honoree.',
      stack: ["React", "TypeScript", "Direct LLM integration"],
    },
    {
      name: "Brandkit Design System (Airtable)",
      summary:
        "Atomic design system; component API, governance, contribution model: 5x dev-time reduction.",
      stack: ["React", "TypeScript", "Design Systems"],
    },
    {
      name: "AI Expert",
      summary:
        "Personal, visual, daily AI-learning web app: one lesson a day from zero to expert, hands-on Python, live AI-news feed.",
      stack: ["Python (FastAPI)", "HTML", "CSS", "JavaScript"],
    },
    {
      name: "swe-newsletter",
      summary:
        "Daily software-engineering newsletter bot: tracks topics and state for automated email delivery via Claude Code.",
      stack: ["Shell", "Claude Code", "Resend API", "GitHub API"],
    },
  ],
  education: [
    {
      title: "SEO: Practical Marketing with Google",
      org: "Stanford University",
      year: "2017",
      note: "Continuing Studies Specialization · Grade: A+",
    },
  ],
  certifications: [
    {
      title: "Anthropic Claude Certified Architect, Foundations",
      org: "Anthropic",
      status: "2026 (in progress)",
    },
  ],
  skills: [
    {
      area: "Design & Frontend",
      items:
        "Design Systems architecture, React.js, TypeScript, Next.js, Framer, Web Animation, Headless CMS, Core Web Vitals, HTML, CSS",
    },
    {
      area: "AI / LLM Engineering",
      items:
        "Claude-powered tooling, MCP servers, multi-agent orchestration, RAG pipelines, eval loops, prompt engineering (Claude, LangGraph, Claude Agent SDK, Python)",
    },
    {
      area: "Localization",
      items:
        "Internationalization & localization (i18n/l10n) from QA through production; bilingual EN/ES, multi-market EU delivery",
    },
  ],
  languages: [
    { name: "Spanish", level: "Native" },
    { name: "English", level: "Full Professional" },
  ],
  pdf: {
    href: "/arian-zargaran-resume.pdf",
    label: "Download the resume (PDF)",
  },
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const formatYearMonth = (ym: YearMonth) => {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
};

export const formatRange = (r: Pick<ResumeRole, "start" | "end">) =>
  `${formatYearMonth(r.start)} – ${r.end ? formatYearMonth(r.end) : "Present"}`;
