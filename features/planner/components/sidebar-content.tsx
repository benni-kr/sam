"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlannerTabs } from "@/features/planner/components/planner-tabs";
import { SidebarInbox } from "@/features/planner/components/sidebar-inbox";
import { defaultPlannerSemesterId } from "@/features/planner/lib/planner";
import { useCreateEvent } from "@/features/planner/components/create-event-context";

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
        <>
          <section className="rounded-[1.25rem] border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Weekly categories
            </p>
            <div className="mt-3 space-y-2 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                University
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-900" />
                Language courses
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                Sports
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-900" />
                Other
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={() => openManageFriends()}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Manage friends
          </button>

          <button
            type="button"
            onClick={() => openCreateWeekEvent()}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            + Add weekly appointment
          </button>
        </>
      ) : (
        <>
          <section className="rounded-[1.25rem] border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Categories
            </p>
            <div className="mt-3 space-y-2 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                Exam
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                Language Exam
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Group Event
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                Private Event
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                Other
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={() => openManageFriends()}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Manage friends
          </button>

          <button
            type="button"
            onClick={() => openCreateEvent()}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            + Add Event
          </button>
        </>
      )}

      {(pathname === "/crosstables" || pathname === "/list") && (
        <section className="rounded-[1.25rem] border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            View Filters
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs text-slate-700">
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
                    ? "border-slate-900 bg-slate-900"
                    : "border-slate-300 bg-slate-200"
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
                <div className="flex items-center justify-between gap-3 text-xs text-slate-700">
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
                        ? "border-slate-900 bg-slate-900"
                        : "border-slate-300 bg-slate-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        hideUndated ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 text-xs text-slate-700">
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
                        ? "border-slate-900 bg-slate-900"
                        : "border-slate-300 bg-slate-200"
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
