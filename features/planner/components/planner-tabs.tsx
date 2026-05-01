"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Calendar, Clock3, List, Table } from "lucide-react";

import {
  defaultPlannerSemesterId,
  plannerViews,
} from "@/features/planner/lib/planner";

type PlannerTabsProps = {
  activeSemesterId?: string | null;
};

export function PlannerTabs({ activeSemesterId }: PlannerTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const semesterId = activeSemesterId ?? defaultPlannerSemesterId;
  const regularViews = plannerViews.filter((view) => view.key !== "week");
  const weekView = plannerViews.find((view) => view.key === "week");

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
    list: List,
    week: Clock3,
  };

  return (
    <nav
      aria-label="Planner views"
      className="flex items-center justify-between gap-2"
    >
      <div className="flex flex-wrap gap-2">
        {regularViews.map((view) => {
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
      </div>

      {weekView ? (
        <div className="ml-auto flex flex-wrap gap-2">
          {(() => {
            const isActive = pathname === weekView.href;
            const href = buildViewHref(weekView.href);
            const ViewIcon = iconByViewKey[weekView.key];

            return (
              <Link
                key={weekView.key}
                href={href}
                aria-current={isActive ? "page" : undefined}
                aria-label={weekView.label}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                <span className="sr-only">{weekView.label}</span>
                <ViewIcon className="h-4 w-4" aria-hidden="true" />
              </Link>
            );
          })()}
        </div>
      ) : null}
    </nav>
  );
}
