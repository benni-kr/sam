import { PlannerTabs } from "@/components/planner/planner-tabs";
import { plannerSemester } from "@/lib/planner";

type PlannerShellProps = {
  children: React.ReactNode;
};

export function PlannerShell({ children }: PlannerShellProps) {
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
                {plannerSemester.label}
              </h1>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
              {plannerSemester.dateRangeLabel}
            </div>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            {plannerSemester.description}
          </p>
          <PlannerTabs />
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-6">{children}</div>
      </div>
    </main>
  );
}
