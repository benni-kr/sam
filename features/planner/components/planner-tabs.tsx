"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Calendar, List, Table } from "lucide-react";

import { defaultPlannerSemesterId, plannerViews } from "@/features/planner/lib/planner";

type PlannerTabsProps = {
  activeSemesterId?: string | null;
};

/**
 * View navigation tabs that preserve the currently selected semester query param.
 */
export function PlannerTabs({ activeSemesterId }: PlannerTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const semesterId = activeSemesterId ?? defaultPlannerSemesterId;

  function buildViewHref(viewHref: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (semesterId === defaultPlannerSemesterId) {
      params.delete("semester");
    } else {
      params.set("semester", semesterId);
    }

    const query = params.toString();

    return query ? `${viewHref}?${query}` : viewHref;
  }

  const iconByViewKey = {
    calendar: Calendar,
    crosstables: Table,
    mobile: List,
  };

  return (
    <nav aria-label="Planner views" className="flex flex-wrap gap-2">
      {plannerViews.map((view) => {
        const isActive = pathname === view.href;
        const href = buildViewHref(view.href);
        const ViewIcon = iconByViewKey[view.key];

        return (
          <Link
            key={view.key}
            href={href}
            aria-current={isActive ? "page" : undefined}
            aria-label={view.label}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              isActive
                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            <span className="sr-only">{view.label}</span>
            <ViewIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        );
      })}
    </nav>
  );
}
