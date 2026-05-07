"use client";

/**
 * Primary navigation for the planner.
 *
 * This component keeps the active semester state in the URL while users
 * switch between the planner's domain views (Calendar, List, Week, and
 * Crosstables), so navigation does not reset the current semester context.
 */

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

type PlannerViewLinkProps = {
  href: string;
  label: string;
  icon: typeof Calendar;
  isActive: boolean;
};

/**
 * Shared link button for planner view navigation.
 */
function PlannerViewLink({
  href,
  label,
  icon: ViewIcon,
  isActive,
}: PlannerViewLinkProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      aria-label={label}
      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
        isActive
          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
      }`}
    >
      <span className="sr-only">{label}</span>
      <ViewIcon className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

/**
 * Planner view navigation that preserves semester context across routes.
 */

export function PlannerTabs({ activeSemesterId }: PlannerTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const semesterId = activeSemesterId ?? defaultPlannerSemesterId;
  const regularViews = plannerViews.filter((view) => view.key !== "week");
  const weekView = plannerViews.find((view) => view.key === "week");

  function buildViewHref(viewHref: string) {
    const params = new URLSearchParams(searchParams.toString());

    // State Persistence Rule: manually merge the current semester query
    // parameter into every navigation link so switching tabs never resets the
    // planner back to the default semester.
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
            <PlannerViewLink
              key={view.key}
              href={href}
              label={view.label}
              icon={ViewIcon}
              isActive={isActive}
            />
          );
        })}
      </div>

      {weekView ? (
        <div className="ml-auto flex flex-wrap gap-2">
          <PlannerViewLink
            href={buildViewHref(weekView.href)}
            label={weekView.label}
            icon={iconByViewKey[weekView.key]}
            isActive={pathname === weekView.href}
          />
        </div>
      ) : null}
    </nav>
  );
}
