import React, { useCallback, useEffect, useRef, useState } from "react";

/* Motion & Micro-interactions spec sheet — React port of the standalone
   artifact this page was authored in. The three rigs are live reproductions
   of the CSS/JS driving the real components, not mockups, so the behaviour
   below is ported mechanism-for-mechanism: the artifact's inline <script>
   blocks become effects and refs, but the maths, the constants, and the
   properties being written are unchanged.

   Styles live in app/stylesheets/motion-spec-sheet.css, scoped entirely under
   .motion-lab-page / .motion-lab. */

/* ============================================================
   Rig 01 — direction-aware flip + its own on-load peek
   ============================================================ */

const FlipRig: React.FC = () => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  /* A running total, not a 0/180 toggle: clicking the same side over and
     over must keep spinning that same way (-180, -360, -540, ...), not snap
     back through flat. Only the SIGN of each click's contribution depends on
     which half was clicked; the accumulated total drives the --ml-spin custom
     property (see CSS), never the transform directly — that's what lets the
     peek compose on top of it independently. */
  const rotationRef = useRef(0);
  const [hingeReadout, setHingeReadout] = useState("—");

  const handleSceneClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const scene = sceneRef.current;
    const card = cardRef.current;
    if (!scene || !card) return;
    const rect = scene.getBoundingClientRect();
    const clickedLeft = event.clientX - rect.left < rect.width / 2;
    /* Pivot always stays dead-center; only the spin direction responds to
       which half was clicked (rotateY sign), never transform-origin. Per the
       CSS rotateY matrix, a NEGATIVE angle sends the left edge back (z<0) and
       brings the right edge forward (z>0) — so clicking the left half (which
       should recede) needs a negative sign. */
    setHingeReadout(clickedLeft ? "Left side receded" : "Right side receded");
    rotationRef.current += (clickedLeft ? -1 : 1) * 180;
    card.style.setProperty("--ml-spin", `${rotationRef.current}deg`);
  };

  const playPeek = useCallback(() => {
    /* No rotation guard needed: --ml-peek animates independently of --ml-spin
       (composited together in the CSS transform), so replaying the peek never
       fights or resets whatever flip state the card is already in. */
    const card = cardRef.current;
    if (!card) return;
    card.classList.remove("is-peeking");
    void card.offsetWidth; // force reflow so the animation can restart
    card.classList.add("is-peeking");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(playPeek, 400);
    return () => window.clearTimeout(timer);
  }, [playPeek]);

  return (
    <div className="rig">
      <div className="flip-demo">
        <div className="rig_label">Peeks on load, then click either half</div>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
        <div className="flip-scene" ref={sceneRef} onClick={handleSceneClick}>
          <div
            className="flip-card"
            ref={cardRef}
            onAnimationEnd={() =>
              cardRef.current?.classList.remove("is-peeking")
            }
          >
            <div className="flip-face front">
              <span className="line">Click a side</span>
              <span className="line">to send it back</span>
            </div>
            <div className="flip-face back">
              <span className="line">{hingeReadout}</span>
            </div>
          </div>
        </div>
        <div className="flip-zones">
          <span>← left recedes</span>
          <span>right recedes →</span>
        </div>
        <button className="replay-btn" type="button" onClick={playPeek}>
          Replay peek
        </button>
      </div>
    </div>
  );
};

/* ============================================================
   Rig 02 — capsule-border gradient sweep
   ------------------------------------------------------------
   Ported from the real EyebrowPill.tsx architecture: sample the pill's actual
   stadium border by arc length, convert each sample to a CSS conic angle,
   unwrap and rescale into a lookup table, then drive --border-angle from that
   table every animation frame instead of baking values into CSS @keyframes.
   ============================================================ */

const START_ANGLE = 90;
const TABLE_SAMPLES = 512; // production uses 1024; halved here, same idea
const INTERNAL_STEPS = 8;
const REF_WIDTH = 200;
const REF_HEIGHT = 48;
const BASE_DURATION_MS = 3000;
const MIN_DURATION_MS = 1500;
const MAX_DURATION_MS = 8000;

const capsulePerimeterLength = (w: number, h: number): number => {
  const long = Math.max(w, h);
  const short = Math.min(w, h);
  return 2 * (long - short) + Math.PI * short;
};

/* Walks the capsule's actual border by arc length s, starting at the
   rightmost point (w/2, 0) and going clockwise through five segments:
   right-cap quarter, bottom straight, left-cap semicircle, top straight,
   right-cap quarter (closing the loop). */
const pointOnCapsulePerimeterAtS = (
  w: number,
  h: number,
  s: number,
): { x: number; y: number } => {
  const L = w / 2 - h / 2;
  const r = h / 2;
  const P = capsulePerimeterLength(w, h);
  let rest = ((s % P) + P) % P;
  const q = (Math.PI / 2) * r;
  const straight = 2 * L;
  const semi = Math.PI * r;

  if (rest < q) {
    const phi1 = (rest / q) * (Math.PI / 2);
    return { x: L + r * Math.cos(phi1), y: r * Math.sin(phi1) };
  }
  rest -= q;
  if (rest < straight) {
    const t1 = rest / straight;
    return { x: L - t1 * 2 * L, y: r };
  }
  rest -= straight;
  if (rest < semi) {
    const phi2 = Math.PI / 2 + (rest / semi) * Math.PI;
    return { x: -L + r * Math.cos(phi2), y: r * Math.sin(phi2) };
  }
  rest -= semi;
  if (rest < straight) {
    const t2 = rest / straight;
    return { x: -L + t2 * 2 * L, y: -r };
  }
  rest -= straight;
  const phi3 = (3 * Math.PI) / 2 + (rest / q) * (Math.PI / 2);
  return { x: L + r * Math.cos(phi3), y: r * Math.sin(phi3) };
};

/* CSS conic-gradient angle: 0deg points up, increasing clockwise —
   atan2(x, -y), not the usual atan2(y, x). */
const cssConicAngleDegFromPoint = (x: number, y: number): number => {
  const d = (Math.atan2(x, -y) * 180) / Math.PI;
  return d < 0 ? d + 360 : d;
};

const unwrapConicAngleDeg = (
  prevUnwrapped: number,
  wrappedDeg: number,
): number => {
  const w = ((wrappedDeg % 360) + 360) % 360;
  const prevW = ((prevUnwrapped % 360) + 360) % 360;
  let diff = w - prevW;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return prevUnwrapped + diff;
};

const buildHoverLapAngleTable = (
  width: number,
  height: number,
): Float64Array => {
  const P = capsulePerimeterLength(width, height);
  const m = TABLE_SAMPLES;
  const table = new Float64Array(m);
  let u = START_ANGLE;
  table[0] = START_ANGLE;

  for (let i = 1; i < m; i += 1) {
    const s0 = ((i - 1) / (m - 1)) * P;
    const s1 = (i / (m - 1)) * P;
    for (let j = 1; j <= INTERNAL_STEPS; j += 1) {
      const s = s0 + (s1 - s0) * (j / INTERNAL_STEPS);
      const pt = pointOnCapsulePerimeterAtS(width, height, s);
      u = unwrapConicAngleDeg(u, cssConicAngleDegFromPoint(pt.x, pt.y));
    }
    table[i] = u;
  }

  /* Rescale so one full lap spans exactly 360deg of conic rotation —
     insurance against numeric drift leaving the loop not quite closed. */
  const span = table[m - 1] - table[0];
  const base = table[0];
  for (let k = 1; k < m; k += 1) {
    table[k] = base + ((table[k] - base) * 360) / span;
  }
  table[m - 1] = base + 360;
  return table;
};

const uniformSweepAngleDeg = (
  table: Float64Array,
  elapsedMs: number,
  durationMs: number,
): number => {
  const m = table.length;
  const p = Math.min(1, Math.max(0, elapsedMs / durationMs));
  const idx = p * (m - 1);
  const i0 = Math.min(m - 2, Math.max(0, Math.floor(idx)));
  const i1 = i0 + 1;
  const t = idx - i0;
  return table[i0] + t * (table[i1] - table[i0]);
};

