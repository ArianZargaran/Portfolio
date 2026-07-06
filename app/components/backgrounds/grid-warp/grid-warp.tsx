import { useEffect, useRef } from "react";

import styles from "./grid-warp.module.css";

/**
 * Full-viewport dot-grid background for the projects page. A faint, evenly
 * spaced grid sits behind the bento tiles; dots near the pointer displace
 * away from it like a rubber sheet and warm toward the site's redline
 * identity color. Honors prefers-reduced-motion by dropping the idle
 * breathing animation — dots only move in response to the pointer, redrawn
 * once per move instead of via a continuous loop.
 */

/** Idle dot color — dim, theme-neutral (grey-blue-leaf-300). */
const DOT_TONE: readonly [number, number, number] = [145, 160, 182];
/** Color dots warm toward near the pointer (redline-500, the site's identity accent). */
const WARM_TONE: readonly [number, number, number] = [198, 88, 91];

const GRID_GAP = 46;
/** Pointer displacement reach, px. */
const REACH = 190;
/** Max displacement at the pointer's center, px. */
const MAX_PUSH = 22;

interface GridPoint {
  bx: number;
  by: number;
}

export const GridWarp: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    let points: GridPoint[] = [];
    const pointer = { x: -9999, y: -9999, active: false };
    let frame = 0;
    let time = 0;

    const buildGrid = () => {
      const cols = Math.ceil(width / GRID_GAP) + 1;
      const rows = Math.ceil(height / GRID_GAP) + 1;
      const next: GridPoint[] = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          next.push({ bx: col * GRID_GAP, by: row * GRID_GAP });
        }
      }
      points = next;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildGrid();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      for (const point of points) {
        const breathe = reducedMotion
          ? 0
          : Math.sin(time * 0.4 + point.bx * 0.02 + point.by * 0.02) * 2;
        let x = point.bx + breathe;
        let y = point.by + breathe * 0.6;

        let near = 0;
        if (pointer.active) {
          const dx = point.bx - pointer.x;
          const dy = point.by - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < REACH) {
            const falloff = (1 - dist / REACH) ** 2;
            const push = falloff * MAX_PUSH;
            const safeDist = dist || 1;
            x -= (dx / safeDist) * push;
            y -= (dy / safeDist) * push;
            near = falloff;
          }
        }

        const [dr, dg, db] = DOT_TONE;
        const [wr, wg, wb] = WARM_TONE;
        const cr = Math.round(dr + (wr - dr) * near);
        const cg = Math.round(dg + (wg - dg) * near);
        const cb = Math.round(db + (wb - db) * near);

        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${0.18 + near * 0.55})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.4 + near * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      time += 1 / 60;
      render();
      frame = window.requestAnimationFrame(step);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      if (reducedMotion) render();
    };

    const onPointerLeave = () => {
      pointer.active = false;
      if (reducedMotion) render();
    };

    const onVisibilityChange = () => {
      if (reducedMotion) return;
      window.cancelAnimationFrame(frame);
      if (!document.hidden) frame = window.requestAnimationFrame(step);
    };

    resize();
    if (reducedMotion) {
      render();
    } else {
      frame = window.requestAnimationFrame(step);
    }

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.warp} aria-hidden="true" />;
};
