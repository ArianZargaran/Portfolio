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
  text: "AI Mode: he built the front-end for this AI-powered web assistant at Freshworks — a two-person team, him on front-end and one engineer on back-end — using React, with Framer Motion for animation. Safari, especially on mobile, caused a lot of problems: Figma's design tooling doesn't account for how certain Safari versions actually render, so gaps invisible in the design file only surfaced once built; he solved them with pure CSS fixes rather than JS workarounds. Honored at the 2026 Webby Awards for Best Use of AI. It streamlines self-service on freshworks.com through a sleek, unobtrusive 'toolbar' experience — AI-powered smart search, instant summaries, and recommended journeys — helping visitors find what they need without hunting for it. The wider system: built on Node and Freshworks' existing Next.js infrastructure; content ingestion was tried two ways — pulling structured entries from Contentful, and scraping pages directly — and direct scraping worked better; retrieval runs on Pinecone, with GPT-3 handling both the embeddings and answer generation; analytics run through a custom abstraction layer on top of GA4; content moderation relies on upfront analysis of what the system can reasonably be asked, ongoing content curation, and fallbacks for when a user goes off-topic or asks irrelevant questions.",
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
  {
    id: "story-product-vs-marketing-design-systems",
    text: "Product vs. marketing design systems: Cabify's design system was a product design system (the app itself), while Airtable's and Freshworks' were brand/marketing design systems (the marketing site) — a fundamentally different category. He was the main contributor to Cabify's product design system, building components that other teams consumed as well as himself. He's had repeated conversations, first with Airtable's product team and now again at Freshworks, about consolidating a company's product and marketing design systems into one; both times the conclusion was that it isn't practical. The two don't belong on the same spectrum: marketing colors run more saturated where product colors are more muted, and marketing typography is editorial and expressive where product typography is the functional opposite — among other structural discrepancies.",
  },
  {
    id: "story-walmart-accessibility",
    text: "Walmart accessibility work: after Walmart faced a large accessibility-related fine, he implemented screen reader support, keyboard navigation, and color contrast fixes on the checkout page specifically. That remediation work helped Walmart avoid further penalties from regulators.",
  },
  {
    id: "story-tradeoff-awareness",
    text: "Freedom and responsibility as a tech lead, a concrete example: at Freshworks, the codebase still uses styled-components, a library that's been deprecated by its own author since modern native CSS now covers most of what it used to provide. His top choice would be to migrate to modular CSS (CSS Modules) instead, but he deliberately deferred that migration given the scale of impact it would have on the existing codebase. His broader view: every decision about stack, approach, or principles as a technical leader comes with a tradeoff, and being aware of that tradeoff is the job.",
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
    text: "Own Designs: personal and friends' projects where he worked as the designer in Figma — not the engineer who built them. Repleat is a mobile wellness app covering sleep, eating, and workouts. Initiative Roll is an app for tracking a Dungeons & Dragons dungeon master's story and game (a combat tracker).",
  },
];

/* Added from Ari's own written knowledge-base doc (first-person source,
   converted to the third-person voice the rest of this corpus uses).
   Each chunk below is new ground, not a restatement of a STAR story or
   project chunk already above — where the source doc overlapped with
   existing chunks (the Airtable/Jordan mentoring story, the Airtable vs.
   Freshworks CMS comparison), only the genuinely new angle was kept. */
