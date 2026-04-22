"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { defaultPlannerSemesterId, plannerViews } from "@/lib/planner";

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

  return (
    <nav aria-label="Planner views" className="flex flex-wrap gap-2">
      {plannerViews.map((view) => {
        const isActive = pathname === view.href;
        const href = buildViewHref(view.href);

        return (
          <Link
            key={view.key}
            href={href}
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
