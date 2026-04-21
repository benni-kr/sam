"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { EventBadge } from "@/components/planner/event-badge";
import { PlannerStateProvider } from "@/components/planner/planner-state";
import { usePlannerState } from "@/components/planner/planner-state";
import { PlannerTabs } from "@/components/planner/planner-tabs";
import { SidebarInbox } from "@/components/planner/sidebar-inbox";
import {
  defaultPlannerSemesterId,
  getPlannerSemester,
  plannerSemesters,
  type PlannerEvent,
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
    <PlannerStateProvider activeSemesterId={semesterId}>
      <PlannerShellFrame
        pathname={pathname}
        semesterId={semesterId}
        activeSemester={activeSemester}
        semesterMenuOpen={semesterMenuOpen}
        semesterMenuRef={semesterMenuRef}
        setSemesterMenuOpen={setSemesterMenuOpen}
        buildSemesterHref={buildSemesterHref}
      >
        {children}
      </PlannerShellFrame>
    </PlannerStateProvider>
  );
}

function PlannerShellFrame({
  pathname,
  semesterId,
  activeSemester,
  semesterMenuOpen,
  semesterMenuRef,
  setSemesterMenuOpen,
  buildSemesterHref,
  children,
}: {
  pathname: string;
  semesterId: string;
  activeSemester: ReturnType<typeof getPlannerSemester>;
  semesterMenuOpen: boolean;
  semesterMenuRef: React.RefObject<HTMLDivElement | null>;
  setSemesterMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  buildSemesterHref: (nextSemesterId: string) => string;
  children: React.ReactNode;
}) {
  const { events, moveEventToDate, moveEventToInbox } = usePlannerState();
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const activeEvent: PlannerEvent | null = activeEventId
    ? (events.find((event: PlannerEvent) => event.id === activeEventId) ?? null)
    : null;

  function handleDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id);

    if (!activeId.startsWith("event:")) {
      setActiveEventId(null);
      return;
    }

    setActiveEventId(activeId.replace("event:", ""));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveEventId(null);

    const overId = event.over?.id;

    if (!overId) {
      return;
    }

    const activeId = String(event.active.id);

    if (!activeId.startsWith("event:")) {
      return;
    }

    const eventId = activeId.replace("event:", "");
    const targetId = String(overId);

    if (targetId === "inbox") {
      moveEventToInbox(eventId);
      return;
    }

    if (targetId.startsWith("date:")) {
      moveEventToDate(eventId, targetId.replace("date:", ""));
    }
  }

  return (
    <DndContext
      id="sam-planner-dnd"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveEventId(null)}
    >
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8f7f3,_#efede6_55%,_#e7e2d7)] text-slate-950">
        <div className="mx-auto grid min-h-screen w-full max-w-[1400px] gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6">
          <aside className="rounded-[1.5rem] border border-white/70 bg-white/80 p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-y-auto">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Semester Aktivity Manager
                </p>
              </div>

              <div ref={semesterMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSemesterMenuOpen((current) => !current)}
                  aria-expanded={semesterMenuOpen}
                  aria-haspopup="menu"
                  className="inline-flex w-full items-center justify-between rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-white"
                >
                  <span className="font-medium">{activeSemester.label}</span>
                  <span className="text-slate-400">▾</span>
                </button>

                {semesterMenuOpen ? (
                  <div className="absolute left-0 right-0 top-12 z-20 overflow-hidden rounded-[1rem] border border-slate-200 bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                    {plannerSemesters.map((semester) => {
                      const isActive = semester.id === semesterId;
                      const href = buildSemesterHref(semester.id);

                      return (
                        <Link
                          key={semester.id}
                          href={href}
                          aria-current={isActive ? "true" : undefined}
                          onClick={() => setSemesterMenuOpen(false)}
                          className={`mt-1 block rounded-xl px-3 py-2 text-left transition-colors ${
                            isActive
                              ? "bg-slate-900 text-white"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <span className="text-sm font-medium">
                            {semester.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <PlannerTabs activeSemesterId={semesterId} />

              <section className="rounded-[1.25rem] border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Categories
                </p>
                <div className="mt-3 space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                    Exams
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Group Events
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    Private Events
                  </div>
                </div>
              </section>

              {pathname === "/" ? <SidebarInbox /> : null}
            </div>
          </aside>

          <section className="min-h-0">{children}</section>
        </div>
      </main>

      <DragOverlay>
        {activeEvent ? (
          <div className="w-full max-w-md rotate-1 shadow-2xl">
            <EventBadge event={activeEvent} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
