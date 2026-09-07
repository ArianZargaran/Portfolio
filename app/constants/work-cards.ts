/**
 * Source of the Work page's 14 cards. Cards are titled per use-case (the
 * learning/contribution leads), never per project: the employer or product is
 * metadata inside the expanded view, not the headline. Every block has two
 * lengths: `face` cycles on the collapsed card (headline-sized), `expanded`
 * stacks inside the opened card. Text supports the same inline Markdown as
 * the timeline (see ~/utils/inline-markdown).
 */
export interface GalleryImage {
  src: string;
  alt: string;
}

export type WorkBlockKind =
  | "problem"
  | "decision"
  | "craft"
  | "outcome"
  | "human";

export interface WorkCardBlock {
  kind: WorkBlockKind;
  /** Headline-sized teaser; one of the frames the collapsed card cycles. */
  face: string;
  /** Full paragraph shown when the card is expanded. */
  expanded: string;
}

export interface WorkCard {
  id: string;
  /** All-caps category label (the tile eyebrow). */
  eyebrow: string;
  /** Default face headline; the hook. Doubles as the first cycled frame. */
  signal: string;
  blocks: WorkCardBlock[];
  /** Small print in the expanded view, e.g. "Airtable · 2021–2025". */
  meta: string;
  /** Present only when the work is publicly reachable. */
  link?: { href: string; label: string };
  /** Self-hosted diagram deep-dives (see app/routes/work_.diagrams.*),
      distinct from `link`: these are internal detail pages, not the live
      product. A card can have zero, one, or several. */
  diagrams?: { href: string; label: string }[];
  /** External reference links beyond the primary `link` — award pages,
      press, etc. Always opens in a new tab. */
  references?: { href: string; label: string }[];
  /** Card visuals; diagrams and screenshots join these as assets land. */
  images: GalleryImage[];
}

const BRANDKIT: WorkCard = {
  id: "design-systems-brandkit",
  eyebrow: "DESIGN SYSTEMS",
  signal: "27 themes from one shared base. Launches went 5x faster.",
  meta: "Airtable · 2021–2025 · still in production",
  diagrams: [
    {
      href: "/work/diagrams/brandkit-theming",
      label: "Diagram: semantic theming",
    },
    {
      href: "/work/diagrams/brandkit-naming-convention",
      label: "Diagram: the naming convention",
    },
    {
      href: "/work/diagrams/brandkit-architecture",
      label: "Diagram: architecture & data flow",
    },
  ],
  images: [
    { src: "/airtable.webp", alt: "Airtable Brandkit Design System preview" },
  ],
  blocks: [
    {
      kind: "problem",
      face: "Three contractor teams, ten variants of one button, and hundreds of long-tail pages quietly rotting into a brand liability.",
      expanded:
        "The marketing site had three contractor teams shipping in parallel, and it showed: roughly ten variants of the same button, sections rebuilt two or three times, and two or three look-and-feels living on one site. Hundreds of URLs with no source of truth. The tokens were fine (Figma had those covered). The rot was in components and maintainability, and every broken long-tail page was the brand's problem, not the contractor's.",
    },
    {
      kind: "decision",
      face: "Almost nothing changes between themes. So the system only describes what changes.",
      expanded:
        "The theming insight came from staring at the palette long enough to see the structure: 9 colors, times 3 prominence levels (a term I coined for a color's strength: subtle, default, strong), times light and dark. 27 themes that share almost everything. So instead of 27 stylesheets, one shared base plus tiny compound utility classes that redefine only the delta. Components consume tokens via `var()` and never know which theme they're in. Practically zero performance cost. All of it pre-AI.",
    },
    {
      kind: "craft",
      face: "One name, identical in Figma, Contentful, and code. The naming was the framework.",
      expanded:
        "A component called `hero-media-centered` was called exactly that in Figma, in Contentful, and in the codebase. That one rule shifted how everyone thought: designers, producers, and engineers stopped translating between vocabularies. It's what made producer self-serve possible. The naming convention wasn't documentation for the system, it *was* the system.",
    },
    {
      kind: "outcome",
      face: "My first template took six weeks. The system collapsed that to 5 to 10 reusable templates and zero-dev launches.",
      expanded:
        "My first launch, the About page, was a bespoke template that took six weeks (it's still live). The system collapsed all of that into 5 to 10 reusable templates: launches went about 5x faster, and many pages became fully self-serve for producers through a docs wiki I built, with no engineer involved. It's still in use past my tenure, which is the outcome I'm proudest of.",
    },
    {
      kind: "human",
      face: "The best migration is progressive. So is the best mentoring.",
      expanded:
        "Two lessons that outlasted the code. Migrations: never one-shot; the site ran three look-and-feels mid-migration and that was the correct, honest state. People: I mentored a shy but brilliant contractor, Jordan, whose blocker wasn't technical, it was visibility. Teaching the system into adoption mattered more than building it. Jordan got promoted.",
    },
  ],
};

