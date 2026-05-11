"use client";

/**
 * Dynamic command center for the App Shell.
 *
 * This component switches its navigation, filters, and legends based on the
 * active Next.js route so each planner domain can keep its own sidebar controls
 * without leaking concerns into the shared layout.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlannerTabs } from "@/features/planner/components/planner-tabs";
import { SidebarInbox } from "@/components/layout/sidebar-inbox";
import {
  defaultPlannerSemesterId,
  plannerEventCategories,
} from "@/features/planner/lib/planner";
import { plannerWeekEventCategories } from "@/features/weekly-schedule/lib/week-types";
import { getCalendarTheme } from "@/features/planner/lib/category-config";
import { getWeekTheme } from "@/features/weekly-schedule/lib/week-category-config";
import { useCreateEvent } from "@/features/planner/components/create-event-context";

/**
 * Renders the route-aware sidebar controls for the active planner domain.
 */
export function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const semesterId = searchParams.get("semester") ?? defaultPlannerSemesterId;

  const { openCreateEvent, openCreateWeekEvent, openManageFriends } =
    useCreateEvent();

  const hideFinished = searchParams.get("hideFinished") !== "0";
  const hideUndated = searchParams.get("hideUndated") === "1";
  const hideInactiveParticipants = searchParams.get("hideInactive") !== "0";

  function setCrosstablesFilterParam(
    key: "hideFinished" | "hideUndated" | "hideInactive",
    enabled: boolean,
  ) {
    // URLSearchParams lets us toggle one view filter while preserving the rest
    // of the current route state, including the active semester and other flags.
    const params = new URLSearchParams(searchParams.toString());

    if (key === "hideFinished" || key === "hideInactive") {
      params.set(key, enabled ? "1" : "0");
    } else if (enabled) {
      params.set(key, "1");
    } else {
      params.delete(key);
    }

    const query = params.toString();
    const nextHref = query ? `${pathname}?${query}` : pathname;

    router.push(nextHref, { scroll: false });
  }

  return (
    <>
      <div>
        <PlannerTabs activeSemesterId={semesterId} />
      </div>

      {pathname === "/week" ? (
        // Swap the calendar legend and buttons for the weekly routine controls
        // so the sidebar stays aligned with the active domain.
        <>
          <section className="rounded-[1.25rem] border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Weekly categories
            </p>
            <div className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {plannerWeekEventCategories.map((category) => (
                <div key={category} className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${getWeekTheme(category).accent}`}
                  />
                  {category}
                </div>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={() => openManageFriends()}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Manage friends
          </button>

          <button
            type="button"
            onClick={() => openCreateWeekEvent()}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            + Add weekly appointment
          </button>
        </>
      ) : (
        // Swap the weekly routine controls back to the calendar legend and
        // creation buttons when the active route is a calendar domain view.
        <>
          <section className="rounded-[1.25rem] border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Categories
            </p>
            <div className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {plannerEventCategories.map((category) => (
                <div key={category} className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${getCalendarTheme(category).accent}`}
                  />
                  {category}
                </div>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={() => openManageFriends()}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Manage friends
          </button>

          <button
            type="button"
            onClick={() => openCreateEvent()}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            + Add Event
          </button>
        </>
      )}

      {(pathname === "/crosstables" || pathname === "/list") && (
        // These route-specific filters belong to the table and list views, not
        // the calendar or weekly routines, so they are rendered conditionally.
        <section className="rounded-[1.25rem] border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            View Filters
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-300">
              <span>Hide finished events</span>
              <button
                type="button"
                role="switch"
                aria-checked={hideFinished}
                onClick={() =>
                  setCrosstablesFilterParam("hideFinished", !hideFinished)
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 ${
                  hideFinished
                    ? "border-slate-900 bg-slate-900 dark:border-white dark:bg-white"
                    : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    hideFinished ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {pathname === "/crosstables" && (
              <>
                <div className="flex items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-300">
                  <span>Hide undated events</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={hideUndated}
                    onClick={() =>
                      setCrosstablesFilterParam("hideUndated", !hideUndated)
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 ${
                      hideUndated
                        ? "border-slate-900 bg-slate-900 dark:border-white dark:bg-white"
                        : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        hideUndated ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-300">
                  <span>Hide inactive participants</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={hideInactiveParticipants}
                    onClick={() =>
                      setCrosstablesFilterParam(
                        "hideInactive",
                        !hideInactiveParticipants,
                      )
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 ${
                      hideInactiveParticipants
                        ? "border-slate-900 bg-slate-900 dark:border-white dark:bg-white"
                        : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        hideInactiveParticipants
                          ? "translate-x-5"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {pathname === "/crosstables" || pathname === "/week" ? null : (
        <SidebarInbox />
      )}
    </>
  );
}
