"use client";

import { MonthCard } from "@/features/planner/components/month-card";
import { usePlannerState } from "@/features/planner/state/planner-state";

/**
 * Renders the semester calendar as a vertical stack of month cards.
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