const AI_DESIGN_TO_CODE: WorkCard = {
  id: "ai-design-to-code",
  eyebrow: "AI × DESIGN",
  signal: "Put the intelligence in the rules, not the agent.",
  meta: "Freshworks · 2025–present",
  diagrams: [
    {
      href: "/work/diagrams/ai-design-to-code",
      label: "Diagram: structure over agents",
    },
  ],
  images: [
    {
      src: "/freshworks-f1.webp",
      alt: "Freshworks branding on a McLaren Formula 1 car",
    },
  ],
  blocks: [
    {
      kind: "problem",
      face: "AI writes plausible components. Plausible is not the same as correct.",
      expanded:
        "Handing an agent a Figma file and hoping is not a pipeline. The output looks right, drifts from the design system, and every run is different. The design intent that lives in a mockup (spacing logic, breakpoint behavior, when to use which variant) is invisible to a model unless someone makes it legible.",
    },
    {
      kind: "decision",
      face: "I structured Figma itself as machine-legible context: every component in three ID-addressable frames.",
      expanded:
        "Every component gets three ID-addressable frames in Figma: Specs, Breakpoints, and Usage. The agent doesn't interpret a canvas; it reads a contract. That structure, plus a component template in the codebase, is what turns generation from a slot machine into a build step.",
    },
    {
      kind: "craft",
      face: "An agents.md co-authored in Chennai with the people who founded the codebase.",
      expanded:
        "The rules layer is the craft: an `agents.md` co-written in Chennai with the codebase's founding engineers, Cursor rules, Figma MCP (remote and local), and Browser MCP for verification. Each piece encodes judgment the agent would otherwise have to guess at. Structure over autonomy, because deterministic beats impressive.",
    },
    {
      kind: "outcome",
      face: "One-shot components. Token updates by instruction.",
      expanded:
        "Components come out right on the first pass, matching the system's conventions, because the conventions are in the context. Token updates happen by instruction instead of by hand. The pipeline is the same philosophy as every design system I've built: encode the intelligence in the structure, and the flashy tool becomes unnecessary.",
    },
  ],
};

const SIX_WEEK_REDESIGN: WorkCard = {
  id: "six-week-redesign",
  eyebrow: "SHIPPING UNDER PRESSURE",
  signal: "A six-month redesign, shipped in six weeks.",
  meta: "Freshworks · shipped July 2026",
  link: { href: "https://www.freshworks.com", label: "Visit Freshworks" },
  references: [
    {
      href: "/work/diagrams/murmuration",
      label: "Deep-dive: rebuilding the homepage's particle effect",
    },
  ],
  images: [
    {
      src: "/freshworks-redesign.webp",
      alt: "Freshworks.com homepage redesign hero",
    },
  ],
  blocks: [
    {
      kind: "problem",
      face: "Exec mandate: full site redesign in six weeks. The normal timeline is six months.",
      expanded:
        "The mandate came from the top: complete redesign, six weeks, no extension. A distributed team across India and the US, three revenue lines depending on the Product Home templates, and iOS Safari's JavaScript limits setting a hard ceiling on how clever anything could afford to be.",
    },
    {
      kind: "decision",
      face: "Speed didn't come from cutting corners. It came from structure: desktop-first, then four breakpoints.",
      expanded:
        "I set the creative benchmark first (awwwards-level references, so quality had a definition before the clock started) and owned the Product Home pillar templates plus motion and performance. The process bet: design and build desktop-first, then cascade deliberately through four breakpoints. Structure is what let a distributed team move fast without colliding.",
    },
    {
      kind: "craft",
      face: "I killed a carousel snap effect that hijacked the user's scroll. Deadline or not.",
      expanded:
        "Under deadline pressure the temptation is to ship whatever's built. A carousel came in with a snapping effect that grabbed the user's scroll and overrode it. I killed it. Last-minute requirements are welcome when taste or UX is compromised; that rule doesn't pause for a deadline.",
    },
    {
      kind: "outcome",
      face: "Shipped on time, with the tech debt written down honestly instead of hidden.",
      expanded:
        "We shipped in July 2026, on the six-week mark. Part of shipping fast honestly is owning what you deferred: I kept the tech debt ledger explicit, so the shortcuts were decisions on record rather than surprises for whoever came next. Motion stayed within iOS Safari's real budget, because performance you can't afford isn't craft.",
    },
  ],
};

