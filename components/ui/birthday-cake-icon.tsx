"use client";

import type { SVGProps } from "react";

type BirthdayCakeIconProps = {
  count: number;
  className?: string;
};

function BirthdayCakeSvg({
  count,
  className,
  ...props
}: BirthdayCakeIconProps & SVGProps<SVGSVGElement>) {
  const variant = count === 1 ? "single" : count === 2 ? "double" : "party";

  const styleBlock = (
    <style>{`
      @keyframes birthday-flame-flicker-A {
        0%, 100% { opacity: 1; transform: scaleY(1.4) translateY(0.5px); }
        50% { opacity: 0.6; transform: scaleY(1) translateY(-0.5px); }
      }
      @keyframes birthday-flame-flicker-B {
        0%, 100% { opacity: 0.7; transform: scaleY(1.4) translateY(1.5px); }
        50% { opacity: 1; transform: scaleY(1) translateY(-0.6px); }
      }
      .flame-1 {
        animation: birthday-flame-flicker-A 1.5s infinite ease-in-out;
        transform-origin: center center;
      }
      .flame-2 {
        animation: birthday-flame-flicker-B 1.3s infinite ease-in-out;
        transform-origin: center center;
      }
      .flame-3 {
        animation: birthday-flame-flicker-A 1.2s infinite ease-in-out 0.2s;
        transform-origin: center center;
      }
      
      /* Dark mode enhancements */
      @media (prefers-color-scheme: dark) {
        [class^="flame-"] {
          filter: drop-shadow(0 0 3px rgba(255, 215, 0, 0.8));
        }
      }
    `}</style>
  );

  const RegularCandlesAndFlames = (
    <>
      {/* Middle candle is now taller (V5 instead of V7) */}
      <path d="M8 9V7 M12 9V5 M16 9V7" />
      <circle
        className="flame-1"
        cx="8"
        cy="6"
        r="0.75"
        fill="var(--flame-color, currentColor)"
        stroke="none"
      />
      {/* Middle flame moved up to match taller candle (cy=4 instead of 6) */}
      <circle
        className="flame-2"
        cx="12"
        cy="4"
        r="0.75"
        fill="var(--flame-color, currentColor)"
        stroke="none"
      />
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
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-birthday-count={count}
      {...props}
    >
      {styleBlock}

      {/* Single and Double Cake (Squiggly Top) */}
      {(variant === "single" || variant === "double") && (
        <g transform={variant === "double" ? "rotate(180 12 12)" : undefined}>
          <path d="M4 14 Q6 12 8 14 T12 14 T16 14 T20 14 V20 H4 Z" />
          <path d="M5 13.25 V9 h14 V14.75" />
          {RegularCandlesAndFlames}
        </g>
      )}

      {/* Party Variant (Flat Top, open middle) */}
      {variant === "party" && (
        <>
          {/* Bottom tier, open top */}
          <path d="M4 14v6h16v-6" />

          {/* Top tier, open bottom */}
          <path d="M5 14V9h14v5" />

          {/* Varied party style candles with a taller middle candle */}
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

          {/* Smiley Face */}
          <circle cx="8" cy="12" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="16" cy="12" r="0.75" fill="currentColor" stroke="none" />
          <path d="M8 14Q12 17 16 14" />
        </>
      )}
    </svg>
  );
}

export function BirthdayCakeIcon({
  count,
  className,
  ...props
}: BirthdayCakeIconProps & SVGProps<SVGSVGElement>) {
  if (count <= 0) {
    return null;
  }
  return <BirthdayCakeSvg count={count} className={className} {...props} />;
}
