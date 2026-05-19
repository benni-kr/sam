"use client";

/**
 * Global application shell for the planner routes.
 *
 * This wrapper initializes the shared FriendsProvider and PlannerStateProvider
 * and hosts the shared @dnd-kit/core drag-and-drop context used across the
 * planner domain.
 */

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  type Modifier,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";

import { PlannerTabs } from "@/features/planner/components/planner-tabs";
import { EventBadge } from "@/features/planner/components/event-badge";
import { CreateEventProvider } from "@/features/planner/components/create-event-context";
import { FilterStateProvider } from "@/features/planner/state/filter-state";
import { PlannerStateProvider } from "@/features/planner/state/planner-state";
import { usePlannerState } from "@/features/planner/state/planner-state";
import { CreateEventModal } from "@/components/layout/create-event-modal";
import { CreateWeekEventModal } from "@/components/layout/create-week-event-modal";
import { ManageFriendsModal } from "@/components/layout/manage-friends-modal";
import {
  FriendsProvider,
  useFriendsState,
} from "@/features/friends/state/friends-state";
import { getDefaultWeekAppointmentTimeRange } from "@/components/ui/time-picker";
import {
  defaultPlannerSemesterId,
  getPlannerSemester,
  plannerSemesters,
  type PlannerEventCategory,
  type PlannerEvent,
} from "@/features/planner/lib/planner";
import {
  type PlannerWeekEventCategory,
  type PlannerWeekday,
} from "@/features/weekly-schedule/lib/week-types";

type AppShellProps = {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
};

// Prefer pointer collisions over closest-center so drops land on the intended
// calendar day or inbox target instead of a nearby overlapping layout center.
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);

  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  return closestCenter(args);
};

function getActivatorPoint(activatorEvent: Event | null) {
  if (!activatorEvent) {
    return null;
  }

  const clientPoint = activatorEvent as {
    clientX?: unknown;
    clientY?: unknown;
  };

  if (
    typeof clientPoint.clientX === "number" &&
    typeof clientPoint.clientY === "number"
  ) {
    return {
      x: clientPoint.clientX,
      y: clientPoint.clientY,
    };
  }

  const touchEvent = activatorEvent as {
    touches?: Array<{
      clientX?: unknown;
      clientY?: unknown;
    }>;
  };
  const touchPoint = touchEvent.touches?.[0] ?? null;

  if (
    !touchPoint ||
    typeof touchPoint.clientX !== "number" ||
    typeof touchPoint.clientY !== "number"
  ) {
    return null;
  }

  return {
    x: touchPoint.clientX,
    y: touchPoint.clientY,
  };
}

// Snap the drag preview to the cursor so the overlay follows the pointer
// instead of anchoring to the top-left corner of the source element.
const snapOverlayToCursor: Modifier = ({
  transform,
  activeNodeRect,
  activatorEvent,
}) => {
  if (!activeNodeRect) {
    return transform;
  }

  const cursorPoint = getActivatorPoint(activatorEvent);

  if (!cursorPoint) {
    return transform;
  }

  return {
    ...transform,
    x: transform.x + cursorPoint.x - activeNodeRect.left,
    y: transform.y + cursorPoint.y - activeNodeRect.top,
  };
};

/**
 * Primary planner layout boundary that renders the main content area and an
 * optional domain-specific sidebar.
 */
export function AppShell({ children, sidebarContent }: AppShellProps) {
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
    <FriendsProvider>
      <FilterStateProvider>
        <PlannerStateProvider activeSemesterId={semesterId}>
          <AppShellFrame
            semesterId={semesterId}
            activeSemester={activeSemester}
            semesterMenuOpen={semesterMenuOpen}
            semesterMenuRef={semesterMenuRef}
            setSemesterMenuOpen={setSemesterMenuOpen}
            buildSemesterHref={buildSemesterHref}
            sidebarContent={sidebarContent}
          >
            {children}
          </AppShellFrame>
        </PlannerStateProvider>
      </FilterStateProvider>
    </FriendsProvider>
  );
}