const MOTION: WorkCard = {
  id: "motion-micro-interactions",
  eyebrow: "MOTION & MICRO-INTERACTIONS",
  signal: "Optical correction, applied to motion.",
  meta: "Freshworks · ongoing · I own motion on the team",
  link: { href: "https://www.freshworks.com", label: "Visit Freshworks" },
  references: [
    {
      href: "https://codepen.io/Arian-Zargaran/pen/019fa948-116f-7870-b019-1aad65404eb8",
      label: "Play with an auto-peek tilt-card demo",
    },
    {
      href: "/work/diagrams/motion-spec-sheet",
      label: "Deep-dive: the motion spec sheet",
    },
  ],
  images: [
    {
      src: "/motion-cards.webp",
      alt: "Colorful color-swatch cards with hex codes and RGB/CMYK values",
    },
  ],
  blocks: [
    {
      kind: "craft",
      face: "A rotating gradient reads faster on a pill's short ends. So the speed isn't constant. The perception is.",
      expanded:
        "An AI-style rotating gradient border on a pill has a perception bug: at constant angular speed, the highlight reads faster around the short ends and slower along the long sides, and it gets worse the longer the label. I interpolated the rotation speed from the pill's dimensions along a curve, so the *perceived* speed stays constant. Type designers have done optical correction for centuries. Motion deserves the same care.",
    },
    {
      kind: "decision",
      face: "The flip card follows which side you click. Nobody asked for that.",
      expanded:
        "A flip card that always flips the same way is fine. Mine flips *away from your cursor*: click the left side and it swings from the left. It's the kind of decision no spec asks for and every user feels. A teammate put it better than I could: \"the small details that feel premium.\"",
    },
    {
      kind: "human",
      face: "Motion is feedback, not decoration.",
      expanded:
        "I own motion on the team, and the rule I hold it to is simple: every animation must tell the user something (what moved, where it came from, what's responding to them). If it only exists to be admired, it's decoration, and decoration is the first thing I cut. Calm interfaces earn their moments of surprise.",
    },
  ],
};

const CONTENT_MODELING: WorkCard = {
  id: "content-modeling",
  eyebrow: "ARCHITECTURE JUDGMENT",
  signal: "Same problem, opposite content models. Both right.",
  meta: "Airtable + Freshworks",
  diagrams: [
    {
      href: "/work/diagrams/content-modeling",
      label: "Diagram: two ways to model content",
    },
  ],
  images: [
    {
      src: "/content-modeling-graph-2.webp",
      alt: "Knowledge graph diagram, colored nodes connected by edges",
    },
  ],
  blocks: [
    {
      kind: "problem",
      face: "Two marketing sites, same stack, opposite bets on what content even is.",
      expanded:
        "Airtable and Freshworks gave me the same assignment twice: a marketing site on Next.js with SSG and ISR. The content models could not be more opposite. Getting to build both is rare; most engineers only ever see one bet and mistake it for the truth.",
    },
    {
      kind: "decision",
      face: "Presentation-first: fat models that mirror components. The producer art-directs.",
      expanded:
        "Airtable modeled content presentation-first: fat content models that mirror the components themselves. A producer assembling a page is genuinely art-directing, choosing layouts and emphasis. Maximum flexibility, and creativity lives with the producer. The cost is consistency: nothing structurally prevents two pages from drifting apart.",
    },
    {
      kind: "craft",
      face: "Entity-first: models that mirror the domain, like a relational database. The designer authors.",
      expanded:
        "Freshworks modeled content entity-first: models mirror domain entities (a product, a feature, a testimonial), the way a relational database would. Pages assemble themselves from structured data. Consistency and reuse come free; creativity concentrates with the designer who defines the templates. The cost is flexibility at the page level.",
    },
    {
      kind: "outcome",
      face: "The real tradeoff isn't technical. It's who owns creativity.",
      expanded:
        "Flexibility versus consistency is the visible axis, but the deeper one is who owns creativity: the producer or the designer. My answer after building both: match the model to the template's job. Structural and editorial templates want entity-first; campaign and launch templates want presentation-first. The judgment is knowing which page type you're modeling, not picking a side.",
    },
  ],
};

