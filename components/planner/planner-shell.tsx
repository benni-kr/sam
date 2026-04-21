"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { PlannerTabs } from "@/components/planner/planner-tabs";
import {
  defaultPlannerSemesterId,
  getPlannerSemester,
  plannerSemesters,
} from "@/lib/planner";

type PlannerShellProps = {
  children: React.ReactNode;
};

export function PlannerShell({ children }: PlannerShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const semesterId = searchParams.get("semester") ?? defaultPlannerSemesterId;
  const activeSemester = getPlannerSemester(semesterId);

  function buildSemesterHref(nextSemesterId: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextSemesterId === defaultPlannerSemesterId) {
      params.delete("semester");
    } else {
      params.set("semester", nextSemesterId);
    }

    const query = params.toString();

    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8f7f3,_#efede6_55%,_#e7e2d7)] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/75 px-5 py-5 shadow-[0_1px_0_rgba(15,23,42,0.04),0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:px-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Semester Aktivity Manager
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {activeSemester.label}
              </h1>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
              {activeSemester.dateRangeLabel}
            </div>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            {activeSemester.description}
          </p>

          <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Semester
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Switch between calendar data sets without leaving the planner.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {plannerSemesters.map((semester) => {
                const isActive = semester.id === semesterId;
                const href = buildSemesterHref(semester.id);

                return (
                  <Link
                    key={semester.id}
                    href={href}
                    aria-current={isActive ? "true" : undefined}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }`}
                  >
                    {semester.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <PlannerTabs activeSemesterId={semesterId} />
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-6">{children}</div>
      </div>
    </main>
  );
}