function AppShellFrame({
  semesterId,
  activeSemester,
  semesterMenuOpen,
  semesterMenuRef,
  setSemesterMenuOpen,
  buildSemesterHref,
  sidebarContent,
  children,
}: {
  semesterId: string;
  activeSemester: ReturnType<typeof getPlannerSemester>;
  semesterMenuOpen: boolean;
  semesterMenuRef: React.RefObject<HTMLDivElement | null>;
  setSemesterMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  buildSemesterHref: (nextSemesterId: string) => string;
  sidebarContent?: React.ReactNode;
  children: React.ReactNode;
}) {
  const {
    events,
    moveEventToInbox,
    moveEventToDate,
    createEvent,
    createWeekEvent,
  } = usePlannerState();
  const { friendNames } = useFriendsState();

  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateWeekModalOpen, setIsCreateWeekModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<PlannerEventCategory>("Exam");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [weekTitle, setWeekTitle] = useState("");
  const [weekDescription, setWeekDescription] = useState("");
  const [weekCategory, setWeekCategory] =
    useState<PlannerWeekEventCategory>("University");
  const [weekDay, setWeekDay] = useState<PlannerWeekday>("Mon");
  const [weekStartTime, setWeekStartTime] = useState("");
  const [weekEndTime, setWeekEndTime] = useState("");
  const [weekParticipants, setWeekParticipants] = useState<string[]>([]);
  const [isManageFriendsOpen, setIsManageFriendsOpen] = useState(false);

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

  useEffect(() => {
    if (!activeEventId) {
      return;
    }

    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = "grabbing";

    return () => {
      document.body.style.cursor = previousCursor;
    };
  }, [activeEventId]);

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
    const overDateKey = event.over?.data.current?.dateKey;

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
      moveEventToDate(eventId, overDateKey ?? targetId.replace("date:", ""));
    }
  }

  function handleDragCancel() {
    setActiveEventId(null);
  }

  function openCreateEvent(dateKey?: string) {
    setTitle("");
    setDescription("");
    setCategory("Exam");
    setStartDate(dateKey ?? "");
    setEndDate(dateKey ?? "");
    setParticipants([]);
    setIsCreateModalOpen(true);
  }

  function closeCreateEvent() {
    setIsCreateModalOpen(false);
    setTitle("");
    setDescription("");
    setCategory("Exam");
    setStartDate("");
    setEndDate("");
    setParticipants([]);
  }

  function openCreateWeekEvent(day: PlannerWeekday = "Mon") {
    setWeekTitle("");
    setWeekDescription("");
    setWeekCategory("University");
    setWeekDay(day);
    setWeekStartTime("");
    setWeekEndTime("");
    setWeekParticipants([]);
    setIsCreateWeekModalOpen(true);
  }

  function closeCreateWeekEvent() {
    setIsCreateWeekModalOpen(false);
    setWeekTitle("");
    setWeekDescription("");
    setWeekCategory("University");
    setWeekDay("Mon");
    setWeekStartTime("");
    setWeekEndTime("");
    setWeekParticipants([]);
  }

  function handleCreateWeekEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedRange = getDefaultWeekAppointmentTimeRange(
      weekStartTime,
      weekEndTime,
    );

    createWeekEvent({
      title: weekTitle,
      description: weekDescription,
      category: weekCategory,
      day: weekDay,
      startTime: normalizedRange.startTime,
      endTime: normalizedRange.endTime,
      participants: weekParticipants,
    });

    closeCreateWeekEvent();
  }

  function handleCreateEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    createEvent({
      title,
      description,
      category,
      startDate: startDate || null,
      endDate: endDate || null,
      participants,
    });

    setTitle("");
    setStartDate("");
    setEndDate("");
    setParticipants([]);
    setIsCreateModalOpen(false);
  }

  return (
    <CreateEventProvider
      value={{
        openCreateEvent,
        openCreateWeekEvent,
        openManageFriends: () => setIsManageFriendsOpen(true),
      }}
    >
      <DndContext
        id="sam-planner-dnd"
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <main className="min-h-screen bg-page text-sam-text-1">
          <div className="mx-auto grid min-h-screen w-full max-w-350 gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6">
            <aside className="flex flex-col overflow-hidden rounded-3xl border border-sam-border bg-sam-surface p-4 shadow-xl dark:shadow-none lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
              {/* PINNED HEADER */}
              <div className="flex-none flex flex-col gap-3 pb-4 mb-2 border-b border-sam-border/60 dark:border-slate-700/60">
                <div className="flex items-start justify-between">
                  <div className="flex items-baseline gap-2 pt-1">
                    <h1 className="text-2xl font-black tracking-tighter text-sam-text-1 leading-none">
                      sam
                      <span className="text-blue-500 dark:text-blue-400">
                        .
                      </span>
                    </h1>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href="https://github.com/benni-kr/sam"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="GitHub repository"
                      className="text-sam-text-4 hover:text-sam-text-2 transition-colors"
                    >
                      <svg
                        className="h-6 w-6"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.263.82-.583 0-.288-.01-1.05-.016-2.06-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.334-1.757-1.334-1.757-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.76-1.605-2.665-.305-5.467-1.332-5.467-5.93 0-1.31.468-2.382 1.235-3.222-.124-.303-.535-1.527.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 3.003-.404c1.02.005 2.045.138 3.003.404 2.29-1.552 3.296-1.23 3.296-1.23.654 1.649.243 2.873.12 3.176.77.84 1.233 1.912 1.233 3.222 0 4.61-2.807 5.62-5.48 5.92.43.37.823 1.096.823 2.21 0 1.595-.015 2.88-.015 3.273 0 .322.216.699.825.58C20.565 21.796 24 17.298 24 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                    </a>

                    <ThemeToggle />
                  </div>
                </div>

                {/* Dropdown: Improved contrast and perfectly attached submenu */}
                <div className="relative min-w-0 flex-1" ref={semesterMenuRef}>
                  <button
                    type="button"
                    onClick={() => setSemesterMenuOpen((current) => !current)}
                    aria-expanded={semesterMenuOpen}
                    aria-haspopup="menu"
                    className="group flex w-full items-center justify-between rounded-xl border border-sam-border bg-sam-surface-2 px-3 py-2 text-left transition-all hover:border-sam-border-2 hover:bg-sam-surface-3"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-sam-text-3">
                        {activeSemester.label}
                      </span>
                    </div>
                    <span className="text-sam-text-4 transition-colors group-hover:text-sam-text-2">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                        />
                      </svg>
                    </span>
                  </button>

                  {semesterMenuOpen ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-xl border border-sam-border bg-sam-surface p-1 shadow-[0_16px_40px_rgba(15,23,42,0.12)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
                      {plannerSemesters.map((semester) => {
                        const isActive = semester.id === semesterId;
                        const href = buildSemesterHref(semester.id);

                        return (
                          <a
                            key={semester.id}
                            href={href}
                            aria-current={isActive ? "true" : undefined}
                            onClick={() => setSemesterMenuOpen(false)}
                            className={`block rounded-lg px-3 py-2 text-left transition-colors ${
                              isActive
                                ? "bg-sam-surface-3 text-sam-text-1 font-semibold"
                                : "text-sam-text-2 hover:bg-sam-surface-2"
                            }`}
                          >
                            <span className="text-sm">{semester.label}</span>
                          </a>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="pt-1">
                  <PlannerTabs activeSemesterId={semesterId} />
                </div>
              </div>

              {/* SCROLLING CONTENT */}
              <div className="min-h-0 flex-1">
                <div className="h-full space-y-5 overflow-y-auto pb-4 scrollbar-slim pr-2">
                  {sidebarContent ? sidebarContent : null}
                </div>
              </div>
            </aside>

            <section className="min-h-0 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-auto lg:pr-1">
              {children}
            </section>
          </div>
        </main>

        <DragOverlay modifiers={[snapOverlayToCursor]}>
          {activeEvent ? (
            <div className="pointer-events-none w-[min(20rem,calc(100vw-2rem))] max-w-[24rem] rotate-1 shadow-2xl">
              <EventBadge event={activeEvent} />
            </div>
          ) : null}
        </DragOverlay>

        <CreateEventModal
          isOpen={isCreateModalOpen}
          heading="Add event"
          submitLabel="Add event"
          title={title}
          description={description}
          category={category}
          startDate={startDate}
          endDate={endDate}
          participants={participants}
          availableParticipants={friendNames}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onCategoryChange={(nextCategory: PlannerEventCategory) =>
            setCategory(nextCategory)
          }
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onParticipantsChange={setParticipants}
          onSubmit={handleCreateEvent}
          onCancel={closeCreateEvent}
        />

        <CreateWeekEventModal
          isOpen={isCreateWeekModalOpen}
          heading="Add weekly appointment"
          submitLabel="Add weekly appointment"
          title={weekTitle}
          description={weekDescription}
          category={weekCategory}
          day={weekDay}
          startTime={weekStartTime}
          endTime={weekEndTime}
          participants={weekParticipants}
          availableParticipants={friendNames}
          onTitleChange={setWeekTitle}
          onDescriptionChange={setWeekDescription}
          onCategoryChange={setWeekCategory}
          onDayChange={setWeekDay}
          onStartTimeChange={setWeekStartTime}
          onEndTimeChange={setWeekEndTime}
          onParticipantsChange={setWeekParticipants}
          onSubmit={handleCreateWeekEvent}
          onCancel={closeCreateWeekEvent}
        />

        <ManageFriendsModal
          isOpen={isManageFriendsOpen}
          onClose={() => setIsManageFriendsOpen(false)}
        />
      </DndContext>
    </CreateEventProvider>
  );
}
