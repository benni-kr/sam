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
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-birthday-count={count}
    >
      {/* Placeholder cake body */}
      <path d="M4 13h16v7H4z" />
      <path d="M5 13V9h14v4" />
      <path d="M8 9V7" />
      <path d="M12 9V6" />
      <path d="M16 9V7" />
      {/* Candle placeholder variants will be swapped in later with the raw SVG paths. */}
      {count === 1 ? <path d="M12 4v2" /> : null}
      {count === 2 ? <path d="M10 4v2M14 4v2" /> : null}
      {count >= 3 ? <path d="M9 4v2M12 3v3M15 4v2" /> : null}
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