const BRUMA: WorkCard = {
  id: "bruma",
  eyebrow: "END-TO-END PRODUCT",
  signal: "An investment tool with zero charting libraries.",
  meta: "Personal · live",
  link: { href: "https://bruma-website.vercel.app/", label: "Visit Bruma" },
  images: [{ src: "/bruma-coast.webp", alt: "Coastal property view, Bruma's target market" }],
  blocks: [
    {
      kind: "problem",
      face: "The Venezuelan housing market has signal. It just isn't legible from raw listings.",
      expanded:
        "Bruma is my own tool for real-estate investment in the Venezuelan market. The raw material (listings from MercadoLibre, CSVs, manual entries) has real signal in it, but nobody can act on a spreadsheet of scattered listings. The job was making an illegible market legible enough to say Buy, Hold, or Pass with a straight face.",
    },
    {
      kind: "craft",
      face: "Every chart is hand-built in CSS and SVG. Only the map earned a dependency.",
      expanded:
        "KPI tiles, a pipeline funnel, a scoring distribution, Buy/Hold/Pass verdicts: all hand-built in CSS and SVG, no charting library. Restraint as a feature: each chart does exactly its job and nothing else, with semantic color doing the explaining. One dependency earned its place, Leaflet for the map, because a mapping engine is not a thing to hand-roll. Everything else didn't clear the bar.",
    },
    {
      kind: "decision",
      face: "Map markers color-coded by source, faceted filters, and a property scoring model underneath.",
      expanded:
        "Vite, React, TypeScript, Supabase for data and auth, Zod at the boundaries, bilingual EN/ES. Sourcing flows in from MercadoLibre ingestion, CSV import, and manual entry, with map markers color-coded by source so provenance is always visible. Under it all sits a property scoring model that turns listings into comparable numbers.",
    },
    {
      kind: "outcome",
      face: "A serif \"Luxury Coastal Rentals\" brand that looks nothing like this site. That's the point.",
      expanded:
        "Bruma has its own elegant brand (serif type, luxury coastal rentals language, a gated investor portal) that shares nothing visually with ari.soy. Range is part of the craft: the design system serves the product's audience, not the designer's habits. Live and linkable.",
    },
  ],
};

const FITCOUNTER: WorkCard = {
  id: "fitcounter",
  eyebrow: "PRODUCT DESIGN",
  signal:
    "Most calorie apps let you earn treats back. I designed one that refuses — on purpose.",
  meta: "Personal project, design led · live on the App Store",
  link: { href: "https://fitcounter.com/", label: "Visit FitCounter" },
  references: [
    {
      href: "https://apps.apple.com/es/app/ai-calorie-counter-fitcounter/id6498909414?l=en-GB",
      label: "See it on the App Store",
    },
  ],
  images: [],
  blocks: [
    {
      kind: "problem",
      face: "Most calorie apps die at step one: search a food database, guess the portion, give up in a week.",
      expanded:
        "FitCounter is a nutrition-tracking app I designed, live on the App Store. Typing a food name into a search box and guessing its portion size is the exact friction that gets calorie trackers deleted within days. The entry point had to stop being a keyboard and start being a camera: snap a photo, let AI recognize the meal and estimate the macros, log it in one tap.",
    },
    {
      kind: "decision",
      face: "I designed the app to refuse something users would want: earning calories back through exercise.",
      expanded:
        "Most competitors let you \"earn\" extra food by logging a workout, which turns a nutrition plan into a bargain you can always renegotiate. FitCounter doesn't allow it, on purpose — the plan stays consistent and science-backed instead of elastic. That's a product stance as much as a design one: I had to design the restriction to feel like support from a coach, not a penalty, which is why it ships alongside Smart Coach guidance rather than as a bare rule.",
    },
    {
      kind: "craft",
      face: "A macro ring replaced a wall of numbers. NutriScore and NOVA ratings sit right where you're about to add the food.",
      expanded:
        "The add-food screen centers a circular kcal ring with protein, fat, and carbs read at a glance instead of four stacked numbers competing for attention. NutriScore and NOVA quality ratings surface in that same screen, so \"is this food actually good for me\" stays visible next to \"how much of it is this,\" not buried in a separate tab nobody opens.",
    },
    {
      kind: "outcome",
      face: "Shipped, ad-free, and the reviews single out the design, not just the feature list.",
      expanded:
        "FitCounter is live on the App Store at 4.8 stars, subscription-funded and ad-free — which also meant designing with no ad slots to route around. One review, translated from Spanish: “Has a spectacular design, very well structured — very accessible and intuitive.” It shipped already localized across 16+ languages, so the screens had to hold up in more than one language from the first draft, not as a retrofit.",
    },
  ],
};