const philosophyChunks: KnowledgeChunk[] = [
  {
    id: "philosophy-design-engineer",
    text: "What \"design engineer\" means to him: someone who refuses to hand off at the wireframe. He takes taste — typography, motion, color, spacing — and expresses it directly in production code, so nothing gets lost in translation between a designer's intent and what actually ships. He can sit in Figma arguing about optical alignment, then open the editor and implement the exact easing curve that makes a transition feel right. That double-fluency between design and front-end engineering is the whole job.",
  },
  {
    id: "philosophy-design-taste",
    text: "His design taste: drawn to calm, confident interfaces over loud, over-colored maximalism. He sees a dichotomy in the field right now — big-type, expressive-asset maximalism on one side, the AI-era aesthetic of minimalism on the other — and sits on the minimalist side, but with meaningful care for the user: the right feedback, small touches of surprise, never sterile. His one-line definition of premium: \"premium means taking care of the small details\" — the details nobody notices consciously are exactly the ones that make something feel expensive and considered.",
  },
  {
    id: "philosophy-through-line",
    text: "The through-line across his work: structure, restraint, and legibility. The semantic theming system, the naming framework, the type scale, the hand-built charts, the calm visual taste — all the same instinct: find the small set of rules underneath the apparent complexity, and let those rules do the work. He's always looking for how little actually needs to change, the few axes that explain the whole space. Good systems aren't about adding more; they're about finding the minimum that generates everything.",
  },
  {
    id: "philosophy-player-coach",
    text: "\"Player-coach\" is how he describes his own leadership style: he led three contractor engineers across South America at Airtable without ever stepping out of the code to do it. He wasn't anyone's manager — he was their technical point of contact — and his view is that you lead by staying in the work, not by stepping out of it. He drove design-system adoption the same way: not by decree, but by running learning sessions and teaching it until people wanted to use it. Adoption is the real metric for a design system, not how many components got shipped.",
  },
  {
    id: "philosophy-career-direction",
    text: "What he wants to work on next: considered, interactive, data-driven moments on the web — experiences that show rather than tell — built without losing calm and restraint. He sees a gap right now between sites that are editorially beautiful but static, and the interactive, data-storytelling craft that's actually possible, and wants to spend his time closing that gap with taste and real engineering underneath.",
  },
];

const brandkitDeepDiveChunks: KnowledgeChunk[] = [
  {
    id: "brandkit-semantic-theming",
    text: "Semantic theming, the piece he's proudest of: Airtable's brand needed 27 themes (a colorful, expandable palette, each in light and dark), and the naive path — 27 separate theme files — is unmaintainable and a performance tax on every page. He found the three axes underneath: color, mode (light/dark), and \"prominence\" (a term he coined for a color's strength: subtle, default, or strong). Nine colors times three prominence levels times light/dark equals 27. The real unlock was noticing how little actually changes between themes — most tokens are shared, only a handful vary (an upsell background, a highlight) — so instead of full theme files he built one shared base plus tiny compound utility classes, where the three parameters compound into a single class per variant carrying only the delta. Components read values through CSS custom properties (var()), so they're completely theme-agnostic. Adding a new theme is one more compound class; the components never change. All of it pre-AI, pure architecture.",
  },
  {
    id: "brandkit-naming-convention",
    text: "The Brandkit naming convention became a framework, not just a naming rule: a single string names the same thing across three tools. A hero organism variant in Figma, a `variant` value in Contentful, and the component in code all say the exact same string — for example `hero-media-centered`. The payoff: everyone could locate and discuss the same thing by one name, producers could self-serve (pick a variant in Contentful and the right component renders, no developer needed), new hires and contractors ramped onto one framework instead of three paradigms, and different domains could work in parallel because the name was the contract between them.",
  },
  {
    id: "brandkit-architecture-hinge",
    text: "Brandkit's architecture: atomic design is the spine — quarks/tokens, atoms, molecules, organisms, templates, pages — the same vocabulary shared across Figma, Contentful, and code, with Templates as the hinge between them. A URL maps to a Contentful Page entry (a Template type) by its slug; at build time Next.js fetches that entry via static site generation, so marketing pages are static and fast by construction. The page makes all its backend calls at the top, then each organism section is wrapped by a higher-order component that massages the data and hands it to pure, \"dummy\" design-system components — the container/presentational split, where templates and HOCs stay smart and the design system stays dumb and reusable.",
  },
  {
    id: "brandkit-migration-honesty",
    text: "An honest reflection on the Brandkit migration: visual-regression coverage protected the design system at the component level, but there was no full-URL Playwright coverage across the hundreds of pages on the live site, many still on old design systems — at one point three look-and-feels coexisted live at once. The lesson: you can perfect a design system in isolation, but rolling it into a living codebase is always a progressive migration, never one shot — you strangle the old system gradually until you're at 100%, the strangler-fig pattern. Three look-and-feels coexisting wasn't a failure; it's what the middle of a real migration actually looks like.",
  },
];

