import React from "react";

export const AskNovaRef: React.FC = () => (
  <React.Fragment>
    <p className="work-diagram_eyebrow">
      AI Mode · embedded assistant · reference
    </p>
    <h1>Ask Nova — design &amp; architecture</h1>
    <p className="work-diagram_thesis">
      A production-shaped embedded assistant that treats reliability as{" "}
      <b>architecture</b>: deterministic answers where they must be exact,
      retrieval-grounded generation where they can&apos;t be, and a
      guardrail that moves policy into code, not prompts.
    </p>

    <div className="work-diagram_card">
      <span className="work-diagram_step">Core principle</span>
      <h2>Three categories, three treatments</h2>
      <p>
        &quot;Exact things stay exact. Generated things stay grounded.
        Sensitive things stay human.&quot;
      </p>
      <div className="work-diagram_frames">
        <div className="work-diagram_frame">
          <div className="work-diagram_ft">Exact</div>
          <div className="work-diagram_fd">
            High-traffic intents like &quot;summarize this page&quot; are
            pre-computed per route and streamed from cache. Zero latency,
            always on-message.
          </div>
        </div>
        <div className="work-diagram_frame">
          <div className="work-diagram_ft">Grounded</div>
          <div className="work-diagram_fd">
            Knowledge questions run through RAG with real citations,
            reranking, and a confidence threshold. The answer is only as
            good as the docs.
          </div>
        </div>
        <div className="work-diagram_frame">
          <div className="work-diagram_ft">Sensitive</div>
          <div className="work-diagram_fd">
            Pricing, sales, billing — structurally unreachable. Intercepted
            at query time and absent from the vector index entirely.
          </div>
        </div>
      </div>
    </div>

    <div className="work-diagram_card">
      <span className="work-diagram_step">Pipeline</span>
      <h2>Recall, then rerank</h2>
      <p>
        Retrieval is a two-stage funnel: a wide, cheap recall pass narrowed
        by a precise, expensive rerank pass.
      </p>
      <div className="work-diagram_pipe">
        <div className="work-diagram_pnode">
          <div className="work-diagram_pt">Docs</div>
          <div className="work-diagram_pd">markdown corpus</div>
        </div>
        <span className="work-diagram_parrow">→</span>
        <div className="work-diagram_pnode">
          <div className="work-diagram_pt">Chunk</div>
          <div className="work-diagram_pd">heading-aware, ~900ch</div>
        </div>
        <span className="work-diagram_parrow">→</span>
        <div className="work-diagram_pnode">
          <div className="work-diagram_pt">Embed</div>
          <div className="work-diagram_pd">Voyage 3-lite</div>
        </div>
        <span className="work-diagram_parrow">→</span>
        <div className="work-diagram_pnode">
          <div className="work-diagram_pt">Index</div>
          <div className="work-diagram_pd">pgvector or file</div>
        </div>
        <span className="work-diagram_parrow">→</span>
        <div className="work-diagram_pnode">
          <div className="work-diagram_pt">Recall</div>
          <div className="work-diagram_pd">cosine, top-12</div>
        </div>
        <span className="work-diagram_parrow">→</span>
        <div className="work-diagram_pnode">
          <div className="work-diagram_pt">Rerank</div>
          <div className="work-diagram_pd">rerank-2-lite, top-4</div>
        </div>
        <span className="work-diagram_parrow">→</span>
        <div className="work-diagram_pnode work-diagram_model">
          <div className="work-diagram_pt">Generate</div>
          <div className="work-diagram_pd">Claude Sonnet, SSE</div>
        </div>
      </div>
      <p>
        <b>Recall</b> (cosine similarity) retrieves 12 candidates — a low
        budget on purpose, since high recall with low precision just
        hallucinates later. <b>Rerank</b> (Voyage&apos;s rerank-2-lite) is a
        cross-encoder that re-scores those 12 and keeps the top 4. The
        rerank score gates the UI: <b>≥0.5</b> shows an answer, below it
        falls back to a contact-sales card.
      </p>
      <p>
        Follow-ups are rewritten into standalone queries by Claude Haiku
        before retrieval, so multi-turn works without an expensive context
        window — and the rewrite doubles as the surface where a second
        guardrail catches paraphrased intent.
      </p>
      <span className="work-diagram_codelabel">Storage</span>
      <p>
        One interface, two backends. With <code>DATABASE_URL</code> set, it
        runs Postgres + pgvector — the production path, shared across
        instances. Without it, a local file/in-memory index runs on Vercel
        (what the live demo uses). Swapping in a free Neon/Supabase
        Postgres is one env var, no code.
      </p>
      <p>
        Ingestion is hash-incremental: each chunk is hashed, compared
        against the index, and only deltas get re-embedded and reranked. A
        full re-index of the demo docs runs in ~200ms.
      </p>
    </div>

    <div className="work-diagram_card">
      <span className="work-diagram_step">Design decisions</span>
      <h2>Where the judgment calls live</h2>
      <div className="work-diagram_frames">
        <div className="work-diagram_frame">
          <div className="work-diagram_ft">Summaries are canned</div>
          <div className="work-diagram_fd">
            Pre-computed per route slug, streamed as if live. Instant,
            on-brand, zero model cost.
          </div>
        </div>
        <div className="work-diagram_frame">
          <div className="work-diagram_ft">Confidence gates the UI</div>
          <div className="work-diagram_fd">
            Below the rerank threshold, the UI hands off to sales instead of
            guessing. Low confidence triggers a fallback, not a
            hallucination.
          </div>
        </div>
        <div className="work-diagram_frame">
          <div className="work-diagram_ft">Pricing is unreachable</div>
          <div className="work-diagram_fd">
            Intercepted twice — before and after query rewrite — and
            excluded from the index. The model can&apos;t invent a discount
            it never saw.
          </div>
        </div>
        <div className="work-diagram_frame">
          <div className="work-diagram_ft">Inline citations</div>
          <div className="work-diagram_fd">
            Every answer lists <code>[1][2]</code> against a source rail
            ranked by rerank score, so grounding is checkable at a glance.
          </div>
        </div>
        <div className="work-diagram_frame">
          <div className="work-diagram_ft">Consent gates first use</div>
          <div className="work-diagram_fd">
            A data-processing notice and generative-AI disclaimer appear
            once per browser, stored in <code>localStorage</code>.
          </div>
        </div>
        <div className="work-diagram_frame">
          <div className="work-diagram_ft">Input survives navigation</div>
          <div className="work-diagram_fd">
            The bottom-center &quot;Ask Nova&quot; widget doesn&apos;t
            unmount on route change — it knows what page you&apos;re on,
            even a custom 404.
          </div>
        </div>
      </div>
    </div>

    <div className="work-diagram_philosophy work-diagram_guard">
      <p className="work-diagram_q">Defense in depth: pricing</p>
      <p>
        <b>1. Keyword interception</b> — &quot;cost&quot;,
        &quot;price&quot;, &quot;plan&quot;, &quot;billing&quot; hand off to
        sales immediately. No retrieval.
      </p>
      <p>
        <b>2. Intent detection after rewrite</b> — a paraphrase like
        &quot;what would that set me back?&quot; carries no pricing
        keywords, but Haiku&apos;s query rewrite exposes the intent, and a
        second gate catches it.
      </p>
      <p>
        <b>3. Index exclusion</b> — pricing pages are excluded from the
        vector index at ingestion. Even an out-of-distribution prompt
        can&apos;t fish for pricing context.
      </p>
    </div>

    <div className="work-diagram_card">
      <span className="work-diagram_step">Multi-turn</span>
      <h2>Query condensation, not raw history</h2>
      <p>
        Instead of passing the full transcript to retrieval, Claude Haiku
        rewrites each follow-up into a standalone query carrying the
        context it needs. Retrieval stays cheap, and the rewrite makes
        intent visible to the guardrails.
      </p>
      <div className="work-diagram_tok work-diagram_base">
        <span>User</span>
        <span>&quot;Does Northline have AI features?&quot;</span>
      </div>
      <div className="work-diagram_tok work-diagram_base">
        <span>User, follow-up</span>
        <span>&quot;How long until it starts working?&quot;</span>
      </div>
      <div className="work-diagram_tok work-diagram_var">
        <span>Haiku rewrite</span>
        <span className="work-diagram_v">
          &quot;How long until Northline AI features start working after
          setup?&quot;
        </span>
      </div>
      <p>
        All responses stream over SSE, canned and generated alike — the
        input disables mid-stream, and citations appear as they&apos;re
        listed in the response.
      </p>
    </div>

    <div className="work-diagram_card">
      <span className="work-diagram_step">Sample runs</span>
      <h2>The demo flow</h2>
      <p>
        The{" "}
        <a href="https://ai-mode-lac.vercel.app" target="_blank" rel="noopener noreferrer">
          live demo
        </a>{" "}
        walks through 8 scenarios that exercise the architecture above.
      </p>
      <div className="work-diagram_flow">
        <div className="work-diagram_stage">
          <div className="work-diagram_rail">
            <div className="work-diagram_num">1</div>
            <div className="work-diagram_stagelink" />
          </div>
          <div className="work-diagram_stagebody">
            <span className="work-diagram_k">Trust</span>
            <h2>Consent gate</h2>
            <p>
              First interaction opens a compliance dialog — data-processing
              notice, generative-AI disclaimer, accept/cancel — before
              anything is processed.
            </p>
          </div>
        </div>

        <div className="work-diagram_stage">
          <div className="work-diagram_rail">
            <div className="work-diagram_num">2</div>
            <div className="work-diagram_stagelink" />
          </div>
          <div className="work-diagram_stagebody">
            <span className="work-diagram_k">Deterministic</span>
            <h2>Instant page summary</h2>
            <p>
              &quot;Summarize this page&quot; returns a pre-defined summary
              keyed to the current route slug, streamed like a live answer.
              Zero model calls.
            </p>
          </div>
        </div>

        <div className="work-diagram_stage">
          <div className="work-diagram_rail">
            <div className="work-diagram_num">3</div>
            <div className="work-diagram_stagelink" />
          </div>
          <div className="work-diagram_stagebody">
            <span className="work-diagram_k">Retrieval</span>
            <h2>Cited RAG answer</h2>
            <p>
              &quot;Does Northline have AI features?&quot; streams an
              answer with inline <code>[1][2]</code> citations and a source
              rail ranked by true rerank scores (~0.7).
            </p>
          </div>
        </div>

        <div className="work-diagram_stage">
          <div className="work-diagram_rail">
            <div className="work-diagram_num">4</div>
            <div className="work-diagram_stagelink" />
          </div>
          <div className="work-diagram_stagebody">
            <span className="work-diagram_k">Multi-turn</span>
            <h2>Follow-up resolution</h2>
            <p>
              &quot;How long until it starts working?&quot; resolves
              &quot;it&quot; via history-aware query rewriting before
              retrieval — the answer cites the 30-day learning window.
            </p>
          </div>
        </div>

        <div className="work-diagram_stage work-diagram_guard">
          <div className="work-diagram_rail">
            <div className="work-diagram_num">5</div>
            <div className="work-diagram_stagelink" />
          </div>
          <div className="work-diagram_stagebody work-diagram_guard">
            <span className="work-diagram_k">Guardrail</span>
            <h2>Pricing — direct ask</h2>
            <p>
              &quot;What does Northline cost?&quot; never reaches the
              model: a fixed hand-off routes to sales, no numbers, no plan
              advice.
            </p>
          </div>
        </div>

        <div className="work-diagram_stage work-diagram_guard">
          <div className="work-diagram_rail">
            <div className="work-diagram_num">6</div>
            <div className="work-diagram_stagelink" />
          </div>
          <div className="work-diagram_stagebody work-diagram_guard">
            <span className="work-diagram_k">Guardrail · depth</span>
            <h2>Pricing — paraphrased follow-up</h2>
            <p>
              &quot;…and what would that set me back?&quot; has zero
              pricing keywords, but the history rewrite exposes the intent
              and a second gate catches it. Survives paraphrase.
            </p>
          </div>
        </div>

        <div className="work-diagram_stage">
          <div className="work-diagram_rail">
            <div className="work-diagram_num">7</div>
            <div className="work-diagram_stagelink" />
          </div>
          <div className="work-diagram_stagebody">
            <span className="work-diagram_k">Grounding</span>
            <h2>Honest negatives &amp; unknowns</h2>
            <p>
              &quot;Do you integrate with Microsoft Teams?&quot; answers
              &quot;not natively yet,&quot; cited from docs (0.68). An
              out-of-corpus ask (&quot;on-premise version?&quot;) admits the
              docs don&apos;t cover it — score 0.44, below threshold, falls
              back to sales. No hallucinated yes.
            </p>
          </div>
        </div>

        <div className="work-diagram_stage">
          <div className="work-diagram_rail">
            <div className="work-diagram_num">8</div>
          </div>
          <div className="work-diagram_stagebody work-diagram_win">
            <span className="work-diagram_k">Context awareness</span>
            <h2>The 404 knows where you are</h2>
            <p>
              On a custom 404 (a giant &quot;4⊙4&quot; with an animated
              wireframe gyroscope as the zero), &quot;summarize this
              page&quot; returns &quot;You&apos;re on a page that
              doesn&apos;t exist — here&apos;s where to go instead,&quot;
              linking the four real pages.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div className="work-diagram_card">
      <span className="work-diagram_step">Stack</span>
      <h2>What it&apos;s built on</h2>
      <div className="work-diagram_badges">
        <span className="work-diagram_badge work-diagram_hot">
          Next.js 15 · App Router
        </span>
        <span className="work-diagram_badge work-diagram_hot">
          Claude Sonnet · generation
        </span>
        <span className="work-diagram_badge work-diagram_hot">
          Claude Haiku · query rewrite
        </span>
        <span className="work-diagram_badge">
          Voyage AI · embeddings + rerank
        </span>
        <span className="work-diagram_badge">Postgres · pgvector</span>
        <span className="work-diagram_badge">SSE streaming</span>
        <span className="work-diagram_badge">Hash-incremental ingestion</span>
        <span className="work-diagram_badge">Canvas 3D · no deps</span>
        <span className="work-diagram_badge">Vercel</span>
        <span className="work-diagram_badge">Per-IP rate limiting</span>
      </div>
    </div>

    <footer className="work-diagram_footer">
      Ask Nova · AI Mode · Northline (fictional demo) · Arian Zargaran
    </footer>
  </React.Fragment>
);