const EPHEMERAL: WorkCard = {
  id: "ephemeral",
  eyebrow: "MENTAL HEALTH UX",
  signal:
    "Most mood apps open by asking how you feel. Ephemeral opens by asking you to move.",
  meta: "Personal design concept · Figma, unshipped",
  images: [],
  blocks: [
    {
      kind: "problem",
      face: "Most mood apps ask you to log a feeling. Ephemeral's whole pitch is one line: you're one workout away from a good mood.",
      expanded:
        "Ephemeral is a mental-health app concept I designed — a full onboarding flow, style guide, and paywall, not shipped. Most apps in this category are diagnostic-first: log your mood, journal an entry, watch a chart. That's passive. The hook I designed around instead treats movement as the lever on mood, not just something to track alongside it — action first, reflection second.",
    },
    {
      kind: "decision",
      face: "Depression, letting go, missing someone — themes most apps bury in settings, surfaced as the very first tap.",
      expanded:
        "Onboarding opens with a personalization screen: tappable pill chips for Mental health, Positive thinking, Self-love, Depression, Letting go, Growth, Sadness, Missing someone, Productivity. Naming genuinely heavy topics like depression and grief in the first ten seconds is a real design risk — it can read as clinical or presumptuous. The earthy palette and rounded, warm pill shapes were the deliberate counterweight: the goal was recognition, not a diagnostic form.",
    },
    {
      kind: "craft",
      face: "A recurring illustrated character and a themeable home-screen widget carry the brand outside the app itself.",
      expanded:
        "A consistent illustrated pair — a person and their corgi — recurs across onboarding screens (walking to a bus stop, carrying a bag), giving a subject that could read as clinical a soft, approachable throughline instead of stock icons. The onboarding also sells a home-screen widget with a photo-theme picker (ocean, forest, watercolor), and a custom pre-permission screen explaining notifications before the OS prompt does — both surfaces most onboarding flows skip designing with the same care as the core screens.",
    },
    {
      kind: "outcome",
      face: "A 5-day trial laid out as a timeline — today, no commitment, charged in 5 days — instead of fine print.",
      expanded:
        "The paywall (8,99€/year, discounted from 17,99€) lays out the free trial as a three-step timeline with icons — Today: start using it; No Commitment: cancel anytime before the trial ends; In 5 days: you're charged, via the App Store — instead of a wall of legal text. It's concept work: a full style guide, a competitive-analysis page, and this onboarding exist in Figma, not on a store shelf, but the thesis — that the app should ask you to move before it asks you to reflect — runs through every screen.",
    },
  ],
};

