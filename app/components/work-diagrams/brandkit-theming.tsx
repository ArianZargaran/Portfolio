import React from "react";

export const BrandkitThemingDiagram: React.FC = () => (
  <React.Fragment>
    <p className="work-diagram_eyebrow">Airtable · Brandkit design system</p>
    <h1>Semantic theming</h1>
    <p className="work-diagram_thesis">
      A dynamic brand meant <b>27 color themes</b> to maintain. Instead of
      building 27, I found the three axes underneath them — and the fact
      that <b>almost nothing actually changes between themes.</b>
    </p>

    <div className="work-diagram_card">
      <div className="work-diagram_step">
        <b>1</b> The problem, reframed
      </div>
      <h2>Three orthogonal axes, not 27 special cases</h2>
      <p className="work-diagram_sub">
        Every theme is fully described by three independent controls. Change
        one, keep the rest.
      </p>
      <div className="work-diagram_axes">
        <div className="work-diagram_axis">
          <div className="work-diagram_axis-h">
            <span className="work-diagram_n">Main color</span>
            <span className="work-diagram_k">9 options</span>
          </div>
          <div className="work-diagram_swatches">
            {[
              "#2d7ff9",
              "#0fa3a3",
              "#7c5cff",
              "#e0484d",
              "#f0803c",
              "#20a464",
              "#e254a3",
              "#f2b01e",
              "#22b8cf",
            ].map((color) => (
              <span
                key={color}
                className="work-diagram_sw"
                style={{ background: color }}
              />
            ))}
          </div>
        </div>
        <div className="work-diagram_axis">
          <div className="work-diagram_axis-h">
            <span className="work-diagram_n">Mode</span>
            <span className="work-diagram_k">2 options</span>
          </div>
          <div className="work-diagram_chips">
            <span className="work-diagram_chip">☀ light</span>
            <span className="work-diagram_chip">☾ dark</span>
          </div>
        </div>
        <div className="work-diagram_axis">
          <div className="work-diagram_axis-h">
            <span className="work-diagram_n">Prominence</span>
            <span className="work-diagram_k">
              3 options · coined the term
            </span>
          </div>
          <div className="work-diagram_prom">
            <span style={{ background: "color-mix(in srgb,#2d7ff9 45%,#888)" }}>
              subtle
            </span>
            <span style={{ background: "color-mix(in srgb,#2d7ff9 75%,#555)" }}>
              default
            </span>
            <span style={{ background: "#2d7ff9" }}>strong</span>
          </div>
        </div>
      </div>
      <div className="work-diagram_eq">
        <b>9</b> colors <span>×</span> <b>3</b> prominence <span>=</span>
        <span className="work-diagram_big">27 themes</span>
        <span>· × light / dark</span>
      </div>
    </div>

    <div className="work-diagram_card">
      <div className="work-diagram_step">
        <b>2</b> The insight that made it cheap
      </div>
      <h2>Most tokens are shared. Only the delta varies.</h2>
      <p className="work-diagram_sub">
        The combinatorial explosion was mostly an illusion — the
        overwhelming majority of tokens are identical across every theme.
        Only a handful actually change.
      </p>
      <div className="work-diagram_cols">
        <div className="work-diagram_col">
          <h3>Shared base</h3>
          <p className="work-diagram_pct">~the vast majority · defined once</p>
          <div className="work-diagram_tok work-diagram_base">
            <span>--text-heading</span>
            <span className="work-diagram_v">always ink</span>
          </div>
          <div className="work-diagram_tok work-diagram_base">
            <span>--text-body</span>
            <span className="work-diagram_v">always ink-soft</span>
          </div>
          <div className="work-diagram_tok work-diagram_base">
            <span>--border-default</span>
            <span className="work-diagram_v">shared</span>
          </div>
          <div className="work-diagram_tok work-diagram_base">
            <span>--surface</span>
            <span className="work-diagram_v">shared</span>
          </div>
          <div className="work-diagram_tok work-diagram_base">
            <span>--radius, --space…</span>
            <span className="work-diagram_v">shared</span>
          </div>
        </div>
        <div className="work-diagram_col work-diagram_delta">
          <h3>The delta</h3>
          <p className="work-diagram_pct">only a few · redefined per theme</p>
          <div className="work-diagram_tok work-diagram_var">
            <span>--upsell-background</span>
          </div>
          <div className="work-diagram_tok work-diagram_var">
            <span>--highlight-text</span>
          </div>
          <div className="work-diagram_tok work-diagram_var">
            <span>--accent-*</span>
          </div>
          <div className="work-diagram_tok work-diagram_var">
            <span>…a small set</span>
          </div>
        </div>
      </div>
    </div>

    <div className="work-diagram_card">
      <div className="work-diagram_step">
        <b>3</b> The implementation
      </div>
      <h2>CSS-class namespaces that override only the delta</h2>
      <p className="work-diagram_sub">
        A shared base on <code>:root</code>. All three params — <b>color ·
        prominence · mode</b> — compound into a <em>single</em> utility
        class carrying only the delta. Components read tokens via{" "}
        <code>var()</code>, so they&apos;re <b>theme-agnostic</b> — the
        namespace above supplies the values.
      </p>
      <div className="work-diagram_codelabel">Stylesheet</div>
      <pre>
        <code>
          <span className="work-diagram_cc">
            {"/* base — loaded once, shared by every theme */"}
          </span>
          {"\n"}
          <span className="work-diagram_ck">:root</span>
          {" {\n  --text-heading: "}
          <span className="work-diagram_cs">#14181f</span>
          {";\n  --surface:      "}
          <span className="work-diagram_cs">#ffffff</span>
          {";\n  "}
          <span className="work-diagram_cc">
            {"/* …the vast majority of tokens live here */"}
          </span>
          {"\n}\n\n"}
          <span className="work-diagram_cc">
            {"/* ONE compound class = color + prominence + mode */"}
          </span>
          {"\n"}
          <span className="work-diagram_cc">
            {"/* carries ONLY the delta for that exact variant  */"}
          </span>
          {"\n"}
          <span className="work-diagram_ck">.theme-blue-strong-dark</span>
          {" {\n  --upsell-background: "}
          <span className="work-diagram_cs">#2d7ff9</span>
          {";\n  --highlight-text:    "}
          <span className="work-diagram_cs">#4d9bff</span>
          {";\n}\n\n"}
          <span className="work-diagram_cc">
            {"/* a component just reads the tokens — theme-agnostic */"}
          </span>
          {"\n"}
          <span className="work-diagram_ck">.upsell-card</span>
          {" {\n  background: "}
          <span className="work-diagram_ck">var</span>
          {"(--upsell-background);\n  color:      "}
          <span className="work-diagram_ck">var</span>
          {"(--highlight-text);\n}"}
        </code>
      </pre>
      <div className="work-diagram_codelabel">Consumed in React (JSX)</div>
      <pre>
        <code>
          <span className="work-diagram_cc">
            {"// the namespace supplies tokens; children read them"}
          </span>
          {"\n<"}
          <span className="work-diagram_ck">section</span>
          {" className="}
          <span className="work-diagram_cs">
            &quot;theme-blue-strong-dark&quot;
          </span>
          {">\n  <"}
          <span className="work-diagram_ck">UpsellCard</span>
          {" />   "}
          <span className="work-diagram_cc">
            {"// .upsell-card → var(--upsell-background)"}
          </span>
          {"\n</"}
          <span className="work-diagram_ck">section</span>
          {">"}
        </code>
      </pre>
      <div className="work-diagram_out">
        <div className="work-diagram_stat">
          <div className="work-diagram_big">27</div>
          <div className="work-diagram_lbl">themes, light + dark</div>
        </div>
        <div className="work-diagram_stat">
          <div className="work-diagram_big">3</div>
          <div className="work-diagram_lbl">controls to reason about</div>
        </div>
        <div className="work-diagram_stat">
          <div className="work-diagram_big">~0</div>
          <div className="work-diagram_lbl">perf cost · load the delta</div>
        </div>
        <div className="work-diagram_stat">
          <div className="work-diagram_big">1</div>
          <div className="work-diagram_lbl">shared base of truth</div>
        </div>
      </div>
    </div>

    <footer className="work-diagram_footer">
      Semantic theming · Airtable Brandkit · Arian Zargaran
    </footer>
  </React.Fragment>
);
