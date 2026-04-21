"use client";

import { MonthCard } from "@/components/planner/month-card";
import { usePlannerState } from "@/components/planner/planner-state";

export function CalendarView() {
  const { activeSemester, months } = usePlannerState();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          Calendar
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          {activeSemester.label}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Six months stacked for a wider, editable planning surface.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {months.map((month) => (
          <MonthCard key={`${month.year}-${month.monthIndex}`} month={month} />
        ))}
      </div>
    </section>
  );
}
