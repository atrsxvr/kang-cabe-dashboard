"use client";

/**
 * A short shower of chillies, for the few moments in a season worth one: the
 * first picking, and closing the books.
 *
 * Kept for rare events on purpose. On every save it would be noise within a
 * week; twice a season it stays a small reward. Imperative, so it can be fired
 * from a Server Action's success path without a component to host it, and it
 * cleans up after itself. Nothing happens under prefers-reduced-motion.
 */

const PIECES = 28;
const LONGEST_MS = 2600;

const CHILI = `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
  <path d="M10.4 4.6c.1-1.6 1-2.7 2.6-3" fill="none" stroke="#15803d" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M7.6 6.2c.6-1.5 2.4-2.1 4-1.3 1.1.5 1.6 1.4 1.4 2.4" fill="#16a34a"/>
  <path d="M8 6.6c-1.8 1.2-1.9 4-1 7 1.3 4.2 5 7.2 10.6 8.1 1 .2 1.4-1 .6-1.5-3.8-2.4-5.6-6.4-6-10.4-.2-2.6-2-4.4-4.2-3.2z" fill="#dc2626"/>
  <path d="M8.6 9c-.2 1.6.1 3.2.7 4.6" fill="none" stroke="#fca5a5" stroke-width="1" stroke-linecap="round" opacity=".8"/>
</svg>`;

const BITS = ["#dc2626", "#f59e0b", "#16a34a", "#ef4444"];

export function celebrate() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  // Above an open dialog (z-50), below the first-open splash (z-100).
  layer.style.cssText =
    "position:fixed;inset:0;z-index:90;pointer-events:none;overflow:hidden";
  document.body.appendChild(layer);

  const width = window.innerWidth;
  const height = window.innerHeight;

  for (let i = 0; i < PIECES; i++) {
    const chili = i % 3 !== 2;
    const piece = document.createElement("div");
    const size = chili ? 22 + Math.random() * 16 : 6 + Math.random() * 4;

    piece.style.cssText = `position:absolute;top:0;left:0;width:${size}px;height:${size}px;will-change:transform`;
    if (chili) {
      piece.innerHTML = CHILI;
    } else {
      piece.style.background = BITS[i % BITS.length];
      piece.style.borderRadius = i % 2 ? "9999px" : "2px";
    }
    layer.appendChild(piece);

    const x = Math.random() * width;
    const drift = (Math.random() - 0.5) * 160;
    const spin = (Math.random() - 0.5) * 720;
    const start = -40 - Math.random() * 80;
    const duration = 1700 + Math.random() * (LONGEST_MS - 1700 - 400);

    piece.animate(
      [
        { transform: `translate(${x}px, ${start}px) rotate(0deg)`, opacity: 1 },
        {
          transform: `translate(${x + drift * 0.6}px, ${height * 0.55}px) rotate(${spin * 0.6}deg)`,
          opacity: 1,
          offset: 0.6,
        },
        {
          transform: `translate(${x + drift}px, ${height + 40}px) rotate(${spin}deg)`,
          opacity: 0,
        },
      ],
      {
        duration,
        delay: Math.random() * 400,
        easing: "cubic-bezier(0.25, 0.5, 0.5, 1)",
        fill: "both",
      },
    );
  }

  window.setTimeout(() => layer.remove(), LONGEST_MS + 200);
}
