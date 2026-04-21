"use client";

import { MonthCard } from "@/components/planner/month-card";
import { usePlannerState } from "@/components/planner/planner-state";

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