const craftChunks: KnowledgeChunk[] = [
  {
    id: "craft-ai-design-to-code",
    text: "On AI design-to-code, at Freshworks: the intelligence belongs in the rules, not in the agent. Given a well-structured design system — clear tokens, a naming framework, atomic components — a model can assemble UI reliably because the constraints do the reasoning; the determinism lives in the system, the model just navigates it. A good design system is the best possible context for AI: it turns \"generate a page\" from an open-ended creative gamble into a bounded assembly problem. That's context engineering applied to front-end work.",
  },
  {
    id: "craft-motion-pill-rotation",
    text: "A proof piece for his motion craft: a pill-shaped eyebrow element (used as a link or modal trigger) with an AI-style rotating radial-gradient border, the same pattern seen on Google's AI Mode button loading state. The perceptual problem: at a constant rotation speed, the highlight visibly speeds up around the short curved ends and drags along the long straight sides, and the longer the label, the worse it looks — most implementations in the field just use constant speed. His fix was to interpolate the rotation speed from the pill's own dimensions along a specific curve, so the perceived rotation speed stays constant regardless of content length. Optical correction applied to motion, the same idea as optically aligning type, done in math — nobody consciously sees it, they just feel that it's right.",
  },
  {
    id: "craft-motion-flip-card",
    text: "Another motion detail he owns on his projects: a flip card whose flip direction is aware of context — it rotates in the direction that matches where the interaction came from, so the motion feels physically coherent instead of arbitrary. He considers these small directional decisions what separates motion that feels designed from motion that just moves, and he always respects prefers-reduced-motion — craft includes knowing when to hold an animation back.",
  },
  {
    id: "craft-typography",
    text: "Typography is probably where he's most obsessive. He thinks in a semantic type scale (t-shirt sizing, type tokens) rather than hardcoded pixel values, so a system stays consistent and themeable. He pays attention to vertical metrics and the gap between a font's bounding box and its actual cap height (the problem tools like Capsize solve), to measure (line length) for readability, and to font loading — font-display, FOUT vs. FOIT, and the cumulative-layout-shift cost of swapping fonts. Fonts he's worked with across projects: Calibri (customized at Cabify), Lora and Inter (at Freshworks), and Work Sans (on his own site, ari.soy). Type isn't decoration to him — it's identity, and on the best sites the typeface carries the whole brand.",
  },
  {
    id: "craft-content-modeling-tradeoff",
    text: "On content-modeling philosophy in general: presentation-first models map closely to how things render, letting producers self-serve and see what they're building; entity- or domain-driven models structure content around what it *is* rather than how it looks — more reusable and future-proof (the COPE principle: create once, publish everywhere), but harder for non-technical producers to reason about. The real decision is a flexibility-vs-consistency tradeoff: presentation-first gives producers freedom and speed, entity-driven gives durability and cross-channel reuse. There's no universal right answer — it depends on who's authoring and how many surfaces the content has to serve.",
  },
  {
    id: "craft-dataviz-philosophy",
    text: "His data-visualization philosophy: think in terms of preattentive attributes (the things the eye decodes before conscious attention, like position, length, and color) and Tufte's data-ink ratio — maximize the ink that carries data, minimize everything else. Color should encode meaning, not decorate. That's why he'll hand-build a chart when it matters: a library gives you a chart, a hand-built one gives you a chart that says exactly what you mean and nothing you don't.",
  },
];

const brumaProjectChunk: KnowledgeChunk = {
  id: "project-bruma-realtor-dashboard",
  text: "Bruma is a dashboard he built end to end for a realtor in Venezuela, using Vite, React, and TypeScript, Supabase for the backend, and react-leaflet for mapping. He's proud of hand-building the charts himself in CSS and SVG rather than pulling in a charting library — partly a bundle-size and control decision, partly craft: building a chart yourself means controlling every pixel of the data-ink, the color encoding, and the interaction, instead of fighting a library's defaults, and it keeps the visual language consistent with the rest of the dashboard. Repo: github.com/ArianZargaran/bruma-website.",
};

export const KNOWLEDGE_BASE: KnowledgeChunk[] = [
  ...timelineChunks,
  ...skillChunks,
  visualRegressionChunk,
  aiModeChunk,
  ...starStoryChunks,
  ...projectChunks,
  ...philosophyChunks,
  ...brandkitDeepDiveChunks,
  ...craftChunks,
  brumaProjectChunk,
];
