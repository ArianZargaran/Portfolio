import { data as timelineData } from "~/constants/timeline-data-set";
import { TOPIC_REPLIES } from "~/utils/skills-chat";

/**
 * The RAG corpus. Every chunk is grounded in content that already exists
 * elsewhere on the site (the about-me timeline, the skills quick replies) or
 * facts confirmed directly by Ari during this project — nothing here is
 * invented for the chatbot. Kept as plain data (not importing the timeline
 * route or the project grid component) so this module has zero React/DOM
 * dependencies and stays safe to run in a server-only embedding pipeline.
 */
export interface KnowledgeChunk {
  id: string;
  text: string;
}

const timelineChunks: KnowledgeChunk[] = timelineData
  .filter((entry) => entry.description) // drops the empty "to be continued" sentinel
  .map((entry) => ({
    id: `timeline-${entry.id}`,
    text: `${entry.headline} (${entry.date}): ${entry.description}`,
  }));

const skillChunks: KnowledgeChunk[] = Object.entries(TOPIC_REPLIES).map(
  ([topic, reply]) => ({
    id: `skill-${topic}`,
    text: `On ${topic}: ${reply}`,
  }),
);

/* A richer companion to the short "tools" chat reply above — the corpus can
   afford more detail than a chat bubble can, so this carries the fuller
   story for retrieval even though the canned quick-reply text stays terse. */
const visualRegressionChunk: KnowledgeChunk = {
  id: "skill-visual-regression",
  text: "Visual regression testing is the third pillar of his testing ecosystem, alongside Vitest (unit) and Cypress (end-to-end). He personally introduced and owned the Chromatic account at Airtable, paired with Storybook, wired into GitHub Actions to trigger only on pull requests where a UI-affecting change was actually detected — avoiding unnecessary CI cost. Used Chromatic again at Freshworks. Cabify ran a different, open-source self-hosted visual regression tool instead of Chromatic. Regression issues dropped dramatically and codebase visual stability was restored incrementally over time.",
};

/* The timeline's own "the-new-paradigm" chunk only pulls the short card
   description, not the fuller story (which is where "AI Mode" first gets
   named) — this chunk fills that gap with the fuller picture confirmed
   directly by Ari, since the public product page wasn't fetchable for
   verification (JS-rendered Webby page, freshworks.com returned a 403). */
const aiModeChunk: KnowledgeChunk = {
  id: "project-ai-mode",
  text: "AI Mode: he built the front-end for this AI-powered web assistant at Freshworks (React, with Framer Motion for animation — Safari, especially on mobile, caused a lot of problems), honored at the 2026 Webby Awards for Best Use of AI. It streamlines self-service on freshworks.com through a sleek, unobtrusive 'toolbar' experience — AI-powered smart search, instant summaries, and recommended journeys — helping visitors find what they need without hunting for it. The wider system: built on Node and Freshworks' existing Next.js infrastructure; content ingestion was tried two ways — pulling structured entries from Contentful, and scraping pages directly — and direct scraping worked better; retrieval runs on Pinecone, with GPT-3 handling both the embeddings and answer generation; analytics run through a custom abstraction layer on top of GA4; content moderation relies on upfront analysis of what the system can reasonably be asked, ongoing content curation, and fallbacks for when a user goes off-topic or asks irrelevant questions.",
};

/* Deeper STAR-format stories behind three of the shorter chunks above —
   confirmed directly by Ari, not inferred. Kept separate from the shorter
   design-systems/product-frontend chunks rather than merged into them, since
   retrieval works better over a few focused chunks than one giant one. */