const computeRotationDurationMs = (width: number, height: number): number => {
  const refPerimeter = capsulePerimeterLength(REF_WIDTH, REF_HEIGHT);
  const pxPerSec = refPerimeter / (BASE_DURATION_MS / 1000);
  const perimeterPx = capsulePerimeterLength(width, height);
  const durationMs = (perimeterPx / pxPerSec) * 1000;
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, durationMs));
};

const PillRig: React.FC = () => {
  const naiveRef = useRef<HTMLDivElement>(null);
  const correctedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const naive = naiveRef.current;
    const corrected = correctedRef.current;
    if (!naive || !corrected) return undefined;

    // Leave both pills at their resting --border-angle.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const width = corrected.offsetWidth || 168;
    const height = corrected.offsetHeight || 46;
    const table = buildHoverLapAngleTable(width, height);
    const durationMs = computeRotationDurationMs(width, height);

    let rafId = 0;
    let startTime: number | null = null;
    const frame = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = (now - startTime) % durationMs;
      naive.style.setProperty(
        "--border-angle",
        `${START_ANGLE + (elapsed / durationMs) * 360}deg`,
      );
      corrected.style.setProperty(
        "--border-angle",
        `${uniformSweepAngleDeg(table, elapsed, durationMs)}deg`,
      );
      rafId = window.requestAnimationFrame(frame);
    };
    rafId = window.requestAnimationFrame(frame);

    return () => window.cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="rig two-col">
      <div className="pill-demo">
        <div className="rig_label">Naive — linear angle</div>
        <div className="pill naive" ref={naiveRef}>
          gradient border
        </div>
      </div>
      <div className="pill-demo">
        <div className="rig_label">Corrected — capsule lookup table</div>
        <div className="pill corrected" ref={correctedRef}>
          gradient border
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   Rig 03 — pinned vertical scrub carousel
   ============================================================ */

interface CarouselSlide {
  title: string;
  body: string;
}

interface MediaPanel {
  index: string;
  caption: string;
}

const STICKY_TOP = 24;

/* Scroll position is the single source of truth: progress through the runway
   maps to the active index (no timers, no autoplay). The shell pins via
   position:sticky; this component only reads scroll and writes three things —
   track transform, media layer opacity classes, label active states — all
   compositor-friendly. */
const useScrubProgress = (
  runwayRef: React.RefObject<HTMLDivElement>,
  shellRef: React.RefObject<HTMLDivElement>,
) =>
  useCallback(() => {
    const runway = runwayRef.current;
    const shell = shellRef.current;
    if (!runway || !shell) return 0;
    const r = runway.getBoundingClientRect();
    const scrubDist = runway.offsetHeight - shell.offsetHeight - STICKY_TOP;
    if (scrubDist <= 0) return 0;
    return Math.min(1, Math.max(0, (STICKY_TOP - r.top) / scrubDist));
  }, [runwayRef, shellRef]);

interface SnappedCarouselProps {
  slides: CarouselSlide[];
  media: MediaPanel[];
  variant: "inline" | "pinned";
  navAriaLabel: string;
}

