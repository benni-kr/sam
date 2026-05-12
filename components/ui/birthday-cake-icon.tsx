"use client";

import type { SVGProps } from "react";

/**
 * Props for the BirthdayCakeIcon component.
 * @property count - Determines the cake variant (1 = single, 2 = double, 3+ = party).
 * @property className - Standard Tailwind or CSS classes for styling the SVG container.
 */
type BirthdayCakeIconProps = {
  count: number;
  className?: string;
};

/**
 * Internal SVG component that handles the actual rendering of the cake paths and animations.
 */
function BirthdayCakeSvg({
  count,
  className,
  ...props
}: BirthdayCakeIconProps & SVGProps<SVGSVGElement>) {
  // Determine which visual variant to render based on the input count.
  const variant = count === 1 ? "single" : count === 2 ? "double" : "party";

  // --- STYLES & ANIMATIONS ---
  // We inject a <style> block directly into the SVG so the animations travel with the component.
  const styleBlock = (
    <style>{`
      /* Keyframes for a subtle, pulsing flame effect */
      @keyframes birthday-flame-flicker-A {
        0%, 100% { opacity: 1; transform: scaleY(1.3) translateY(0.5px); }
        50% { opacity: 0.6; transform: scaleY(1) translateY(-0.5px); }
      }
      
      /* A secondary flicker pattern so the flames don't move in perfect unison */
      @keyframes birthday-flame-flicker-B {
        0%, 100% { opacity: 0.7; transform: scaleY(1.4) translateY(1.5px); }
        50% { opacity: 1; transform: scaleY(1) translateY(-0.6px); }
      }
      
      /* Apply the animations to specific flame classes, staggering them with delays and different durations */
      .flame-1 {
        animation: birthday-flame-flicker-A 1.5s infinite ease-in-out;
        transform-origin: center center;
      }
      .flame-2 {
        animation: birthday-flame-flicker-B 1.3s infinite ease-in-out;
        transform-origin: center center;
      }
      .flame-3 {
        animation: birthday-flame-flicker-A 1.2s infinite ease-in-out 0.2s; /* 0.2s delay for offset */
        transform-origin: center center;
      }
      
      /* DARK MODE ENHANCEMENTS */
      /* Adds a warm golden glow behind the flames when the app is in dark mode,
         whether dark mode comes from system preference or the app's html.dark class */
      @media (prefers-color-scheme: dark) {
        [class^="flame-"] {
          filter: drop-shadow(0 0 3px rgba(255, 215, 0, 0.8));
        }
      }
      html.dark [class^="flame-"] {
        filter: drop-shadow(0 0 3px rgba(255, 215, 0, 0.8));
      }
    `}</style>
  );

  // --- REUSABLE SVG FRAGMENTS ---
  // The candles and flames are identical for the 'single' and 'double' variants,
  // so we extract them here to keep the markup clean.
  const RegularCandlesAndFlames = (
    <>
      {/* Candle sticks: Left, Middle (taller), Right */}
      <path d="M8 9V7 M12 9V5 M16 9V7" />

      {/* Flame 1 (Left) */}
      <circle
        className="flame-1"
        cx="8"
        cy="6"
        r="0.75"
        fill="var(--flame-color, currentColor)"
        stroke="none"
      />
      {/* Flame 2 (Middle) - moved higher (cy=4) to match the taller middle candle */}
      <circle
        className="flame-2"
        cx="12"
        cy="4"
        r="0.75"
        fill="var(--flame-color, currentColor)"
        stroke="none"
      />
      {/* Flame 3 (Right) */}
      <circle
        className="flame-3"
        cx="16"
        cy="6"
        r="0.75"
        fill="var(--flame-color, currentColor)"
        stroke="none"
      />
    </>
  );

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor" // Inherits text color for lines
      strokeWidth="1.5"
      strokeLinecap="round" // Smoothly rounded path ends
      strokeLinejoin="round" // Smoothly rounded path corners
      data-birthday-count={count}
      {...props}
    >
      {styleBlock}

      {/* --- RENDER SINGLE OR DOUBLE CAKE --- */}
      {(variant === "single" || variant === "double") && (
        // The 'double' variant is literally just the 'single' cake flipped completely upside down
        <g transform={variant === "double" ? "rotate(180 12 12)" : undefined}>
          {/* Bottom tier with a continuous squiggly top edge. 
              Q and T commands draw the bezier curves, Z closes the shape. */}
          <path d="M4 14 Q6 12 8 14 T12 14 T16 14 T20 14 V20 H4 Z" />

          {/* Top tier. The Y coordinates (13.25 and 14.75) are precise to ensure 
              the lines perfectly touch the squiggly edge without poking through. */}
          <path d="M5 13.25 V9 h14 V14.75" />

          {RegularCandlesAndFlames}
        </g>
      )}

      {/* --- RENDER PARTY CAKE --- */}
      {variant === "party" && (
        <>
          {/* Bottom tier: rendered as an open 'U' shape so we don't draw a line through the middle */}
          <path d="M4 14v6h16v-6" />

          {/* Top tier: flat top, open bottom */}
          <path d="M5 14V9h14v5" />

          {/* Party style candles (identical spacing to regular, slightly smaller flames) */}
          <path d="M8 9V7 M12 9V5 M16 9V7" />
          <circle
            className="flame-1"
            cx="8"
            cy="6"
            r="0.65"
            fill="var(--flame-color, currentColor)"
            stroke="none"
          />
          <circle
            className="flame-2"
            cx="12"
            cy="4"
            r="0.65"
            fill="var(--flame-color, currentColor)"
            stroke="none"
          />
          <circle
            className="flame-3"
            cx="16"
            cy="6"
            r="0.65"
            fill="var(--flame-color, currentColor)"
            stroke="none"
          />

          {/* The Smiley Face (unobstructed by cake tier lines) */}
          {/* Eyes */}
          <circle cx="8" cy="12" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="16" cy="12" r="0.75" fill="currentColor" stroke="none" />
          {/* Smile arc */}
          <path d="M8 14Q12 17 16 14" />
        </>
      )}
    </svg>
  );
}

/**
 * Birthday Cake Icon Component
 * Displays different cake variations based on the provided count.
 * Returns null if the count is 0 or negative.
 */
export function BirthdayCakeIcon({
  count,
  className,
  ...props
}: BirthdayCakeIconProps & SVGProps<SVGSVGElement>) {
  // Prevent rendering if there's no reason to show a cake
  if (count <= 0) {
    return null;
  }

  return <BirthdayCakeSvg count={count} className={className} {...props} />;
}
