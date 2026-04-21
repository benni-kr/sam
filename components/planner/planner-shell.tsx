"use client";

import { useEffect, useRef, useState } from "react";
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
  const [semesterMenuOpen, setSemesterMenuOpen] = useState(false);
  const semesterMenuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const semesterId = searchParams.get("semester") ?? defaultPlannerSemesterId;
  const activeSemester = getPlannerSemester(semesterId);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        semesterMenuRef.current &&
        !semesterMenuRef.current.contains(event.target as Node)
      ) {
        setSemesterMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSemesterMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Semester Aktivity Manager
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {activeSemester.label}
              </h1>
            </div>
            <div
              ref={semesterMenuRef}
              className="relative self-start sm:self-auto"
            >
              <button
                type="button"
                onClick={() => setSemesterMenuOpen((current) => !current)}
                aria-expanded={semesterMenuOpen}
                aria-haspopup="menu"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-white"
              >
                <span className="font-medium">{activeSemester.label}</span>
                <span className="text-slate-400">▾</span>
              </button>

              {semesterMenuOpen ? (
                <div className="absolute right-0 top-12 z-20 w-72 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Choose semester
                  </p>

                  <div className="space-y-1">
                    {plannerSemesters.map((semester) => {
                      const isActive = semester.id === semesterId;
                      const href = buildSemesterHref(semester.id);

                      return (
                        <Link
                          key={semester.id}
                          href={href}
                          aria-current={isActive ? "true" : undefined}
                          onClick={() => setSemesterMenuOpen(false)}
                          className={`block rounded-xl px-3 py-3 text-left transition-colors ${
                            isActive
                              ? "bg-slate-900 text-white"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">
                              {semester.label}
                            </span>
                            <span className="text-xs text-current/70">
                              {semester.dateRangeLabel}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            {activeSemester.description}
          </p>

          <PlannerTabs activeSemesterId={semesterId} />
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-6">{children}</div>
      </div>
    </main>
  );
}