const SnappedCarousel: React.FC<SnappedCarouselProps> = ({
  slides,
  media,
  variant,
  navAriaLabel,
}) => {
  const runwayRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const mediaStackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const reduceMotionRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const slideCount = slides.length;
  const scrubProgress = useScrubProgress(runwayRef, shellRef);

  useEffect(() => {
    const track = trackRef.current;
    const progressFill = progressRef.current;
    if (!track || !progressFill) return undefined;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    reduceMotionRef.current = reduceMotion;
    if (reduceMotion) {
      track.style.transition = "none";
      const stack = mediaStackRef.current;
      if (stack) {
        Array.from(stack.children).forEach((layer) => {
          (layer as HTMLElement).style.transition = "none";
        });
      }
    }

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        const p = scrubProgress();
        progressFill.style.width = `${p * 100}%`;
        /* 0.9999 guard: p=1 exactly would floor to slideCount, one past the
           end. */
        setActiveIndex(
          Math.min(slideCount - 1, Math.floor(p * slideCount * 0.9999)),
        );
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrubProgress, slideCount]);

  const jumpToSlide = (index: number) => {
    const runway = runwayRef.current;
    const shell = shellRef.current;
    if (!runway || !shell) return;
    const r = runway.getBoundingClientRect();
    const runwayTop = window.scrollY + r.top;
    const scrubDist = runway.offsetHeight - shell.offsetHeight - STICKY_TOP;
    /* Aim for the middle of the slide's scrub segment so tiny scroll jitter
       doesn't immediately flip the index back. */
    const target =
      runwayTop + STICKY_TOP + ((index + 0.5) / slideCount) * scrubDist;
    window.scrollTo({
      top: target,
      behavior: reduceMotionRef.current ? "auto" : "smooth",
    });
  };

  const inline = variant === "inline";

  return (
    <div className="vcar-runway" ref={runwayRef}>
      <div
        className={`vcar-shell${inline ? " vcar-shell--twocol" : ""}`}
        ref={shellRef}
      >
        <div className="vcar-label-nav" role="tablist" aria-label={navAriaLabel}>
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              className={`vcar-label${index === activeIndex ? " is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              onClick={() => jumpToSlide(index)}
            >
              <span className="vcar-label-marker" />
              {slide.title}
            </button>
          ))}
        </div>
        <div className="vcar-viewport">
          <div
            className="vcar-track"
            ref={trackRef}
            style={{ transform: `translateY(${-activeIndex * 100}%)` }}
          >
            {slides.map((slide, index) =>
              inline ? (
                <div
                  className="vcar-slide vcar-slide--with-media"
                  key={slide.title}
                >
                  <div className="vcar-slide-text">
                    <h3>{slide.title}</h3>
                    <p>{slide.body}</p>
                  </div>
                  <div className="vcar-inline-media">
                    <span className="vcar-media-index">{media[index].index}</span>
                    <span className="vcar-media-caption">
                      {media[index].caption}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="vcar-slide" key={slide.title}>
                  <h3>{slide.title}</h3>
                  <p>{slide.body}</p>
                </div>
              ),
            )}
          </div>
        </div>
        {inline ? null : (
          <div className="vcar-media-stack" ref={mediaStackRef}>
            {media.map((panel, index) => (
              <div
                className={`vcar-media-layer${index === activeIndex ? " is-active" : ""}`}
                key={panel.index}
              >
                <span className="vcar-media-index">{panel.index}</span>
                <span className="vcar-media-caption">{panel.caption}</span>
              </div>
            ))}
          </div>
        )}
        <div className="vcar-progress">
          <div className="vcar-progress-fill" ref={progressRef} />
        </div>
      </div>
    </div>
  );
};

/* Iteration 3: no active index, no transitions. The continuous scroll
   fraction drives the track position and every media layer's opacity
   directly, each frame — so nothing ever keeps moving after the user's
   gesture stops, and reversing direction answers instantly. The only
   remaining discrete state is which label reads as "current", derived by
   nearest-slide rounding purely for the nav highlight. */
const FreeCarousel: React.FC<{
  slides: CarouselSlide[];
  media: MediaPanel[];
  navAriaLabel: string;
}> = ({ slides, media, navAriaLabel }) => {
  const runwayRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const mediaStackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const reduceMotionRef = useRef(false);
  const [currentLabel, setCurrentLabel] = useState(0);

  const slideCount = slides.length;
  const scrubProgress = useScrubProgress(runwayRef, shellRef);

  useEffect(() => {
    const track = trackRef.current;
    const progressFill = progressRef.current;
    const stack = mediaStackRef.current;
    if (!track || !progressFill || !stack) return undefined;

    reduceMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const layers = Array.from(stack.children) as HTMLElement[];

    const render = () => {
      const p = scrubProgress();
      // Continuous slide position, 0 .. slideCount-1 — fractional on purpose.
      const pos = p * (slideCount - 1);
      track.style.transform = `translateY(${-pos * 100}%)`;
      layers.forEach((layer, index) => {
        layer.style.opacity = String(Math.max(0, 1 - Math.abs(pos - index)));
      });
      progressFill.style.width = `${p * 100}%`;
      setCurrentLabel(Math.round(pos));
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        render();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    render();
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrubProgress, slideCount]);

  const jumpToSlide = (index: number) => {
    const runway = runwayRef.current;
    const shell = shellRef.current;
    if (!runway || !shell) return;
    const r = runway.getBoundingClientRect();
    const runwayTop = window.scrollY + r.top;
    const scrubDist = runway.offsetHeight - shell.offsetHeight - STICKY_TOP;
    /* Land exactly on the slide's fractional position (i/(slideCount-1)), not
       a segment midpoint — there is no index to jitter between. */
    const target =
      runwayTop + STICKY_TOP + (index / (slideCount - 1)) * scrubDist;
    window.scrollTo({
      top: target,
      behavior: reduceMotionRef.current ? "auto" : "smooth",
    });
  };

  return (
    <div className="vcar-runway" ref={runwayRef}>
      <div className="vcar-shell" ref={shellRef}>
        <div className="vcar-label-nav" role="tablist" aria-label={navAriaLabel}>
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              className={`vcar-label${index === currentLabel ? " is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={index === currentLabel}
              onClick={() => jumpToSlide(index)}
            >
              <span className="vcar-label-marker" />
              {slide.title}
            </button>
          ))}
        </div>
        <div className="vcar-viewport">
          <div className="vcar-track vcar-track--free" ref={trackRef}>
            {slides.map((slide) => (
              <div className="vcar-slide" key={slide.title}>
                <h3>{slide.title}</h3>
                <p>{slide.body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="vcar-media-stack" ref={mediaStackRef}>
          {media.map((panel, index) => (
            <div
              className={`vcar-media-layer vcar-media-layer--free${
                index === 0 ? " is-active" : ""
              }`}
              key={panel.index}
            >
              <span className="vcar-media-index">{panel.index}</span>
              <span className="vcar-media-caption">{panel.caption}</span>
            </div>
          ))}
        </div>
        <div className="vcar-progress">
          <div className="vcar-progress-fill" ref={progressRef} />
        </div>
      </div>
    </div>
  );
};

/* ---------- carousel content ---------- */

const ITERATION_1_SLIDES: CarouselSlide[] = [
  {
    title: "Self-service",
    body: "Text and media snap together as one slide — watch the panel on the right ride the same track as this copy.",
  },
  {
    title: "Employee onboarding",
    body: "Every boundary crossing moves the full slide — copy and panel — the whole shell height in one 0.32s step.",
  },
  {
    title: "Major incidents",
    body: "The panel is the visually heaviest thing in the section, and here it's also the fastest-moving thing. That's the tell.",
  },
  {
    title: "Asset lifecycle",
    body: "Compare against the next iteration below: same content, but the panel stops traveling and starts cross-fading in place.",
  },
];

const ITERATION_1_MEDIA: MediaPanel[] = [
  { index: "01", caption: "inline media · scrolls with text" },
  { index: "02", caption: "inline media · scrolls with text" },
  { index: "03", caption: "inline media · scrolls with text" },
  { index: "04", caption: "inline media · scrolls with text" },
];

const ITERATION_2_SLIDES: CarouselSlide[] = [
  {
    title: "Self-service",
    body: "Answers before tickets: the portal deflects the repetitive requests so agents keep only the judgment calls. (Placeholder copy — the mechanics are what's under test.)",
  },
  {
    title: "Employee onboarding",
    body: "Day-one access from a single request: accounts, hardware, and app grants fan out as one workflow instead of five tickets.",
  },
  {
    title: "Major incidents",
    body: "One timeline for every responder: status, comms, and post-incident artifacts collect themselves while the fire is being fought.",
  },
  {
    title: "Asset lifecycle",
    body: "Procure to retire without the spreadsheet: every device's story tracked from purchase order to recycling.",
  },
];

const ITERATION_2_MEDIA: MediaPanel[] = [
  { index: "01", caption: "pinned media · self-service" },
  { index: "02", caption: "pinned media · onboarding" },
  { index: "03", caption: "pinned media · incidents" },
  { index: "04", caption: "pinned media · assets" },
];

const ITERATION_3_SLIDES: CarouselSlide[] = [
  {
    title: "Self-service",
    body: "Same slides as Rig 03 — the difference is entirely in how they arrive. Scroll slowly and watch the text track glide instead of stepping.",
  },
  {
    title: "Employee onboarding",
    body: "Half-scrolled states are allowed to exist now: two slides share the viewport mid-gesture, exactly like any other content on the page.",
  },
  {
    title: "Major incidents",
    body: "Reverse direction at any point and the track answers instantly — there is no in-flight transition to wait out.",
  },
  {
    title: "Asset lifecycle",
    body: "The media panel is still pinned and still cross-fades — but the fade is a function of scroll position, not a timed animation.",
  },
];

const ITERATION_3_MEDIA: MediaPanel[] = [
  { index: "01", caption: "scroll-attached · self-service" },
  { index: "02", caption: "scroll-attached · onboarding" },
  { index: "03", caption: "scroll-attached · incidents" },
  { index: "04", caption: "scroll-attached · assets" },
];

/* ============================================================
   The page
   ============================================================ */

export const MotionSpecSheet: React.FC = () => (
  <div className="motion-lab">
    <div className="plate">
      <div className="plate_id">Spec Sheet — Motion &amp; Micro-interactions</div>
      <div className="plate_status">
        3 rigs active <span>●</span>
      </div>
    </div>

    <h1>Flip, spin, scroll: three card interactions, taken apart</h1>
    <p className="dek">
      Everything below runs on the same rule that governs the real code: an
      animation has to tell the visitor something, or it gets cut. Click, wait
      for the peek, and reload the rigs — each one is a live reproduction of
      the actual CSS driving it, not a mockup.
    </p>
    <p className="byline">
      <strong>Source:</strong> ari.soy · Work · Motion &amp; Micro-interactions
      card
    </p>

    {/* ============ RIG 1 — direction-aware flip + its own on-load peek ============ */}
    <section className="spec">
      <div className="spec_head">
        <span className="spec_tag">RIG 01</span>
        <h2>The flip that teaches itself</h2>
      </div>
      <p>
        A flip card that always rotates the same way is fine. This one flips{" "}
        <em>away from the cursor</em>: click the left half and the left side
        swings back while the right side comes forward; click the right half
        and it&apos;s reversed. The pivot never moves — only which side
        advances responds to where you clicked.
      </p>
      <p>
        It also introduces itself. On load, it plays a short peek — the same
        rotateY motion, at a fraction of the angle — so the first thing you see
        is proof the card responds to touch, before you&apos;ve touched
        anything.
      </p>
      <p className="quote">
        &ldquo;It&apos;s the kind of decision no spec asks for and every user
        feels.&rdquo;
      </p>

      <div className="provenance">
        <div className="provenance_head">
          <span className="provenance_label">Provenance</span>
          <span className="provenance_meta">
            Freshworks · ongoing · owns motion on the team
          </span>
        </div>
        <dl>
          <dt>The spec</dt>
          <dd>
            There wasn&apos;t one. No design ticket asked for a
            direction-aware flip — a flip card that always rotates the same
            way, regardless of where someone interacted with it, would have
            shipped and nobody would have filed a bug. This was added on top of
            the spec, not to satisfy it.
          </dd>

          <dt>The issue</dt>
          <dd>
            A flip that ignores where the click came from reads as{" "}
            <em>decorative</em>: the card moves, but the motion isn&apos;t
            answering anything. The fix treats the click&apos;s position as
            input, not just a trigger — the rotation direction is derived from
            it, so the card responds to the specific interaction instead of
            replaying one fixed animation.
          </dd>

          <dt>The iteration</dt>
          <dd>
            Shipped flip-only at first, with nothing on the front face hinting
            it responded to a click. People scrolled straight past it — the
            interaction existed and nobody found it. First fix attempt: a small
            icon on the card face signaling &quot;this flips.&quot; It read as
            static decoration, not motion, and didn&apos;t move usage. What
            actually worked: playing the flip&apos;s own motion once,
            automatically, on load — a short peek that returns to flat before
            anyone has touched anything. The card teaches its own affordance by
            briefly doing the thing it does, instead of describing it with an
            icon. That peek is folded into the rig below, not a separate demo.
          </dd>

          <dt>The system</dt>
          <dd>
            It lives inside a shared <code>fw-carousel</code> component that
            Testimonials on freshworks.com also runs on — the same card,
            several swappable directives. Checked the live DOM: that section
            currently ships <code>fw-carousel--motion-shift</code> (the
            sliding-window directive) on top of a <code>fw-card</code>{" "}
            primitive built entirely from <code>data-card-*</code> props and{" "}
            <code>--scalable-card-*</code> tokens. The flip directive is a
            sibling of <code>motion-shift</code> in that same system, added
            later once designers wanted it as a second, more expressive read on
            the identical card markup.
          </dd>

          <dt>Where it&apos;s from</dt>
          <dd>
            One entry in a running list of motion details owned end-to-end on
            the Freshworks team: interactions that stay{" "}
            <em>physically coherent</em> with how they were triggered, instead
            of just moving. A teammate summed up the category better than any
            spec could: &ldquo;the small details that feel premium.&rdquo;
          </dd>
        </dl>
      </div>

      <FlipRig />

      <svg
        className="curve-chart"
        viewBox="0 0 640 130"
        preserveAspectRatio="none"
        role="img"
        aria-label="rotateY value across the on-load peek keyframe: 0, -28, 0, -28, 0 degrees at 0, 25, 50, 75, 100 percent"
      >
        <line
          x1="40"
          y1="65"
          x2="620"
          y2="65"
          stroke="#262b34"
          strokeWidth="1"
          strokeDasharray="2,4"
        />
        <line x1="40" y1="10" x2="40" y2="120" stroke="#262b34" strokeWidth="1" />
        <line
          x1="40"
          y1="120"
          x2="620"
          y2="120"
          stroke="#262b34"
          strokeWidth="1"
        />
        <text
          x="4"
          y="14"
          fill="#565b64"
          fontFamily="ui-monospace, monospace"
          fontSize="9"
        >
          0°
        </text>
        <text
          x="0"
          y="112"
          fill="#565b64"
          fontFamily="ui-monospace, monospace"
          fontSize="9"
        >
          -28°
        </text>
        <text
          x="600"
          y="124"
          fill="#565b64"
          fontFamily="ui-monospace, monospace"
          fontSize="9"
        >
          t
        </text>
        <path
          d="M 40 65 L 185 99 L 330 65 L 475 99 L 620 65"
          fill="none"
          stroke="#f2a53c"
          strokeWidth="2"
        />
        <circle cx="40" cy="65" r="3" fill="#f2a53c" />
        <circle cx="185" cy="99" r="3" fill="#f2a53c" />
        <circle cx="330" cy="65" r="3" fill="#f2a53c" />
        <circle cx="475" cy="99" r="3" fill="#f2a53c" />
        <circle cx="620" cy="65" r="3" fill="#f2a53c" />
        <text
          x="30"
          y="14"
          fill="#7d838f"
          fontFamily="ui-monospace, monospace"
          fontSize="9"
          textAnchor="middle"
        >
          0%
        </text>
        <text
          x="185"
          y="132"
          fill="#7d838f"
          fontFamily="ui-monospace, monospace"
          fontSize="9"
          textAnchor="middle"
        >
          25%
        </text>
        <text
          x="330"
          y="14"
          fill="#7d838f"
          fontFamily="ui-monospace, monospace"
          fontSize="9"
          textAnchor="middle"
        >
          50%
        </text>
        <text
          x="475"
          y="132"
          fill="#7d838f"
          fontFamily="ui-monospace, monospace"
          fontSize="9"
          textAnchor="middle"
        >
          75%
        </text>
        <text
          x="605"
          y="14"
          fill="#7d838f"
          fontFamily="ui-monospace, monospace"
          fontSize="9"
          textAnchor="middle"
        >
          100%
        </text>
      </svg>
      <p className="hint">
        This is the peek only (max -28°, well short of the ~90° point where{" "}
        <code>backface-visibility: hidden</code> would start to show an edge) —
        a click still commits to the full 180° flip above.
      </p>

      <figure className="mech">
        <svg
          viewBox="0 0 640 250"
          role="img"
          aria-label="Two independent rotateY channels: click drives the spin variable through a CSS transition and accumulates; page load drives the peek variable through keyframes and always returns to zero. Both are summed inside one rotateY transform, so the peek can play at any spin state without resetting it."
        >
          <defs>
            <marker
              id="ml-a1"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#868c97" />
            </marker>
            <marker
              id="ml-a1-hot"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#f2a53c" />
            </marker>
          </defs>
          <text
            x="0"
            y="14"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="11"
          >
            INPUT
          </text>
          <text
            x="215"
            y="14"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="11"
          >
            CHANNEL (independent)
          </text>
          <text
            x="470"
            y="14"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="11"
          >
            COMPOSITE
          </text>

          <rect
            x="0"
            y="34"
            width="140"
            height="52"
            rx="6"
            fill="#191d25"
            stroke="#262b34"
          />
          <text
            x="70"
            y="56"
            fill="#e6e3db"
            fontFamily="ui-monospace, monospace"
            fontSize="12"
            textAnchor="middle"
          >
            click (left/right)
          </text>
          <text
            x="70"
            y="73"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10.5"
            textAnchor="middle"
          >
            position = input
          </text>

          <rect
            x="0"
            y="150"
            width="140"
            height="52"
            rx="6"
            fill="#191d25"
            stroke="#262b34"
          />
          <text
            x="70"
            y="172"
            fill="#e6e3db"
            fontFamily="ui-monospace, monospace"
            fontSize="12"
            textAnchor="middle"
          >
            page load
          </text>
          <text
            x="70"
            y="189"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10.5"
            textAnchor="middle"
          >
            once, unprompted
          </text>

          <line
            x1="140"
            y1="60"
            x2="205"
            y2="60"
            stroke="#868c97"
            strokeWidth="1.5"
            markerEnd="url(#ml-a1)"
          />
          <line
            x1="140"
            y1="176"
            x2="205"
            y2="176"
            stroke="#f2a53c"
            strokeWidth="1.5"
            markerEnd="url(#ml-a1-hot)"
          />

          <rect
            x="210"
            y="30"
            width="230"
            height="60"
            rx="6"
            fill="#12151b"
            stroke="#4fb4c7"
          />
          <text
            x="325"
            y="52"
            fill="#4fb4c7"
            fontFamily="ui-monospace, monospace"
            fontSize="12.5"
            textAnchor="middle"
          >
            --spin
          </text>
          <text
            x="325"
            y="70"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10.5"
            textAnchor="middle"
          >
            CSS transition 0.6s · accumulates ±180°
          </text>

          <rect
            x="210"
            y="146"
            width="230"
            height="60"
            rx="6"
            fill="#12151b"
            stroke="#f2a53c"
          />
          <text
            x="325"
            y="168"
            fill="#f2a53c"
            fontFamily="ui-monospace, monospace"
            fontSize="12.5"
            textAnchor="middle"
          >
            --peek
          </text>
          <text
            x="325"
            y="186"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10.5"
            textAnchor="middle"
          >
            @keyframes · always rests at 0°
          </text>

          <line
            x1="440"
            y1="60"
            x2="500"
            y2="105"
            stroke="#868c97"
            strokeWidth="1.5"
            markerEnd="url(#ml-a1)"
          />
          <line
            x1="440"
            y1="176"
            x2="500"
            y2="131"
            stroke="#f2a53c"
            strokeWidth="1.5"
            markerEnd="url(#ml-a1-hot)"
          />

          <rect
            x="470"
            y="88"
            width="170"
            height="60"
            rx="6"
            fill="#191d25"
            stroke="#262b34"
          />
          <text
            x="555"
            y="112"
            fill="#e6e3db"
            fontFamily="ui-monospace, monospace"
            fontSize="11.5"
            textAnchor="middle"
          >
            rotateY(
          </text>
          <text
            x="555"
            y="128"
            fill="#e6e3db"
            fontFamily="ui-monospace, monospace"
            fontSize="11.5"
            textAnchor="middle"
          >
            calc(spin + peek))
          </text>

          <text
            x="555"
            y="176"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10.5"
            textAnchor="middle"
          >
            one transform,
          </text>
          <text
            x="555"
            y="191"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10.5"
            textAnchor="middle"
          >
            two owners
          </text>

          <line
            x1="0"
            y1="226"
            x2="640"
            y2="226"
            stroke="#1b1f26"
            strokeWidth="1"
          />
          <text
            x="0"
            y="244"
            fill="#f2a53c"
            fontFamily="ui-monospace, monospace"
            fontSize="11"
          >
            Why split: the peek can fire mid-flip without clobbering it — no JS
            guard needed.
          </text>
        </svg>
        <figcaption>
          <strong>One transform, two independent owners.</strong> A single
          shared angle would force the load-time hint and the click-driven flip
          to fight over the same value — the peek would reset an in-progress
          flip, or need JS to check for one. Two registered custom properties
          summed inside one <code>rotateY()</code> removes the conflict
          structurally.
        </figcaption>
      </figure>
    </section>

    {/* ============ RIG 2 — perceived-speed gradient ============ */}
    <section className="spec">
      <div className="spec_head">
        <span className="spec_tag">RIG 02</span>
        <h2>A lookup table, not a formula</h2>
      </div>
      <p>
        A rotating conic-gradient border rotates in <em>angle</em> space —
        degrees around the element&apos;s center. People perceive it moving
        along the <em>physical border</em> instead. On a pill, those two
        disagree: a small angular step across the flat sides covers a lot of
        border distance (reads as fast), and a large angular step around the
        rounded caps covers very little (reads as slow). No closed-form fix, no
        ellipse standing in for the pill — the real component samples its own
        actual capsule border and inverts the relationship into a table.
      </p>

      <div className="provenance">
        <div className="provenance_head">
          <span className="provenance_label">Provenance</span>
          <span className="provenance_meta">
            EyebrowPill.tsx · capsule border sweep
          </span>
        </div>
        <dl>
          <dt>The geometry</dt>
          <dd>
            The pill is a stadium: two straight edges plus two full
            semicircular caps. Walking its perimeter by arc length{" "}
            <code>s</code> from the rightmost point, clockwise, covers five
            segments in order — right-cap quarter, bottom straight, left-cap
            semicircle, top straight, right-cap quarter — closing exactly one
            lap. For this pill&apos;s 168×46 box that&apos;s 388.51px around,
            and <code>capsulePerimeterLength(w,h) = 2*(long-short) +
            pi*short</code> gets there without walking anything.
          </dd>

          <dt>The table</dt>
          <dd>
            512 points, evenly spaced by arc length (production uses 1024),
            each converted to a CSS conic angle via <code>atan2(x, -y)</code> —
            conic 0° is up, not right, so the arguments swap and negate versus
            the usual <code>atan2(y, x)</code>. Consecutive samples get
            unwrapped (no 359°→1° jumps), then the whole table is rescaled so
            it spans exactly 360° end to end — insurance against the numeric
            drift that would otherwise leave the loop not quite closing. The
            result is arc-length progress in, conic angle out.
          </dd>

          <dt>The driver</dt>
          <dd>
            No CSS <code>@keyframes</code> at all.{" "}
            <code>requestAnimationFrame</code> turns elapsed time into a 0–1
            progress value, looks it up in the table, and writes the angle
            straight to <code>style.setProperty(&apos;--border-angle&apos;,
            ...)</code> on the pill itself every frame — a plain, unregistered
            custom property inherited by <code>::before</code>, not driven
            through it.
          </dd>

          <dt>The duration</dt>
          <dd>
            Scaled by perimeter, not fixed: a 200×46px reference pill takes
            3000ms, giving ~152px/s. This pill&apos;s 388.51px perimeter gets{" "}
            <strong>~2.56s</strong> from that same rate, clamped to 1.5–8s.
            Bigger pill, proportionally longer lap — not a faster-feeling one.
          </dd>
        </dl>
      </div>

      <PillRig />

      <p className="hint">
        No highlight band to balloon or shrink here — the gradient is a plain
        two-stop sweep, comet-style: the crisp opaque edge rides at the front
        of the rotation and the fade to the accent&apos;s own transparent
        trails behind it, so the leading edge is the only crisp landmark. The
        only variable under test is the angle-vs-time mapping driving{" "}
        <code>--border-angle</code>; both pills share one JS loop, one
        duration, and one color. The real component sweeps once on mount and
        once per hover, then rests; this demo loops continuously so the two are
        easier to compare side by side.
      </p>

      <svg
        className="curve-chart"
        viewBox="0 0 640 130"
        preserveAspectRatio="none"
        role="img"
        aria-label="Angle over time: naive rotation is a straight diagonal line; the capsule lookup table eases through slow and fast segments"
      >
        <line x1="40" y1="10" x2="40" y2="110" stroke="#262b34" strokeWidth="1" />
        <line
          x1="40"
          y1="110"
          x2="620"
          y2="110"
          stroke="#262b34"
          strokeWidth="1"
        />
        <text
          x="6"
          y="16"
          fill="#565b64"
          fontFamily="ui-monospace, monospace"
          fontSize="9"
        >
          360°
        </text>
        <text
          x="14"
          y="114"
          fill="#565b64"
          fontFamily="ui-monospace, monospace"
          fontSize="9"
        >
          0°
        </text>
        <text
          x="600"
          y="124"
          fill="#565b64"
          fontFamily="ui-monospace, monospace"
          fontSize="9"
        >
          t
        </text>
        <polyline
          points="40,110 620,10"
          fill="none"
          stroke="#7a5b2c"
          strokeWidth="1.5"
          strokeDasharray="3,3"
        />
        <path
          d="M 40.0 110.0 L 58.1 107.7 L 76.2 105.7 L 94.4 104.2 L 112.5 103.0 L 130.6 101.0
             L 148.8 97.9 L 166.9 92.7 L 185.0 85.0 L 203.1 77.3 L 221.2 72.1 L 239.4 69.0
             L 257.5 67.0 L 275.6 65.8 L 293.8 64.3 L 311.9 62.3 L 330.0 60.0 L 348.1 57.7
             L 366.2 55.7 L 384.4 54.2 L 402.5 53.0 L 420.6 51.0 L 438.8 47.9 L 456.9 42.7
             L 475.0 35.0 L 493.1 27.3 L 511.2 22.1 L 529.4 19.0 L 547.5 17.0 L 565.6 15.8
             L 583.8 14.3 L 601.9 12.3 L 620.0 10.0"
          fill="none"
          stroke="#4fb4c7"
          strokeWidth="2"
        />
      </svg>
      <div className="curve-legend">
        <span>
          <i className="swatch" style={{ background: "#7a5b2c" }} />
          naive (linear)
        </span>
        <span>
          <i className="swatch" style={{ background: "#4fb4c7" }} />
          corrected (lookup table)
        </span>
      </div>

      <figure className="mech">
        <svg
          viewBox="0 0 640 340"
          role="img"
          aria-label="Top: on a capsule, equal angular steps cover unequal edge distance — long on the flat sides, short around the caps. Bottom: the fix pipeline — measure the perimeter, sample 1024 points evenly by arc length, convert each to a conic angle with atan2, store as a lookup table, then a requestAnimationFrame loop reads progress and writes the border-angle custom property every frame."
        >
          <defs>
            <marker
              id="ml-a2"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#868c97" />
            </marker>
            <marker
              id="ml-a2-hot"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#f2a53c" />
            </marker>
          </defs>

          <text
            x="0"
            y="14"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="11"
          >
            THE MISMATCH — equal angle steps, unequal edge distance
          </text>

          <rect
            x="24"
            y="38"
            width="240"
            height="72"
            rx="36"
            fill="none"
            stroke="#4fb4c7"
            strokeWidth="2"
          />
          <circle cx="144" cy="74" r="2.5" fill="#868c97" />
          <line
            x1="144"
            y1="74"
            x2="264"
            y2="74"
            stroke="#565b64"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
          <line
            x1="144"
            y1="74"
            x2="228"
            y2="15"
            stroke="#565b64"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
          <line
            x1="144"
            y1="74"
            x2="60"
            y2="15"
            stroke="#565b64"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
          <path
            d="M 264 74 A 36 36 0 0 0 250 46"
            fill="none"
            stroke="#f2a53c"
            strokeWidth="4"
          />
          <path
            d="M 210 38 L 100 38"
            fill="none"
            stroke="#f2a53c"
            strokeWidth="4"
          />
          <text
            x="290"
            y="58"
            fill="#f2a53c"
            fontFamily="ui-monospace, monospace"
            fontSize="11.5"
          >
            same 40° of angle…
          </text>
          <text
            x="290"
            y="76"
            fill="#e6e3db"
            fontFamily="ui-monospace, monospace"
            fontSize="11.5"
          >
            …tiny distance at the cap
          </text>
          <text
            x="290"
            y="94"
            fill="#e6e3db"
            fontFamily="ui-monospace, monospace"
            fontSize="11.5"
          >
            …long distance on the flat
          </text>
          <text
            x="290"
            y="116"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10.5"
          >
            the eye reads distance, not degrees
          </text>

          <line
            x1="0"
            y1="142"
            x2="640"
            y2="142"
            stroke="#1b1f26"
            strokeWidth="1"
          />
          <text
            x="0"
            y="164"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="11"
          >
            THE FIX — walk the edge, not the angle
          </text>

          <rect
            x="0"
            y="180"
            width="118"
            height="56"
            rx="6"
            fill="#191d25"
            stroke="#262b34"
          />
          <text
            x="59"
            y="203"
            fill="#e6e3db"
            fontFamily="ui-monospace, monospace"
            fontSize="11.5"
            textAnchor="middle"
          >
            measure box
          </text>
          <text
            x="59"
            y="220"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10"
            textAnchor="middle"
          >
            w × h → perimeter
          </text>
          <line
            x1="118"
            y1="208"
            x2="146"
            y2="208"
            stroke="#868c97"
            strokeWidth="1.5"
            markerEnd="url(#ml-a2)"
          />

          <rect
            x="150"
            y="180"
            width="140"
            height="56"
            rx="6"
            fill="#12151b"
            stroke="#f2a53c"
          />
          <text
            x="220"
            y="203"
            fill="#f2a53c"
            fontFamily="ui-monospace, monospace"
            fontSize="11.5"
            textAnchor="middle"
          >
            1024 samples
          </text>
          <text
            x="220"
            y="220"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10"
            textAnchor="middle"
          >
            evenly by arc length
          </text>
          <line
            x1="290"
            y1="208"
            x2="318"
            y2="208"
            stroke="#f2a53c"
            strokeWidth="1.5"
            markerEnd="url(#ml-a2-hot)"
          />

          <rect
            x="322"
            y="180"
            width="140"
            height="56"
            rx="6"
            fill="#12151b"
            stroke="#f2a53c"
          />
          <text
            x="392"
            y="203"
            fill="#f2a53c"
            fontFamily="ui-monospace, monospace"
            fontSize="11.5"
            textAnchor="middle"
          >
            lookup table
          </text>
          <text
            x="392"
            y="220"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10"
            textAnchor="middle"
          >
            progress → conic angle
          </text>
          <line
            x1="462"
            y1="208"
            x2="490"
            y2="208"
            stroke="#f2a53c"
            strokeWidth="1.5"
            markerEnd="url(#ml-a2-hot)"
          />

          <rect
            x="494"
            y="180"
            width="146"
            height="56"
            rx="6"
            fill="#191d25"
            stroke="#262b34"
          />
          <text
            x="567"
            y="203"
            fill="#e6e3db"
            fontFamily="ui-monospace, monospace"
            fontSize="11.5"
            textAnchor="middle"
          >
            rAF loop
          </text>
          <text
            x="567"
            y="220"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10"
            textAnchor="middle"
          >
            every frame
          </text>

          <line
            x1="567"
            y1="236"
            x2="567"
            y2="266"
            stroke="#868c97"
            strokeWidth="1.5"
            markerEnd="url(#ml-a2)"
          />
          <rect
            x="440"
            y="270"
            width="200"
            height="46"
            rx="6"
            fill="#191d25"
            stroke="#262b34"
          />
          <text
            x="540"
            y="290"
            fill="#e6e3db"
            fontFamily="ui-monospace, monospace"
            fontSize="11"
            textAnchor="middle"
          >
            style.setProperty(
          </text>
          <text
            x="540"
            y="306"
            fill="#e6e3db"
            fontFamily="ui-monospace, monospace"
            fontSize="11"
            textAnchor="middle"
          >
            &apos;--border-angle&apos;, …)
          </text>
          <line
            x1="440"
            y1="293"
            x2="404"
            y2="293"
            stroke="#868c97"
            strokeWidth="1.5"
            markerEnd="url(#ml-a2)"
          />
          <rect
            x="230"
            y="270"
            width="170"
            height="46"
            rx="6"
            fill="#191d25"
            stroke="#262b34"
          />
          <text
            x="315"
            y="290"
            fill="#e6e3db"
            fontFamily="ui-monospace, monospace"
            fontSize="11"
            textAnchor="middle"
          >
            ::before
          </text>
          <text
            x="315"
            y="306"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10.5"
            textAnchor="middle"
          >
            conic-gradient reads it
          </text>

          <text
            x="0"
            y="286"
            fill="#f2a53c"
            fontFamily="ui-monospace, monospace"
            fontSize="10.5"
          >
            no @keyframes:
          </text>
          <text
            x="0"
            y="301"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10.5"
          >
            a table can&apos;t be
          </text>
          <text
            x="0"
            y="314"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10.5"
          >
            expressed as a curve
          </text>
        </svg>
        <figcaption>
          <strong>The eye measures distance; a conic gradient measures
          degrees.</strong>{" "}
          On a stadium shape those disagree, so the highlight appears to
          accelerate along the flat sides and stall at the caps. There is no
          closed-form correction for a capsule — so the component samples its
          own perimeter into a table (distance in, angle out) and a{" "}
          <code>requestAnimationFrame</code> loop feeds the CSS variable frame
          by frame. Lap duration scales with perimeter, so perceived speed —
          not elapsed time — is the constant.
        </figcaption>
      </figure>
    </section>

    {/* ============ RIG 3 — pinned vertical scrub carousel ============ */}
    <section className="spec">
      <div className="spec_head">
        <span className="spec_tag">RIG 03</span>
        <h2>One carousel, iterated in the open</h2>
      </div>
      <p>
        A vertical carousel that pins itself while you scroll: the section
        claims a tall stretch of page as a runway, the shell sticks in the
        viewport while that runway passes, and your scroll position — not a
        timer — scrubs through the slides. Text shifts vertically; the media
        panel never scrolls at all, it cross-fades in place. Scroll through it
        below, or click a label to jump.
      </p>

      <div className="provenance">
        <div className="provenance_head">
          <span className="provenance_label">Provenance</span>
          <span className="provenance_meta">
            freshservice · #ai-features · fw-carousel
          </span>
        </div>
        <dl>
          <dt>The pattern</dt>
          <dd>
            Same <code>fw-carousel</code> primitive as the Testimonials
            sliding-window and the flip directive — one more directive
            combination on the identical component. Verified in the live DOM:{" "}
            <code>data-carousel-axis=&quot;vertical&quot;</code>,{" "}
            <code>layout=&quot;single&quot;</code>,{" "}
            <code>nav-variant=&quot;labels&quot;</code> placed left,{" "}
            <code>motion=&quot;shift&quot;</code>,{" "}
            <code>autoplay-mode=&quot;none&quot;</code>, and the pair that
            defines this variant:{" "}
            <code>data-carousel-pinned=&quot;true&quot;</code> with{" "}
            <code>data-carousel-scrub=&quot;true&quot;</code>.
          </dd>

          <dt>The mechanics</dt>
          <dd>
            The live section spans 3181px of page height for four slides —
            that&apos;s the scrub runway. While it passes, the shell pins and
            scroll progress maps to the active index. Text slides ride a
            vertical track (<code>motion-shift</code>, transform only); the
            media column is lifted out of the scroll entirely (
            <code>data-carousel-pin-media=&quot;true&quot;</code>) into a stack
            of absolutely-positioned layers that cross-fade —{" "}
            <code>opacity 0.32s</code>, read verbatim from the live computed
            styles. Nothing animates layout; everything is opacity and
            transform.
          </dd>

          <dt>The iteration</dt>
          <dd>
            This variant went through several full revisions in days, not weeks
            — free-scroll versus pinned, autoplay versus scrub, media inline
            versus lifted — because the loop itself changed: AI-assisted
            development made each round cheap enough to actually build and
            feel, instead of debating mockups. The quality bar rose with the
            speed, not against it — every discarded round left behind a
            measured reason (scroll-jacking felt hostile, autoplay outran
            readers, inline media janked), and the constraints that survived
            are the strict ones: compositor-only animation, scroll position as
            the single source of truth, no timers.
          </dd>

          <dt>The caveat</dt>
          <dd>
            Still open, worth stating: the production carousel sizes its slides
            against the <em>viewport height</em> so only one slide can render
            at a time — that&apos;s what makes the transition clean. On tall or
            portrait screens the trade shows: the slide&apos;s actual content
            doesn&apos;t grow with the viewport, so the extra height surfaces
            as undesired whitespace above and below it. Sizing against content
            instead would fix the whitespace but re-open the
            one-slide-at-a-time guarantee. Iteration four&apos;s problem.
          </dd>
        </dl>
      </div>

      <h3 className="vcar-iter-head">Iteration 1 — media on the track</h3>
      <p>
        The starting point. Snapped scrub, same labels, same runway — but no
        pinned media column: each slide carries its own media panel inline, so
        every snap hauls a full-height panel through the viewport along with
        the text. It works, but the heaviest element on screen is also the one
        moving the most — each step repaints half the shell, and the section
        reads busier than the content deserves. The next iteration&apos;s whole
        reason to exist is lifting that panel out of the track.
      </p>
      <SnappedCarousel
        slides={ITERATION_1_SLIDES}
        media={ITERATION_1_MEDIA}
        variant="inline"
        navAriaLabel="Carousel slides, first iteration"
      />
      <p className="hint">
        Everything above is on the track — there is no media stack in this
        build. The pinned cross-fading media column doesn&apos;t exist yet;
        it&apos;s what the next iteration introduces.
      </p>

      <h3 className="vcar-iter-head">Iteration 2 — media pinned, snap kept</h3>
      <p>
        The fix for the traveling panel:{" "}
        <code>data-carousel-pin-media=&quot;true&quot;</code>. The media column
        is lifted off the track into its own stacked layer that never scrolls —
        it cross-fades in place while only the lightweight text keeps riding
        the track.
      </p>
      <SnappedCarousel
        slides={ITERATION_2_SLIDES}
        media={ITERATION_2_MEDIA}
        variant="pinned"
        navAriaLabel="Carousel slides"
      />
      <p className="hint">
        The runway above is 260vh tall on purpose — the empty scroll distance
        IS the interaction. Slide copy is placeholder; the directives, the pin,
        the scrub mapping, and the 0.32s cross-fade are the parts reproduced
        from the live section. One thing this iteration still has: the{" "}
        <em>snap</em>. Crossing a slide boundary fires a 0.32s transition that
        keeps moving after your scroll stops — the next iteration, right below,
        removed it.
      </p>

      <h3 className="vcar-iter-head">Iteration 3 — snap removed</h3>
      <p>
        Same section, next revision. The version above quantizes scroll into an
        index and lets a 0.32s transition carry the track between slides —
        which means the page keeps moving for a beat after your finger stops,
        and that reads as hijacked scroll. Here the quantization is gone: the
        track&apos;s position and the media cross-fade are recomputed from
        scroll progress on every frame, continuously. Scroll up and you
        immediately see the previous slide arriving; scroll down, the next. The
        page&apos;s own scroll physics is the only easing there is.
      </p>

      <div className="provenance">
        <div className="provenance_head">
          <span className="provenance_label">Provenance</span>
          <span className="provenance_meta">the de-snap revision</span>
        </div>
        <dl>
          <dt>The complaint</dt>
          <dd>
            The snapped version looked subtly broken in testing: a scroll
            gesture would end and the section would still be animating — motion
            the user didn&apos;t author. Anything that moves after the input
            stops reads as the page wrestling the scrollbar away, even when
            it&apos;s only 320ms of it.
          </dd>

          <dt>The fix</dt>
          <dd>
            Delete the state, keep the mapping. No active index driving a
            transition — the continuous scroll fraction drives everything
            directly: the track sits at{" "}
            <code>translateY(-progress × 300%)</code>, each media layer&apos;s
            opacity is its distance from the current fractional position, and
            the transitions are removed outright (<code>transition: none</code>
            ). A transition would re-introduce exactly the trailing motion
            being removed. Labels still highlight by nearest slide, and
            clicking one still jumps — but the jump is a plain page scroll, so
            even that stays in the scroll axis&apos;s own vocabulary.
          </dd>
        </dl>
      </div>

      <FreeCarousel
        slides={ITERATION_3_SLIDES}
        media={ITERATION_3_MEDIA}
        navAriaLabel="Carousel slides, free-scrub iteration"
      />
      <p className="hint">
        Same 260vh runway, same sticky pin, same labels — only the mapping
        changed. Rig 03 goes scroll → index → transition; this one goes scroll
        → position, with nothing in between to add its own timing.
      </p>

      <figure className="mech">
        <svg
          viewBox="0 0 640 260"
          role="img"
          aria-label="Two mappings from scroll to motion. Rig 03 maps scroll to a slide index, then a CSS transition animates between positions — so the element keeps moving after the finger stops. The de-snapped build maps scroll straight to position and opacity every frame, so the only easing the user feels is their own scroll physics."
        >
          <defs>
            <marker
              id="ml-a3"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#868c97" />
            </marker>
            <marker
              id="ml-a3-hot"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#f2a53c" />
            </marker>
          </defs>

          <text
            x="0"
            y="14"
            fill="#4fb4c7"
            fontFamily="ui-monospace, monospace"
            fontSize="11"
          >
            RIG 03 — scroll → index → transition
          </text>

          <rect
            x="0"
            y="30"
            width="120"
            height="48"
            rx="6"
            fill="#191d25"
            stroke="#262b34"
          />
          <text
            x="60"
            y="52"
            fill="#e6e3db"
            fontFamily="ui-monospace, monospace"
            fontSize="11.5"
            textAnchor="middle"
          >
            scroll progress
          </text>
          <text
            x="60"
            y="68"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10"
            textAnchor="middle"
          >
            0 → 1 over runway
          </text>
          <line
            x1="120"
            y1="54"
            x2="152"
            y2="54"
            stroke="#868c97"
            strokeWidth="1.5"
            markerEnd="url(#ml-a3)"
          />

          <rect
            x="156"
            y="30"
            width="120"
            height="48"
            rx="6"
            fill="#191d25"
            stroke="#262b34"
          />
          <text
            x="216"
            y="52"
            fill="#e6e3db"
            fontFamily="ui-monospace, monospace"
            fontSize="11.5"
            textAnchor="middle"
          >
            active index
          </text>
          <text
            x="216"
            y="68"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10"
            textAnchor="middle"
          >
            quantised 0–3
          </text>
          <line
            x1="276"
            y1="54"
            x2="308"
            y2="54"
            stroke="#868c97"
            strokeWidth="1.5"
            markerEnd="url(#ml-a3)"
          />

          <rect
            x="312"
            y="30"
            width="150"
            height="48"
            rx="6"
            fill="#191d25"
            stroke="#262b34"
          />
          <text
            x="387"
            y="52"
            fill="#e6e3db"
            fontFamily="ui-monospace, monospace"
            fontSize="11.5"
            textAnchor="middle"
          >
            CSS transition
          </text>
          <text
            x="387"
            y="68"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10"
            textAnchor="middle"
          >
            transform 0.32s ease
          </text>
          <line
            x1="462"
            y1="54"
            x2="494"
            y2="54"
            stroke="#868c97"
            strokeWidth="1.5"
            markerEnd="url(#ml-a3)"
          />

          <rect
            x="498"
            y="30"
            width="142"
            height="48"
            rx="6"
            fill="#191d25"
            stroke="#262b34"
          />
          <text
            x="569"
            y="59"
            fill="#e6e3db"
            fontFamily="ui-monospace, monospace"
            fontSize="11.5"
            textAnchor="middle"
          >
            painted position
          </text>

          <text
            x="312"
            y="98"
            fill="#f2a53c"
            fontFamily="ui-monospace, monospace"
            fontSize="10.5"
          >
            ↑ the element keeps moving after the finger stops
          </text>

          <line
            x1="0"
            y1="124"
            x2="640"
            y2="124"
            stroke="#1b1f26"
            strokeWidth="1"
          />

          <text
            x="0"
            y="150"
            fill="#f2a53c"
            fontFamily="ui-monospace, monospace"
            fontSize="11"
          >
            DE-SNAPPED — scroll → position, every frame
          </text>

          <rect
            x="0"
            y="166"
            width="120"
            height="48"
            rx="6"
            fill="#191d25"
            stroke="#262b34"
          />
          <text
            x="60"
            y="188"
            fill="#e6e3db"
            fontFamily="ui-monospace, monospace"
            fontSize="11.5"
            textAnchor="middle"
          >
            scroll progress
          </text>
          <text
            x="60"
            y="204"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10"
            textAnchor="middle"
          >
            0 → 1 over runway
          </text>
          <line
            x1="120"
            y1="190"
            x2="308"
            y2="190"
            stroke="#f2a53c"
            strokeWidth="1.5"
            markerEnd="url(#ml-a3-hot)"
          />
          <text
            x="214"
            y="182"
            fill="#f2a53c"
            fontFamily="ui-monospace, monospace"
            fontSize="10.5"
            textAnchor="middle"
          >
            written directly · transition: none
          </text>

          <rect
            x="312"
            y="166"
            width="150"
            height="48"
            rx="6"
            fill="#12151b"
            stroke="#f2a53c"
          />
          <text
            x="387"
            y="188"
            fill="#f2a53c"
            fontFamily="ui-monospace, monospace"
            fontSize="11.5"
            textAnchor="middle"
          >
            transform + opacity
          </text>
          <text
            x="387"
            y="204"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10"
            textAnchor="middle"
          >
            compositor only
          </text>
          <line
            x1="462"
            y1="190"
            x2="494"
            y2="190"
            stroke="#f2a53c"
            strokeWidth="1.5"
            markerEnd="url(#ml-a3-hot)"
          />

          <rect
            x="498"
            y="166"
            width="142"
            height="48"
            rx="6"
            fill="#191d25"
            stroke="#262b34"
          />
          <text
            x="569"
            y="195"
            fill="#e6e3db"
            fontFamily="ui-monospace, monospace"
            fontSize="11.5"
            textAnchor="middle"
          >
            painted position
          </text>

          <text
            x="0"
            y="240"
            fill="#868c97"
            fontFamily="ui-monospace, monospace"
            fontSize="10.5"
          >
            Removing one box — the transition — is what removes the hijacked
            feel. The only easing left is the user&apos;s own scroll.
          </text>
        </svg>
        <figcaption>
          <strong>The whole difference is one removed step.</strong> Quantising
          to an index and handing the motion to a CSS transition means the
          carousel owns its own timing — it continues after the gesture ends,
          which is exactly what &quot;hijacked scroll&quot; feels like. Writing
          position and opacity straight from scroll progress each frame gives
          the motion back to the finger.
        </figcaption>
      </figure>
    </section>

    {/* ============ spec table ============ */}
    <section className="spec">
      <div className="spec_head">
        <span className="spec_tag">SUMMARY</span>
        <h2>All three, side by side</h2>
      </div>
      <div className="spec-table-wrap">
        <table className="spec-table">
          <thead>
            <tr>
              <th>Interaction</th>
              <th>Trigger</th>
              <th>Property</th>
              <th>Duration</th>
              <th>Easing</th>
              <th>Why it&apos;s built this way</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="interaction">
                Direction-aware flip + on-load peek
              </td>
              <td>page load (once) + click, side-aware</td>
              <td>transform: rotateY (center pivot)</td>
              <td className="num">1.4s peek / 600ms flip</td>
              <td>ease-in-out / cubic-bezier(.3,.1,.2,1)</td>
              <td>
                Announces the affordance unprompted, then answers whichever
                side you click.
              </td>
            </tr>
            <tr>
              <td className="interaction">Capsule-border gradient sweep</td>
              <td>continuous loop</td>
              <td>--border-angle (plain custom property, JS-driven)</td>
              <td className="num">~2.56s</td>
              <td>512-point arc-length lookup table</td>
              <td>
                rAF maps linear elapsed time through the table, so the sweep
                covers equal border distance in equal time.
              </td>
            </tr>
            <tr>
              <td className="interaction">
                Carousel v1 — media on the track
              </td>
              <td>scroll position + label click</td>
              <td>transform: translateY (whole slide, media included)</td>
              <td className="num">0.32s snap</td>
              <td>scroll-progress → index, no timers</td>
              <td>
                The starting point: text and media move as one unit, so every
                snap hauls the heaviest element in the shell.
              </td>
            </tr>
            <tr>
              <td className="interaction">
                Carousel v2 — media pinned, snap kept
              </td>
              <td>scroll position + label click</td>
              <td>transform: translateY (track) / opacity (media)</td>
              <td className="num">0.32s fade</td>
              <td>scroll-progress → index, no timers</td>
              <td>
                Scroll is the single source of truth; text shifts, pinned media
                cross-fades, nothing animates layout.
              </td>
            </tr>
            <tr>
              <td className="interaction">Carousel v3 — snap removed</td>
              <td>scroll position + label click</td>
              <td>transform: translateY (track) / opacity (media)</td>
              <td className="num">none — scroll-attached</td>
              <td>scroll-progress → position, continuous</td>
              <td>
                Removes the snap: no index, no transitions, so nothing ever
                moves after the user&apos;s gesture stops.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <footer>
      <span>Field notes for ari.soy — Motion &amp; Micro-interactions</span>
      <span>Peek animation prototyped in a CodePen sandbox</span>
    </footer>
  </div>
);
