"use client";

/**
 * Primary feature-level component for the Chronological Calendar domain.
 *
 * It coordinates rendering the semester's six-month grid by mapping the
 * state-provided months to individual `MonthCard` units.
 */

import { MonthCard } from "@/features/planner/components/month-card";
import { usePlannerState } from "@/features/planner/state/planner-state";

/**
 * Renders the semester calendar as a vertical stack of month cards.
 *
 * This view relies on `PlannerStateProvider` for the active semester's data,
 * keeping the grid in sync when the user switches semesters in the App Shell.
 */
export function CalendarView() {
  const { months } = usePlannerState();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-4">
        {months.map((month) => (
          <MonthCard key={`${month.year}-${month.monthIndex}`} month={month} />
        ))}
      </div>
    </section>
  );
}