const starStoryChunks: KnowledgeChunk[] = [
  {
    id: "story-airtable-design-system",
    text: "Airtable Brandkit Design System, the full story: he joined as the first in-house front-end engineer after several contracting teams had left behind contradictory, inconsistently-maintained conventions on the codebase. Tasked with building a design system from scratch, he expanded the scope himself to unify naming and standards all the way from design through the codebase into Contentful, the CMS. The core problem he found: pages needed multiple separate Contentful calls just to populate a single template, which was slow and hard to maintain. His fix was restructuring Contentful's content models to align with atomic design principles, which reduced design-to-development friction, cut the number of content models, and made the Figma side more systemic too. The concrete payoff: building a single page used to take 5 to 6 weeks; afterward, new templates became close to pure composition with almost no dev effort — a non-technical content creator could launch an entire campaign page themselves with no engineering involvement at all.",
  },
  {
    id: "story-cabify-logistics",
    text: "Cabify Logistics, how it started: when the pandemic hit, Cabify's ride-hailing revenue dropped from its best-ever numbers to essentially zero overnight. The pivot was to repurpose the same infrastructure used for carrying people and use it to move parcels point-to-point instead, across multiple stops if needed. He was the lead front-end developer on this for a year — reusing the existing ride-hailing UI for the customer-facing side while building brand-new internal dashboards and tooling for managing deliveries, since nothing like that existed at Cabify before. Cabify Logistics is still running today across Spain and Latin America, has grown into a much more sophisticated system since, and is now one of Cabify's major revenue pillars — one of the projects he's most proud of.",
  },
  {
    id: "story-walmart-payments-bridge",
    text: "Walmart payments bridge, a failure he learned the most from: after Walmart faced a large accessibility-related fine, he worked on accessibility features across the site, and later rebuilt the entire payments bridge UI from scratch — every card preview, every payment system — as a pure front-end effort with no back-end changes needed. The redesign didn't hold up in A/B testing against customer behavior; the data didn't support a full overnight overhaul. What he took from it: big, established products do better with incremental, progressive changes landing over time than a sudden full redesign, even when the new version is technically solid.",
  },
  {
    id: "story-walmart-phone-format",
    text: "His go-to example, whenever asked how much small details matter: at Walmart, a tiny, purely cosmetic fix to the format of a phone number field on a form prevented roughly $500,000 in lost revenue. No backend logic changed, just the visual formatting — proof that even a cosmetic-only change can carry six-figure business weight at e-commerce scale.",
  },
  {
    id: "story-airtable-mentoring",
    text: "Mentoring at Airtable: for about two of his three-and-a-half years there, he was tech lead for three engineers spread across South America — one in Mexico, one in Chile, one in Colombia. His proudest outcome was with the engineer in Chile, a contractor who joined with low visibility and confidence on the team despite being technically very strong — he just didn't feel comfortable speaking up. He worked with that engineer on his self-esteem and helped him see that being a contractor rather than a full-time employee wasn't a barrier to being valued at Airtable. That engineer went on to become one of the team's top performers, and the consistent positive feedback led to a raise in his contractor rate.",
  },
  {
    id: "story-cms-architecture-comparison",
    text: "CMS architecture, Airtable vs. Freshworks: at Airtable, Contentful content models were built for fluid customization — content creators could customize templates however they wanted, achieved by continually expanding content models with more and more keys over time. At Freshworks, content and producer flows are intentionally rigid and strict, but the underlying architecture is a knowledge graph: entities like 'product' have attached related entities — capabilities, clients, campaign assets, and more — that scale up as a tree. Content lives on one side, the UI on the other, fully decoupled; UI components stay 'dumb,' carrying no business logic, purely rendering whatever data the graph hands them. A content-resolution layer knows exactly what to pick from the graph and how to render it, whether there's one product or ten. He considers the Freshworks knowledge-graph approach the better-working system of the two.",
  },
];

/* Same topics as the Projects page grid (app/components/grid/project-grid.tsx)
   — duplicated as plain strings here rather than imported, since that module
   pulls in CSS/motion/React and this corpus needs to stay dependency-free. */
const projectChunks: KnowledgeChunk[] = [
  {
    id: "project-design-systems",
    text: "Design Systems: contributed to three design systems in his career — Airtable's Brandkit Design System, Cabify's design system, and Freshworks'. At Airtable he led the Brandkit Design System (atomic design, component APIs, governance) and cut development time 5x. Chromatic visual regression testing, paired with Storybook, guarded that component library against unintended UI changes.",
  },
  {
    id: "project-product-frontend-engineering",
    text: "Product Front-End Engineering: shipped cart, checkout, and logistics products at web scale — walmart.com's Cart & Checkout team (his first engineering job, built for web and mobile), and Cabify Logistics, a last-mile delivery service.",
  },
  {
    id: "project-non-technical-qa",
    text: "Non-Technical (Linguistic) QA: worked at Apple as a QA & Localization expert for the Spanish market, checking translation accuracy, functionality, and flow across languages and locales, working with marketing and engineering across international teams.",
  },
  {
    id: "project-own-designs",
    text: "Own Designs: personal and friends'-project work designed and built end-to-end, often starting in Figma as the designer, not just the engineer. Repleat is a mobile wellness app covering sleep, eating, and workouts. Initiative Roll is an app for tracking a Dungeons & Dragons dungeon master's story and game (a combat tracker).",
  },
];

export const KNOWLEDGE_BASE: KnowledgeChunk[] = [
  ...timelineChunks,
  ...skillChunks,
  visualRegressionChunk,
  aiModeChunk,
  ...starStoryChunks,
  ...projectChunks,
];
