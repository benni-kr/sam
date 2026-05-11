"use client";

import type { SVGProps } from "react";

type BirthdayCakeIconProps = {
  count: number;
  className?: string;
};

function BirthdayCakeSvg({
  count,
  className,
}: BirthdayCakeIconProps & SVGProps<SVGSVGElement>) {
  const variant = count === 1 ? "single" : count === 2 ? "double" : "party";

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-birthday-count={count}
    >
      {variant === "single" ? (
        <>
          {/* Bottom tier, open top */}
          <path d="M4 14v6h16v-6" />
          {/* Top tier */}
          <path d="M5 14V9h14v5" />
          {/* Continuous squiggle */}
          <path d="M4 14Q6 12 8 14T12 14T16 14T20 14" />

          {/* Add more candles (three symmetrically) */}
          <path d="M9 9V5" />
          <path d="M12 9V5" />
          <path d="M15 9V5" />

          {/* Add flame points for more candles */}
          <circle cx="9" cy="4" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="12" cy="4" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="15" cy="4" r="0.75" fill="currentColor" stroke="none" />
        </>
      ) : null}

      {variant === "double" ? (
        <g transform="rotate(180 12 12)">
          {/* Double: An EXACT copy of single, just rotated.
              Everything inside this G block is the same as the improved single. */}
          {/* Bottom tier, open top */}
          <path d="M4 14v6h16v-6" />
          {/* Top tier */}
          <path d="M5 14V9h14v5" />
          {/* Continuous squiggle */}
          <path d="M4 14Q6 12 8 14T12 14T16 14T20 14" />

          {/* Add more candles (three symmetrically) */}
          <path d="M9 9V5" />
          <path d="M12 9V5" />
          <path d="M15 9V5" />

          {/* Add flame points for more candles */}
          <circle cx="9" cy="4" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="12" cy="4" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="15" cy="4" r="0.75" fill="currentColor" stroke="none" />
        </g>
      ) : null}

      {variant === "party" ? (
        <>
          {/* Party: A fun version of single, keep structure but make it playful. */}

          {/* Bottom tier, open top (keeping core structure) */}
          <path d="M4 14v6h16v-6" />
          {/* Top tier (keeping core structure) */}
          <path d="M5 14V9h14v5" />

          {/* Keep multiple candles for consistency (varied party style, smaller flames) */}
          <path d="M9 9V5M12 9V4M15 9V5" />
          <circle cx="9" cy="4" r="0.65" fill="currentColor" stroke="none" />
          <circle cx="12" cy="3" r="0.65" fill="currentColor" stroke="none" />
          <circle cx="15" cy="4" r="0.65" fill="currentColor" stroke="none" />

          {/* Add clear Smiley Face! (eyes and smile moved tiny bit lower) */}
          <circle cx="8" cy="12" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="16" cy="12" r="0.75" fill="currentColor" stroke="none" />
          <path d="M8 14Q12 17 16 14" />
        </>
      ) : null}
    </svg>
  );
}

/**
 * Birthday cake icon with count-based candle variants.
 */
export function BirthdayCakeIcon({ count, className }: BirthdayCakeIconProps) {
  if (count <= 0) {
    return null;
  }

  return <BirthdayCakeSvg count={count} className={className} />;
}
