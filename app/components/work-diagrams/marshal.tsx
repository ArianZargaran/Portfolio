import React from "react";

/* Real data, read live from Marshal's own Storybook (design-system-status
   and design-system-color stories) at cab-design-system.vercel.app — not
   invented for this page. A representative slice, not the full ~90-token
   ramp set or the full ~30-component roadmap, kept small enough to read. */

const ROADMAP: {
  name: string;
  design: string;
  code: string;
  tone: "done" | "wip" | "hold";
}[] = [
  { name: "Avatar", design: "Done", code: "Done since 0.6.0", tone: "done" },
  { name: "Button", design: "Done", code: "Done since 0.2.0", tone: "done" },
  {
    name: "Ellipsis with tooltip",
    design: "Not considered",
    code: "Done since 8.2.2",
    tone: "hold",
  },
  { name: "Forms", design: "In progress", code: "In progress", tone: "wip" },
  {
    name: "Tooltip",
    design: "In progress",
    code: "Done since 5.9.0",
    tone: "wip",
  },
  { name: "Search", design: "Done", code: "Done since 12.4.0", tone: "done" },
];

const RAMPS: { label: string; swatches: string[] }[] = [
  {
    label: "Neutral (N)",
    swatches: [
      "#1A1A38",
      "#323252",
      "#62628A",
      "#ADADD6",
      "#E4E4F7",
      "#FFFFFF",
    ],
  },
  {
    label: "Green (G)",
    swatches: [
      "#275252",
      "#30A375",
      "#41CC94",
      "#8AE5C1",
      "#D2F5E7",
      "#E6FAF2",
    ],
  },
  {
    label: "Magenta (M)",
    swatches: [
      "#2C2643",
      "#5B39A8",
      "#8C5CFF",
      "#B696FF",
      "#E8DEFF",
      "#FAF8FF",
    ],
  },
  {
    label: "Red (R)",
    swatches: [
      "#5C3747",
      "#CC524A",
      "#FD665B",
      "#FFA49E",
      "#FFDEDB",
      "#FFECEB",
    ],
  },
  {
    label: "Blue (B)",
    swatches: [
      "#294773",
      "#3979CC",
      "#4694FA",
      "#84BAFF",
      "#D1E4FF",
      "#E5F0FF",
    ],
  },
  {
    label: "Orange (O)",
    swatches: [
      "#5F464E",
      "#C66F42",
      "#FC8549",
      "#FFBE9E",
      "#FFE4D6",
      "#FEF0EA",
    ],
  },
  {
    label: "Light Blue (LB)",
    swatches: [
      "#36526B",
      "#2097C9",
      "#34BFFA",
      "#85DAFF",
      "#D1F1FF",
      "#E5F7FF",
    ],
  },
  {
    label: "Pink (P)",
    swatches: [
      "#633457",
      "#C84C8E",
      "#F55DAE",
      "#FF9ED2",
      "#FFDBEE",
      "#FFEBF5",
    ],
  },
  {
    label: "Yellow (Y)",
    swatches: [
      "#5C4F42",
      "#C48F16",
      "#F3AF13",
      "#FFD36B",
      "#FFECBF",
      "#FFF5DE",
    ],
  },
];

const INTEGRATIONS = [
  "React Hook Form",
  "React Step Wizard",
  "Remote entity table",
  "SWR",
];

