import * as React from "react";

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="SAM Logo"
    >
      {/* S Block - Exam */}
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

      {/* A Block - Group Event */}
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

      {/* M Block - Private Event */}
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
    </svg>
  );
}
