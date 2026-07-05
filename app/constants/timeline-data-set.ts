/**
 * Source of timeline events for the about-me route. Append an entry to extend
 * the timeline; the page simply gets taller and the horizontal illustrations
 * track pans proportionally over the new total scroll height. Illustration
 * opacity is purely positional — each illustration peaks at full opacity when
 * centered in the window and fades out before its edges touch the frame, so
 * adding events does not require any change to `illustrations-track.tsx`.
 */
export interface TimelineEntry {
  id: string;
  headline: string;
  description: string;
  date: string;
  /** Optional card illustration, rendered above the headline. */
  image?: {
    src: string;
    alt: string;
  };
  /**
   * Optional longer version of the event, shown in the modal that opens when
   * the card is clicked. Supports the same inline Markdown as `description`.
   */
  story?: string;
}

export const data: TimelineEntry[] = [
  {
    id: "the-amiga-years",
    headline: "The Amiga Years",
    description:
      "It started at my grandpa's side, filling invoices on his old Amiga — and a Thomas the Train game that shipped on three floppy disks. **A passion was born before I knew its name.**",
    date: "The '90s",
    image: {
      src: "/timeline-amiga-years.png",
      alt: "Pixel-art scene of a boy and his grandfather in front of an Amiga computer",
    },
    story:
      "My earliest memories with a computer are at my grandpa's side, helping him fill out invoices on his old Amiga. It felt like serious, important work — and I loved being part of it. But the memory that stuck hardest is a Thomas the Train video game that came on **three floppy disks**: swapping disks mid-load, waiting, hoping — and then it *ran*. I didn't have the words for it yet, but that mix of patience, ritual, and magic is exactly what building software still feels like to me.",
  },
  {
    id: "the-tinkerer",
    headline: "The Tinkerer",
    description:
      "Teenage years spent elbow-deep in an old PC tower — fighting driver installs, adding hard drives, better cooling, more RAM. Then a first Mac opened another world: self-taught Photoshop, drawing in InDesign, producing videos in Final Cut Pro. *Pure exploration, pure creativity.*",
    date: "The 2000s",
    image: {
      src: "/timeline-the-tinkerer.png",
      alt: "Pixel-art split scene of a teenager upgrading a PC tower and creating on a Mac with Photoshop, InDesign, and Final Cut Pro",
    },
    story:
      "Before I ever wrote code, I took machines apart. I remember the eagerness to install new satellite receivers and devices at home, and the struggle — and eventual triumph — of getting every driver working on an old PC. I upgraded that tower piece by piece: new hard drives, better cooling, more RAM. Then my first Mac opened the other half of my brain: I taught myself to edit photos in Photoshop, to draw in InDesign, to produce videos in Final Cut Pro. **Engineering on one side, creativity on the other** — I've been living on that border ever since.",
  },
  {
    id: "the-leap",
    headline: "The Leap",
    description:
      "Left Spain for Cupertino to join **Apple** in QA & Localization for the Spanish market. My first time living an ocean away from everything I knew.",
    date: "April 2017",
    image: {
      src: "/timeline-the-leap.png",
      alt: "Pixel-art scene of a young engineer arriving at Apple's Infinite Loop campus in Cupertino",
    },
    story:
      "In April 2017 I left Spain for Cupertino to join **Apple** as a QA & Localization expert for the Spanish market — checking translation accuracy, functionality, and flow across languages and locales, working with marketing and engineering across international teams. It was my first time living an ocean away from everything and everyone I knew. To me, Apple is *the* example of professionalism: proof that things can always be built better, and with taste. That standard never left me.",
  },
  {
    id: "the-promise",
    headline: "The Promise",
    description:
      "At Apple I discovered what delivering a top-notch product really means — and I wanted that for my career. I promised myself to study and practice **every single day, no matter what**, until I earned my first job as a front-end engineer.",
    date: "2017",
    image: {
      src: "/timeline-the-promise.png",
      alt: "Pixel-art scene of a young developer studying web development late at night, with a learning roadmap and code on screen",
    },
    story:
      "I came to Apple thinking like an engineer — the goal was to get a job as a developer. What I discovered there was bigger: what it actually takes to deliver a **top-notch product**, and how it feels when people love what you ship. Quality wasn't optional there; it was a need. I wanted that for my career. So I made myself a promise: study, learn, and practice *every single day of the year, no matter what*, until I earned my first job as a professional front-end engineer. I kept it.",
  },
  {
    id: "proving-ground",
    headline: "Proving Ground",
    description:
      "The promise paid off: **walmart.com**, Cart & Checkout — my first job as an engineer, racing a titan like Amazon. No safety net, shipping straight to production, where every bug cost real dollars. Pressure taught me *confidence, responsibility, and maturity*.",
    date: "May 2018",
    image: {
      src: "/timeline-proving-ground.png",
      alt: "Pixel-art scene of an engineer arriving at the Walmart Labs office",
    },
    story:
      "The promise paid off: my first engineering job, at **walmart.com** — the Cart & Checkout team, racing a titan like Amazon in a brutal, high-impact market. Apple could afford perfection on its own schedule; Walmart was known for *fast delivery*, and we shipped straight to production, where any bug cost real dollars. I worked alongside some of the best developers I've ever met, kept odd hours when the team and the product needed it, and built for the web and the mobile app — where every break was expensive. That pressure forged the confidence, responsibility, and maturity I still carry.",
  },
  {
    id: "the-unplanned-chapter",
    headline: "The Unplanned Chapter",
    description:
      "A few months in Spain became two years when COVID hit. At **Cabify** — Spain's first unicorn — nothing was guaranteed, so I learned to *pivot fast* and drive change in rough terrain. That scramble is where things like Cabify Logistics were born.",
    date: "2019–2021",
    image: {
      src: "/timeline-unplanned-chapter.png",
      alt: "Pixel-art scene of a developer planning delivery routes from a Madrid balcony overlooking an empty Gran Via at dusk during lockdown",
    },
    story:
      "The plan was a few months back in Spain. Then COVID hit us straight in the face, and the world — and the borders — closed. Luckily, or maybe because I sensed the stay wouldn't be short, I had joined **Cabify** in Madrid: Spain's first unicorn. Nothing about that time was guaranteed, so I learned to build, drive, and grow in a truly unsettled environment. I was often the motor of change — pivoting fast, finding solutions in rough terrain. That's the scramble that gave birth to things like *Cabify Logistics*, the last-mile delivery service. In November 2021, the world reopened and so did my American chapter.",
  },
  {
    id: "back-for-more",
    headline: "Back for More",
    description:
      "Returned to the US to join **Airtable**, where design and engineering finally converged: I led the Brandkit Design System and cut dev time **5x**. Just as important: crazy deadlines faced as one team, mentoring peers, and some of the strongest friendships of my career.",
    date: "November 2021",
    image: {
      src: "/timeline-back-for-more.png",
      alt: "Pixel-art scene of a design-system lead presenting a component library on a large screen while teammates collaborate",
    },
    story:
      "Airtable was where design and engineering finally converged for me: I led the **Brandkit Design System** — atomic design, component APIs, governance — and cut development time 5x. But what marked me most was the humanity. Crazy deadlines faced without hesitation, as one team. I became a mentor to peers and tried to lead with responsibility and teach with my best will. It's where my cycling analogy was born: *some days you ride as the leader, some days as the gregario* — pulling for someone else's win. Both days matter. Some of the strongest friendships of my career started there.",
  },
  {
    id: "the-new-paradigm",
    headline: "The New Paradigm",
    description:
      "At **Freshworks** I found freedom that comes with responsibility — and room to reinvent how we build. Coding has changed and will never be the same again. *Thankfully.* Constant delivery, constant iteration, prototyping — all powered by AI.",
    date: "September 2025",
    image: {
      src: "/timeline-new-paradigm.png",
      alt: "Pixel-art scene of a developer pair-programming with an AI assistant across two monitors, Dallas skyline outside and a poster reading The Way We Build Has Changed, Thankfully",
    },
    story:
      "**Freshworks** has been the place for innovation — a change of paradigm, and an environment where freedom comes with responsibility and a lot of space for growth. My peers and I carved out room inside a big company for constant delivery, constant iteration, and prototyping, all built on the new paradigm of AI. Out of that came **AI Mode**, the AI-powered Web Assistant I built — honored at the 2026 Webby Awards for *Best Use of AI*. Coding has changed and will never be the same again. Thankfully. I wouldn't want it any other way.",
  },
  {
    id: "engineering-x-aesthetics",
    headline: "Engineering × Aesthetics",
    description:
      "Legos, cooking, home renovations — everything I love shares the same DNA: **craft plus beauty**. Apple taught me they're inseparable; *good design is the user experience*. It's what I bring to every interface I build.",
    date: "Always",
    image: {
      src: "/timeline-engineering-aesthetics.png",
      alt: "Triptych of hands assembling a Lego architecture set, a plated homemade dish, and a freshly leveled wooden shelf",
    },
    story:
      "Since I was a child I've been the kind of person who loves style and aesthetics — and it gets really interesting when you mix that with engineering. Look at everything I do for fun: **Legos, cooking, home renovations**. All of them share the same DNA — a craft that has to *work* and a result that has to be *beautiful*. Neither half is optional. Part of that learning comes from Apple, a company famous for its care for UI and UX, and it's what I try to bring to my work daily. I feel genuinely moved by the fact that I get to build user experiences through interfaces: good design comes with the best user experience, and vice versa.",
  },
  {
    id: "my-principles",
    headline: "My Principles",
    description:
      "Three rules I live by. **Quality is a need, not an option** — be good to the user. **Do the simple thing that works**, then make it better every single day. And **high trust, low ego** — some days you ride as the leader, some days as the *gregario*.",
    date: "Today",
    image: {
      src: "/timeline-my-principles.png",
      alt: "Pixel-art scene of two teammate cyclists on a sunrise mountain road, one passing a water bottle to the other",
    },
    story:
      "Every chapter above distilled into three rules. **Quality is a need, not an option** — Apple taught me that delivering something people love isn't polish at the end; it's generosity toward the person on the other side of the screen. **Do the simple thing that works, then make it better every single day** — Walmart taught me to ship fast without a safety net, and my own promise taught me that daily practice compounds into everything. **High trust, low ego** — Airtable taught me that some days you ride as the leader and some days as the *gregario*, and the team wins either way. These aren't aspirations; they're habits with scars behind them.",
  },
  {
    id: "to-be-continued",
    headline: "",
    description: "",
    date: "To be continued...",
  },
];
