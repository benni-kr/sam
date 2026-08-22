"use client";

import * as React from "react";

/**
 * The SAM wordmark: three lettered blocks, one per event category.
 *
 * Each block is its own group so it can react to a click on its own. That is
 * purely decorative — there is deliberately no cursor change, hover state or
 * tooltip, and the SVG keeps `role="img"` so assistive tech reads it as one
 * image rather than announcing three controls that do nothing useful.
 *
 * The SVG is overflow-visible because a block briefly scales past the viewBox
 * mid-animation and would otherwise be clipped at the edges.
 */

type BlockId = "s" | "a" | "m";

export function Logo({ className }: { className?: string }) {
  const [playing, setPlaying] = React.useState<BlockId | null>(null);

  // Restarting mid-animation needs the class removed for a frame, hence the
  // key rather than a plain boolean.
  const [runId, setRunId] = React.useState(0);

  function play(block: BlockId) {
    setPlaying(block);
    setRunId((id) => id + 1);
  }

  const blockProps = (block: BlockId) => ({
    onClick: () => play(block),
    onAnimationEnd: () => setPlaying(null),
    className: playing === block ? "sam-logo-block sam-logo-pop" : "sam-logo-block",
  });

  // Passed as a real key, never spread: remounting is what lets a second click
  // restart the animation instead of waiting for the running one to finish.
  const blockKey = (block: BlockId) =>
    `${block}-${playing === block ? runId : "idle"}`;

  return (
    <svg
      viewBox="0 0 320 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`overflow-visible select-none ${className ?? ""}`}
      role="img"
      aria-label="SAM Logo"
    >
      {/* S Block - Exam */}
      <g key={blockKey("s")} {...blockProps("s")}>
        <rect
          x="2" y="2" width="96" height="96" rx="20"
          className="fill-violet-100 stroke-violet-300 dark:fill-[#432C6A] dark:stroke-violet-400/60"
          strokeWidth="4"
        />
        <text
          x="50"
          y="78"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="76"
          fontWeight="800"
          textAnchor="middle"
          className="fill-violet-900 dark:fill-violet-100"
        >
          S
        </text>
      </g>

      {/* A Block - Group Event */}
      <g key={blockKey("a")} {...blockProps("a")}>
        <rect
          x="112" y="2" width="96" height="96" rx="20"
          className="fill-emerald-100 stroke-emerald-500 dark:fill-emerald-800 dark:stroke-emerald-400"
          strokeWidth="4"
        />
        {/* Calendar Icon - drawn behind A */}
        <g strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" className="stroke-emerald-950/20 dark:stroke-emerald-100/20">
          <rect x="122" y="22" width="76" height="66" rx="6" />
          <path d="M140 12v16M180 12v16" />
          <path d="M122 42h76" />
          <path d="M147 42v46M173 42v46" />
          <path d="M122 62h76" />
        </g>
        <text
          x="160"
          y="78"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="76"
          fontWeight="800"
          textAnchor="middle"
          className="fill-emerald-950 dark:fill-emerald-100"
        >
          A
        </text>
      </g>

      {/* M Block - Private Event */}
      <g key={blockKey("m")} {...blockProps("m")}>
        <rect
          x="222" y="2" width="96" height="96" rx="20"
          className="fill-[#fcf5d2] stroke-amber-300 dark:fill-[#663C22] dark:stroke-amber-400/60"
          strokeWidth="4"
        />
        <text
          x="270"
          y="78"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="76"
          fontWeight="800"
          textAnchor="middle"
          className="fill-amber-900 dark:fill-amber-100"
        >
          M
        </text>
      </g>
    </svg>
  );
}
