"use client";

/**
 * Dynamic command center for the App Shell.
 *
 * This component switches its navigation, filters, and legends based on the
 * active Next.js route so each planner domain can keep its own sidebar controls
 * without leaking concerns into the shared layout.
 */

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { FilterArea } from "@/components/layout/sidebar-filter";

import { SidebarInbox } from "@/components/layout/sidebar-inbox";
import {
  defaultPlannerSemesterId,
  plannerEventCategories,
} from "@/features/planner/lib/planner";
import { plannerWeekEventCategories } from "@/features/weekly-schedule/lib/week-types";
import { getCalendarTheme } from "@/features/planner/lib/category-config";
import { getWeekTheme } from "@/features/weekly-schedule/lib/week-category-config";
import { useCreateEvent } from "@/features/planner/components/create-event-context";
import { useFilterState } from "@/features/planner/state/filter-state";
import { useFriendsState } from "@/features/friends/state/friends-state";

/**
 * Renders the route-aware sidebar controls for the active planner domain.
 */
export function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const semesterId = searchParams.get("semester") ?? defaultPlannerSemesterId;

  const { openCreateEvent, openCreateWeekEvent, openManageFriends } =
    useCreateEvent();

  const {
    hiddenCategories,
    hiddenWeekCategories,
    toggleCategory,
    toggleWeekCategory,
    syncParticipantFiltersToFriends,
    clearDateTimeRange,
  } = useFilterState();

  const { friendNames, isHydrated: friendsHydrated } = useFriendsState();

  // Remove any participant filters for friends that no longer exist
  useEffect(() => {
    if (friendsHydrated) {
      syncParticipantFiltersToFriends(friendNames);
    }
  }, [friendsHydrated, friendNames, syncParticipantFiltersToFriends]);

  const isWeekView = pathname === "/week";

  const prevIsWeekView = useRef(isWeekView);
  useEffect(() => {
    if (prevIsWeekView.current !== isWeekView) {
      prevIsWeekView.current = isWeekView;
      clearDateTimeRange();
    }
  }, [isWeekView, clearDateTimeRange]);

  return (
    <>
      {isWeekView ? (
        <>
          <section className="rounded-[1.25rem] border border-sam-border bg-sam-surface p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sam-text-3">
              Weekly categories
            </p>
            <div className="mt-3 space-y-2">
              {plannerWeekEventCategories.map((category) => {
                const isHidden = hiddenWeekCategories.has(category);

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleWeekCategory(category)}
                    className={`flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-xs transition-all hover:bg-sam-surface-2 dark:hover:bg-sam-surface-3 ${
                      isHidden ? "opacity-40" : ""
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${getWeekTheme(category).accent}`}
                    />
                    <span className="flex-1 text-left text-sam-text-2">
                      {category}
                    </span>
                    {isHidden ? (
                      <EyeOff size={11} className="shrink-0 text-sam-text-4" />
                    ) : (
                      <Eye size={11} className="shrink-0 text-sam-text-3" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <button
            type="button"
            onClick={() => openManageFriends()}
            className="w-full rounded-lg border border-sam-border bg-sam-surface px-3 py-2 text-xs font-medium text-sam-text-2 transition-colors hover:bg-sam-surface-2 dark:hover:bg-sam-surface-2"
          >
            Manage friends
          </button>

          <button
            type="button"
            onClick={() => openCreateWeekEvent()}
            className="w-full rounded-lg border border-sam-border bg-sam-surface px-3 py-2 text-xs font-medium text-sam-text-2 transition-colors hover:bg-sam-surface-2 dark:hover:bg-sam-surface-2"
          >
            + Add weekly appointment
          </button>

          <FilterArea />
        </>
      ) : (
        <>
          <section className="rounded-[1.25rem] border border-sam-border bg-sam-surface p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sam-text-3">
              Categories
            </p>
            <div className="mt-3 space-y-2">
              {plannerEventCategories.map((category) => {
                const theme = getCalendarTheme(category);
                const isHidden = hiddenCategories.has(category);

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-xs transition-all hover:bg-sam-surface-2 dark:hover:bg-sam-surface-3 ${
                      isHidden ? "opacity-40" : ""
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${theme.accent}`}
                    />
                    <span className="flex-1 text-left text-sam-text-2">
                      {category}
                    </span>
                    {isHidden ? (
                      <EyeOff size={11} className="shrink-0 text-sam-text-4" />
                    ) : (
                      <Eye size={11} className="shrink-0 text-sam-text-3" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <button
            type="button"
            onClick={() => openManageFriends()}
            className="w-full rounded-lg border border-sam-border bg-sam-surface px-3 py-2 text-xs font-medium text-sam-text-2 transition-colors hover:bg-sam-surface-2 dark:hover:bg-sam-surface-2"
          >
            Manage friends
          </button>

          <button
            type="button"
            onClick={() => openCreateEvent()}
            className="w-full rounded-lg border border-sam-border bg-sam-surface px-3 py-2 text-xs font-medium text-sam-text-2 transition-colors hover:bg-sam-surface-2 dark:hover:bg-sam-surface-2"
          >
            + Add Event
          </button>

          <FilterArea />
        </>
      )}

      {pathname === "/crosstables" || pathname === "/week" ? null : (
        <SidebarInbox />
      )}
    </>
  );
}