const CHECKOUT_AT_SCALE: WorkCard = {
  id: "checkout-honest-failure",
  eyebrow: "AN HONEST FAILURE",
  signal: "The redesign the data killed, and what it taught me.",
  meta: "Walmart · 2018–2019",
  link: { href: "https://www.walmart.com", label: "Visit Walmart" },
  images: [{ src: "/walmart.webp", alt: "Walmart Cart & Checkout preview" }],
  blocks: [
    {
      kind: "problem",
      face: "Redesign Cart and Checkout at walmart.com scale. UI-only, no backend resources, performance-critical.",
      expanded:
        "My first big redesign: Cart and Checkout at walmart.com, racing Amazon, where every millisecond of performance is revenue. The constraint that shaped everything: no backend resources. UI-only, at massive scale, on the most performance-sensitive pages of the site.",
    },
    {
      kind: "decision",
      face: "I said yes to every feature. That was the mistake.",
      expanded:
        "Stakeholders kept asking, and I kept saying yes. Every yes added weight to pages that could not afford it, and performance slid. The uncomfortable part isn't that it happened; it's that I could feel it happening and kept going, because saying no felt like failing at my first big project.",
    },
    {
      kind: "outcome",
      face: "The A/B test showed a revenue sink. I rationalized it. The redesign was scrapped.",
      expanded:
        "The A/B data came back clear: the redesign was losing money. My first instinct was to rationalize (more time, one more iteration, the numbers will turn). They didn't, and the whole redesign was scrapped. Painful, public, and entirely mine to own.",
    },
    {
      kind: "human",
      face: "Feature-flag the radical changes. Let data beat conviction. Say no earlier.",
      expanded:
        "Three lessons with scars behind them. Roll out radical UI changes progressively behind flags, so data can kill a piece instead of the whole. When the data and your conviction disagree, the data wins, especially when you badly want it not to. And \"no\" is a scoping tool, not a failure. Every system I've built since has been shaped by that scrapped checkout.",
    },
  ],
};

const QUALITY_ORIGINS: WorkCard = {
  id: "quality-origins",
  eyebrow: "QUALITY ORIGINS",
  signal: "Where my quality bar was set.",
  meta: "Apple · 2017",
  images: [{ src: "/apple.webp", alt: "Apple QA & localization preview" }],
  blocks: [
    {
      kind: "craft",
      face: "QA and localization for Apple's Spanish market: translation accuracy, functionality, and flow.",
      expanded:
        "Before I wrote production code, I judged it: QA and localization for Apple's Spanish market, checking translation accuracy, functionality, and flow across languages and locales, working between marketing and engineering on international teams. Localization teaches a specific kind of rigor: the bug that only appears in one locale, one grammar, one string length.",
    },
    {
      kind: "human",
      face: "Apple is proof that things can always be built better, and with taste.",
      expanded:
        "What Apple actually gave me wasn't a job title; it was a standard. Proof, daily and concrete, that things can always be built better and with taste, and that quality isn't a polish pass at the end but generosity toward the person on the other side of the screen. Every design system and every checkout I've touched since has been measured against that bar.",
    },
  ],
};

const CABIFY_DESIGN_SYSTEM: WorkCard = {
  id: "cabify-design-system",
  eyebrow: "DESIGN SYSTEM LEADERSHIP",
  signal:
    "Design owns the intent. Engineering owns the code. I owned the gap between them.",
  meta: "Cabify · 2019–2021 · led Marshal, the company's design system",
  link: {
    href: "https://cab-design-system.vercel.app/?path=/story/design-system-intro--page",
    label: "Browse Marshal in Storybook",
  },
  diagrams: [
    {
      href: "/work/diagrams/marshal",
      label: "Deep-dive: governing Marshal across design and engineering",
    },
  ],
  images: [
    { src: "/cabify.webp", alt: "Marshal, Cabify's design system, in Storybook" },
  ],
  blocks: [
    {
      kind: "problem",
      face: "Every component tweak queued behind one core team. Being correct wasn't the problem — being the only path to correct was.",
      expanded:
        "Marshal, Cabify's design system, started the way most do: one core team owned every component, so any change — even one a product team could clearly justify — waited in that team's queue. The system was right and slow, which in practice means teams start routing around it instead of through it.",
    },
    {
      kind: "decision",
      face: "A gray flag, not a lock: Tier 2 let teams promote their own components without waiting on us.",
      expanded:
        "I designed the tier system that fixed it. A Tier 2 flag marks a component as changeable without going through the core Marshal team, so a product team that needed to evolve one could promote it and move, instead of filing a ticket and waiting. I paired that with a Design↔Code status roadmap: one table tracking every component's design state and code state side by side, versioned, so 'is this actually done' had one visible answer instead of two teams' separate assumptions. Governance that unblocks people gets followed; governance that blocks them gets worked around.",
    },
    {
      kind: "craft",
      face: "We licensed Calibri and made it ours: rounded the a, tightened the i. Then a hidden bug in its vertical metrics broke line-height everywhere.",
      expanded:
        "Leading Marshal wasn't only process — I did design work inside it myself. We licensed Calibri and customized it for a bilingual, EU-wide brand: rounded the `a`, reduced the kerning, tightened the `i`. When it shipped, line-heights went subtly wrong across products — not a stylesheet bug, but damage to the font file's own vertical metrics from the customization itself. Debugging typography at the metrics level is the kind of deep dive that permanently changes how you read a rendered page.",
    },
    {
      kind: "outcome",
      face: "Office hours, an integrations showcase, and a triage queue: how components actually got adopted, not just published.",
      expanded:
        "Publishing components isn't the same as teams using them. I ran the adoption side directly: office hours in #t-frontend for teams onboarding to Marshal, a cross-team intake process where I triaged every new component or token request, and the 'Built with Marshal' showcase — real integrations proving the system worked with the libraries teams actually reached for (React Hook Form, React Step Wizard, remote entity tables, SWR), not just in isolation. Marshal shipped as an npm package, SCSS partials, or a CDN-hosted CSS bundle for non-React consumers — three integration paths, because 'just use React' isn't true for every team at that scale.",
    },
    {
      kind: "human",
      face: "The best design systems fail from either side: design that ships and engineering never adopts, or code that ships and design disowns.",
      expanded:
        "Leading Marshal meant being the person both sides trusted, which mostly meant translating: turning a designer's intent into something engineering could version and ship, and turning an engineering constraint into something design could work with instead of around. The part I'm proudest of isn't a component — it's the roadmap and the tier flags, the parts that made 'is this system trustworthy' answerable without asking me directly.",
    },
  ],
};

