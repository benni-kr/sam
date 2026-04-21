"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { plannerViews } from "@/lib/planner";

export function PlannerTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Planner views" className="flex flex-wrap gap-2">
      {plannerViews.map((view) => {
        const isActive = pathname === view.href;

        return (
          <Link
            key={view.key}
            href={view.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              isActive
                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            {view.label}
          </Link>
        );
      })}
    </nav>
  );
}