export const MarshalRef: React.FC = () => (
  <React.Fragment>
    <p className="work-diagram_eyebrow">
      Cabify · Marshal · design system leadership
    </p>
    <h1>Governing Marshal across design and engineering</h1>
    <p className="work-diagram_thesis">
      Marshal is Cabify&apos;s design system: React components distributed as
      an npm package, SCSS partials, or a CDN-hosted CSS bundle, documented
      live in Storybook. I led it from 2019 to 2021 &mdash; not by building
      every component, but by owning the governance and adoption that kept{" "}
      <b>design intent</b> and <b>shipped code</b> answerable to the same
      source of truth.
    </p>

    <div className="work-diagram_card">
      <span className="work-diagram_step">At a glance</span>
      <h2>What Marshal actually is</h2>
      <div className="work-diagram_grid4">
        <div className="work-diagram_p">
          <div className="work-diagram_h">~30 components</div>
          <div className="work-diagram_d">
            forms, navigation, feedback, layout — versioned individually,
            some tracing back to 0.2.0
          </div>
        </div>
        <div className="work-diagram_p">
          <div className="work-diagram_h">10 color ramps</div>
          <div className="work-diagram_d">
            neutral plus 9 hues, each 6&ndash;12 steps deep, semantically
            named (N, G, M, R, B, O, LB, P, Y)
          </div>
        </div>
        <div className="work-diagram_p">
          <div className="work-diagram_h">3 distributions</div>
          <div className="work-diagram_d">
            npm package, SCSS partials, or a vanilla CSS bundle over a CDN
            &mdash; not every team was on React
          </div>
        </div>
        <div className="work-diagram_p">
          <div className="work-diagram_h">1 shared roadmap</div>
          <div className="work-diagram_d">
            design status and code status tracked per component, on one
            table, not two teams&apos; separate assumptions
          </div>
        </div>
      </div>
    </div>

    <div className="work-diagram_card">
      <span className="work-diagram_step">The problem</span>
      <h2>Correct, and the only path to correct</h2>
      <p>
        Marshal started the way most design systems do: one core team owned
        every component, so any change &mdash; even one a product team could
        clearly justify &mdash; waited in that team&apos;s queue. The system
        was right and slow, which in practice means teams start routing
        around it instead of through it. A design system that only the core
        team can move doesn&apos;t scale past a handful of consumers.
      </p>
    </div>

    <div className="work-diagram_card">
      <span className="work-diagram_step">The governance fix</span>
      <h2>A gray flag, not a lock</h2>
      <p>
        I designed the tier system that fixed it.{" "}
        <span className="work-diagram_badge work-diagram_tier2">
          Tier 2 ⚪
        </span>{" "}
        marks a component as changeable without going through the core
        Marshal team &mdash; so a product team that needed to evolve one
        could promote it and move, instead of filing a ticket and waiting.
        Everything still gets tracked, just not gated.
      </p>
      <p>
        I paired that with a Design↔Code status roadmap: one table, one
        answer, versioned. A real slice of it, read live from Marshal&apos;s
        own status page:
      </p>
      <div className="work-diagram_rtable-wrap">
        <table className="work-diagram_rtable">
          <thead>
            <tr>
              <th>Component</th>
              <th>Design</th>
              <th>Code</th>
            </tr>
          </thead>
          <tbody>
            {ROADMAP.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td className={`work-diagram_${r.tone}`}>{r.design}</td>
                <td className={`work-diagram_${r.tone}`}>{r.code}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Governance that unblocks people gets followed; governance that
        blocks them gets worked around. That table is why &quot;is this
        actually done&quot; had one visible answer instead of a Slack thread.
      </p>
    </div>

    <div className="work-diagram_card">
      <span className="work-diagram_step">Hands-on design work</span>
      <h2>Not only process</h2>
      <p>
        We licensed Calibri and customized it for a bilingual, EU-wide
        brand: rounded the <code>a</code>, reduced the kerning, tightened
        the <code>i</code>. When it shipped, line-heights went subtly wrong
        across products &mdash; not a stylesheet bug, but damage to the font
        file&apos;s own vertical metrics from the customization itself.
        Debugging typography at the metrics level is the kind of deep dive
        that permanently changes how you read a rendered page.
      </p>
    </div>

    <div className="work-diagram_card">
      <span className="work-diagram_step">Driving adoption</span>
      <h2>Publishing isn&apos;t adoption</h2>
      <p>
        I ran that side directly: office hours in <code>#t-frontend</code>{" "}
        for teams onboarding to Marshal, and a cross-team intake process
        where I triaged every new component or token request myself. The
        &quot;Built with Marshal&quot; showcase proved the system worked
        with the libraries teams actually reached for, not just in
        isolation:
      </p>
      <div className="work-diagram_badges">
        {INTEGRATIONS.map((i) => (
          <span key={i} className="work-diagram_badge work-diagram_hot">
            {i}
          </span>
        ))}
      </div>
    </div>

    <div className="work-diagram_card">
      <span className="work-diagram_step">The token system</span>
      <h2>Color, semantically named</h2>
      <p>
        A sample of the real ramps &mdash; each family runs 6 to 12 steps in
        production; shown compressed here.
      </p>
      {RAMPS.map((ramp) => (
        <div className="work-diagram_ramp" key={ramp.label}>
          <div className="work-diagram_ramp-h">
            <b>{ramp.label}</b>
          </div>
          <div className="work-diagram_swatches">
            {ramp.swatches.map((color) => (
              <span
                key={color}
                className="work-diagram_sw"
                style={{ background: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      ))}
    </div>

    <div className="work-diagram_philosophy">
      <p className="work-diagram_q">
        &quot;Design owns the intent. Engineering owns the code. I owned the
        gap between them.&quot;
      </p>
      <p>
        The best design systems fail from either side: design that ships
        and engineering never adopts, or code that ships and design
        disowns. Leading Marshal meant translating constantly &mdash;
        turning a designer&apos;s intent into something engineering could
        version and ship, and turning an engineering constraint into
        something design could work with instead of around. The part
        worth keeping isn&apos;t a component; it&apos;s the roadmap and the
        tier flags, the parts that made &quot;is this system
        trustworthy&quot; answerable without asking me directly.
      </p>
    </div>

    <footer className="work-diagram_footer">
      Marshal · Cabify design system · Arian Zargaran ·{" "}
      <a
        href="https://cab-design-system.vercel.app/?path=/story/design-system-intro--page"
        target="_blank"
        rel="noopener noreferrer"
      >
        Browse it in Storybook ↗
      </a>
    </footer>
  </React.Fragment>
);