const POUK: WorkCard = {
  id: "pouk-ai",
  eyebrow: "GIVING BACK",
  signal: "Helping friends ship AI, pro bono.",
  meta: "Personal initiative",
  link: { href: "https://pouk.ai", label: "Visit pouk.ai" },
  images: [
    {
      src: "/pouk-pipeline.webp",
      alt: "Five-stage pipeline diagram: observe, model, plan, act, ship",
    },
  ],
  blocks: [
    {
      kind: "human",
      face: "Not a company. A personal brand for helping friends build and ship AI, free.",
      expanded:
        "pouk.ai is deliberately not a business. It's the name I put on helping friends build and ship AI: pro bono, because the people around me kept asking how, and teaching is how I understand things myself. Framing it honestly matters to me; it's initiative and generosity, not a startup in disguise.",
    },
    {
      kind: "craft",
      face: "Astro, my own design system, Argos visual regression, cookieless analytics.",
      expanded:
        "The site practices what I preach even when nobody's grading it: Astro for the build, a design system of my own, Argos visual regression so the UI can't silently rot, and cookieless analytics because respecting visitors is a default, not a feature. Small site, full care.",
    },
  ],
};

const AI_MODE: WorkCard = {
  id: "ai-mode-webby",
  eyebrow: "WEBBY HONOREE",
  signal: "A two-person team built an AI assistant. The industry noticed.",
  meta: "Freshworks · Webby Awards Honoree, Best Use of AI",
  link: { href: "/ai-mode-demo.webm", label: "Watch a demo" },
  references: [
    {
      href: "https://winners.webbyawards.com/2026/websites-and-mobile-sites/features-design/best-use-of-ai/373543/aipowered-web-assistant",
      label: "See the Webby Honoree listing",
    },
    {
      href: "/work/diagrams/ask-nova",
      label: "Deep-dive: Ask Nova design & architecture",
    },
  ],
  images: [
    {
      src: "/ai-mode.webp",
      alt: "The AI Mode assistant answering a question on freshworks.com",
    },
  ],
  blocks: [
    {
      kind: "problem",
      face: "Freshworks needed visitors to self-serve on freshworks.com without it feeling like hunting through menus.",
      expanded:
        "AI Mode is an AI-powered web assistant embedded as a sleek, unobtrusive toolbar on freshworks.com. Two of us built it: me on the front-end, one engineer on the back-end. The brief was self-service that didn't feel like self-service — smart search, instant summaries, and recommended journeys that help visitors find what they need without hunting for it.",
    },
    {
      kind: "craft",
      face: "Figma doesn't know how Safari actually renders. The gaps only showed up once we built it.",
      expanded:
        "The hardest part wasn't the AI, it was Safari. Figma's design tooling doesn't account for how certain Safari versions actually render, so gaps invisible in the design file only surfaced once the thing was built — mobile Safari worst of all. I fixed every one with pure CSS, no JavaScript workarounds: the kind of cross-browser craft that never makes a case-study slide but is most of the actual work.",
    },
    {
      kind: "decision",
      face: "Direct scraping beat structured Contentful pulls for the knowledge base. The messier source was the honest one.",
      expanded:
        "We tried two ways to feed the assistant's knowledge base: pulling structured entries from Contentful, and scraping the live pages directly. Direct scraping won — it matched what visitors actually see. Retrieval runs on Pinecone, with GPT-3 handling both the embeddings and the answer generation, and a content-moderation layer that curates what the system can reasonably be asked and falls back gracefully when a visitor goes off-topic.",
    },
    {
      kind: "outcome",
      face: "AI Mode earned a Webby Awards Honoree mention for Best Use of AI.",
      expanded:
        "AI Mode was recognized as a Webby Awards Honoree in the Best Use of AI category — real, external validation for a two-person team's work on a problem that's easy to get wrong: helping people self-serve without it feeling like talking to a chatbot.",
    },
  ],
};

