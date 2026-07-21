import React from "react";

export const ContentModelingDiagram: React.FC = () => (
  <React.Fragment>
    <p className="work-diagram_eyebrow">
      Airtable vs Freshworks · headless CMS
    </p>
    <h1>Two ways to model content</h1>
    <p className="work-diagram_thesis">
      Same problem — a marketing site on <b>Next.js, SSG + ISR</b>. Both
      diverged on one question: should a content model mirror the{" "}
      <b>component</b>, or the <b>entity</b>? Underneath it sits the real
      tradeoff — <b>flexibility vs consistency</b>, and who owns the
      creativity.
    </p>

    <div className="work-diagram_spectrum">
      <div className="work-diagram_bar">
        <span className="work-diagram_pinlbl work-diagram_a">Airtable</span>
        <span className="work-diagram_pin work-diagram_a" />
        <span className="work-diagram_pinlbl work-diagram_b">
          Freshworks
        </span>
        <span className="work-diagram_pin work-diagram_b" />
      </div>
      <div className="work-diagram_ends">
        <span>
          <b>Flexibility</b> · producer-authored
        </span>
        <span>
          <b>Consistency</b> · design-authored
        </span>
      </div>
    </div>

    <div className="work-diagram_cols">
      <div className="work-diagram_col work-diagram_a">
        <div className="work-diagram_co">Presentation-first</div>
        <h2>Models mirror components</h2>
        <p className="work-diagram_ph">
          One fat model per section, shaped by how it&apos;s displayed.
        </p>
        <div className="work-diagram_model">
          <span className="work-diagram_t">Hero</span>{" "}
          <span className="work-diagram_muted">{"{"}</span>
          <br />
          &nbsp;&nbsp;heading, subheading, eyebrow,
          <br />
          &nbsp;&nbsp;media, mediaPosition, alignment,
          <br />
          &nbsp;&nbsp;background, variant, ctaText,
          <br />
          &nbsp;&nbsp;ctaUrl, theme, padding…{" "}
          <span className="work-diagram_muted">~18 fields</span>
          <br />
          <span className="work-diagram_muted">{"}"}</span>
        </div>
        <div className="work-diagram_who">
          <span className="work-diagram_k">Creativity lands on</span>
          <b>The producer</b> — art-directs every element of the page.
        </div>
        <div className="work-diagram_pills">
          <span className="work-diagram_pill work-diagram_good">
            flexible
          </span>
          <span className="work-diagram_pill work-diagram_good">
            producer autonomy
          </span>
          <span className="work-diagram_pill work-diagram_cost">
            bloats over time
          </span>
          <span className="work-diagram_pill work-diagram_cost">
            drift / long-tail
          </span>
          <span className="work-diagram_pill work-diagram_cost">
            heavier builds
          </span>
        </div>
      </div>

      <div className="work-diagram_col work-diagram_b">
        <div className="work-diagram_co">Entity-first (domain-driven)</div>
        <h2>Models mirror entities</h2>
        <p className="work-diagram_ph">
          Like relational tables — decoupled from presentation.
        </p>
        <div className="work-diagram_model">
          <span className="work-diagram_t">Client</span>{" "}
          <span className="work-diagram_muted">{"{"}</span>
          <br />
          &nbsp;&nbsp;name, industry, logos[],
          <br />
          &nbsp;&nbsp;testimonials[], metrics{"{}"},
          <br />
          &nbsp;&nbsp;media[]
          <br />
          <span className="work-diagram_muted">{"}"}</span>
          <br />
          <span className="work-diagram_reuse">
            → reused by <b>Hero · Logo wall · Case study · Quote</b>
          </span>
        </div>
        <div className="work-diagram_who">
          <span className="work-diagram_k">Creativity lands on</span>
          <b>The designer</b> — decides the mapping; creativity within a
          known data contract.
        </div>
        <div className="work-diagram_pills">
          <span className="work-diagram_pill work-diagram_good">
            reusable · one source
          </span>
          <span className="work-diagram_pill work-diagram_good">
            consistent by default
          </span>
          <span className="work-diagram_pill work-diagram_good">
            predictable
          </span>
          <span className="work-diagram_pill work-diagram_good">
            fast builds
          </span>
          <span className="work-diagram_pill work-diagram_cost">
            rigid · adapter layer
          </span>
        </div>
      </div>
    </div>

    <div className="work-diagram_verdict">
      <h3>The judgment — no universal winner</h3>
      <p>
        <b>Rigidity is a feature:</b> Freshworks&apos; structure is
        governance made structural — it makes the wrong thing impossible.
      </p>
      <p>
        <b>Flexibility has a hidden cost:</b> it&apos;s the source of the
        Brandkit mess — drift, the broken long tail, ten button variants.
        Someone always pays for flexibility in consistency + maintenance.
      </p>
      <p>
        <b>When each wins:</b> presentational → few, bespoke, art-directed
        campaign pages, marketing autonomy. Entity → content scales, reuse
        matters, brand consistency is paramount.
      </p>
      <div className="work-diagram_hybrid">
        <b>The mature answer is a hybrid</b> — entity model as the source of
        truth, plus a <em>controlled</em> set of art-directable slots where
        a page earns being special. Structure by default, flexibility on
        purpose.
      </div>
    </div>

    <footer className="work-diagram_footer">
      Content modeling · Airtable vs Freshworks · Arian Zargaran
    </footer>
  </React.Fragment>
);