const RAG_CHAT: WorkCard = {
  id: "rag-chat",
  eyebrow: "LIVE ON THIS SITE",
  signal: "Ask my portfolio anything. It answers.",
  meta: "ari.soy/skills · Claude SDK",
  link: { href: "/skills", label: "Try it on the Skills page" },
  images: [
    {
      src: "/rag-chat-illustration.webp",
      alt: "A person and a friendly robot having a conversation",
    },
  ],
  blocks: [
    {
      kind: "craft",
      face: "A RAG chat over my real career, built with the Claude SDK, running right here.",
      expanded:
        "The Skills page hosts an \"ask me anything about Arian\" chat: retrieval-augmented generation over a knowledge base of my actual career, built with the Claude SDK, embedded with Voyage, live on this site. Rate-limited, with a static fallback so it degrades gracefully instead of breaking.",
    },
    {
      kind: "decision",
      face: "Every fact in it was interviewed out of me. It refuses to improvise, and admits it's an AI.",
      expanded:
        "The knowledge base isn't scraped; it was built through structured interviews about what actually happened, so the chat is grounded in confirmed facts and nothing else. Ask it whether it's an AI and it says so plainly. The footer on this site reads \"1.85% AI, 98.15% Ari\" and the chat keeps the same honesty policy.",
    },
    {
      kind: "human",
      face: "A portfolio that can answer questions about itself felt like the right kind of meta.",
      expanded:
        "I build with AI daily, so the portfolio should demonstrate it rather than claim it. Letting visitors interrogate my own site, with real answers and honest limits, is the most direct proof of how I think AI should be shipped: grounded, restrained, and a little playful.",
    },
  ],
};

/**
 * Row layout mirrors the bento rhythm: wide pairs for the centerpieces,
 * trios for the supporting cards. Priority-ordered, strongest proof first:
 *
 * Row 1 — the two strongest opens: a Webby Honoree (third-party validation)
 *   and a still-in-production system with a hard metric (5x faster
 *   launches).
 * Row 2 — current, senior-level proof: leading AI×design at Freshworks now,
 *   owning a design system's governance end to end, shipping under a real
 *   deadline.
 * Row 3 — craft and judgment depth: motion as an owned discipline, the same
 *   problem modeled two opposite (and both correct) ways.
 * Row 4 — the reflective pair: where the quality bar was set (Apple, 2017),
 *   then the redesign that got cut by the numbers (Walmart, 2018-19) —
 *   origin story and honest failure read better placed together than
 *   scattered, after credibility is already established by rows 1-3.
 * Row 5 — Bruma, FitCounter, and Ephemeral group together: all personal
 *   design work with its own brand identity apart from ari.soy (Bruma and
 *   FitCounter are live; Ephemeral is unshipped concept work, kept honestly
 *   distinct in its own meta line).
 * Row 6 — the closing beat: RAG chat and pouk.ai are both personal, both
 *   meta (a live demo and a "look what I build for fun" note).
 *
 * The page scrolls; rows are not viewport-locked.
 */
export const WORK_ROWS: WorkCard[][] = [
  [AI_MODE, BRANDKIT],
  [AI_DESIGN_TO_CODE, CABIFY_DESIGN_SYSTEM, SIX_WEEK_REDESIGN],
  [MOTION, CONTENT_MODELING],
  [QUALITY_ORIGINS, CHECKOUT_AT_SCALE],
  [BRUMA, FITCOUNTER, EPHEMERAL],
  [RAG_CHAT, POUK],
];

