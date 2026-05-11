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
import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";

import { EventBadge } from "@/features/planner/components/event-badge";
import { CreateEventProvider } from "@/features/planner/components/create-event-context";
import { PlannerEventForm } from "@/features/planner/components/event-form";
import { PlannerStateProvider } from "@/features/planner/state/planner-state";
import { usePlannerState } from "@/features/planner/state/planner-state";
import { PlannerWeekEventForm } from "@/features/weekly-schedule/components/week-event-form";
import {
  FriendsProvider,
  useFriendsState,
} from "@/features/friends/state/friends-state";
import type { Friend } from "@/features/friends/lib/friend";
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
  const { friends, friendNames, addFriend, updateFriend, removeFriend } =
    useFriendsState();

  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateWeekModalOpen, setIsCreateWeekModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PlannerEventCategory>("Exam");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [weekTitle, setWeekTitle] = useState("");
  const [weekCategory, setWeekCategory] =
    useState<PlannerWeekEventCategory>("University");
  const [weekDay, setWeekDay] = useState<PlannerWeekday>("Mon");
  const [weekStartTime, setWeekStartTime] = useState("");
  const [weekEndTime, setWeekEndTime] = useState("");
  const [weekParticipants, setWeekParticipants] = useState<string[]>([]);
  const [newFriendName, setNewFriendName] = useState("");
  const [newFriendBirthday, setNewFriendBirthday] = useState("");
  const [editingFriendName, setEditingFriendName] = useState<string | null>(
    null,
  );
  const [editingFriendValue, setEditingFriendValue] = useState("");
  const [editingFriendBirthday, setEditingFriendBirthday] = useState("");
  const [isManageFriendsOpen, setIsManageFriendsOpen] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState<string | null>(null);

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
    setCategory("Exam");
    setStartDate(dateKey ?? "");
    setEndDate(dateKey ?? "");
    setParticipants([]);
    setIsCreateModalOpen(true);
  }

  function closeCreateEvent() {
    setIsCreateModalOpen(false);
    setTitle("");
    setCategory("Exam");
    setStartDate("");
    setEndDate("");
    setParticipants([]);
  }

  function openCreateWeekEvent(day: PlannerWeekday = "Mon") {
    setWeekTitle("");
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
    setWeekCategory("University");
    setWeekDay("Mon");
    setWeekStartTime("");
    setWeekEndTime("");
    setWeekParticipants([]);
  }

  function handleCreateWeekEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedRange = getDefaultWeekAppointmentTimeRange(
      weekStartTime,
      weekEndTime,
    );

    createWeekEvent({
      title: weekTitle,
      category: weekCategory,
      day: weekDay,
      startTime: normalizedRange.startTime,
      endTime: normalizedRange.endTime,
      participants: weekParticipants,
    });

    closeCreateWeekEvent();
  }

  function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    createEvent({
      title,
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

  function handleAddFriend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    addFriend(newFriendName, newFriendBirthday || undefined);
    setNewFriendName("");
    setNewFriendBirthday("");
  }

  function startEditingFriend(friend: Friend) {
    setEditingFriendName(friend.name);
    setEditingFriendValue(friend.name);
    setEditingFriendBirthday(friend.birthday ?? "");
  }

  function cancelEditingFriend() {
    setEditingFriendName(null);
    setEditingFriendValue("");
    setEditingFriendBirthday("");
  }

  function saveEditedFriend() {
    if (!editingFriendName) {
      return;
    }

    updateFriend(editingFriendName, {
      name: editingFriendValue,
      birthday: editingFriendBirthday || undefined,
    });
    cancelEditingFriend();
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
          <div className="mx-auto grid min-h-screen w-full max-w-[1400px] gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6">
            <aside className="overflow-hidden rounded-[1.5rem] border border-white/70 bg-sam-surface/80 p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-700/70 dark:shadow-[0_1px_0_rgba(0,0,0,0.2),0_20px_60px_rgba(0,0,0,0.3)] lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
              <div className="min-w-0 flex flex-col gap-4 lg:h-full lg:overflow-y-auto">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-sam-text-3">
                    Semester Activity Manager
                  </p>
                  <ThemeToggle />
                </div>

                <div ref={semesterMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setSemesterMenuOpen((current) => !current)}
                    aria-expanded={semesterMenuOpen}
                    aria-haspopup="menu"
                    className="inline-flex w-full items-center justify-between rounded-full border border-sam-border bg-sam-surface-2 px-4 py-2 text-sm text-sam-text-2 shadow-sm transition-colors hover:border-sam-border-2 hover:bg-sam-surface dark:hover:border-slate-600 dark:hover:bg-slate-700"
                  >
                    <span className="font-medium">{activeSemester.label}</span>
                    <span className="text-sam-text-4">▾</span>
                  </button>

                  {semesterMenuOpen ? (
                    <div className="absolute left-0 right-0 top-12 z-20 overflow-hidden rounded-[1rem] border border-sam-border bg-sam-surface p-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
                      {plannerSemesters.map((semester) => {
                        const isActive = semester.id === semesterId;
                        const href = buildSemesterHref(semester.id);

                        return (
                          <a
                            key={semester.id}
                            href={href}
                            aria-current={isActive ? "true" : undefined}
                            onClick={() => setSemesterMenuOpen(false)}
                            className={`mt-1 block rounded-xl px-3 py-2 text-left transition-colors ${
                              isActive
                                ? "bg-sam-solid text-sam-solid-fg"
                                : "text-sam-text-2 hover:bg-sam-surface-3 dark:hover:bg-sam-surface-2"
                            }`}
                          >
                            <span className="text-sm font-medium">
                              {semester.label}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                {sidebarContent ? sidebarContent : null}
              </div>
            </aside>

            <section className="min-h-0">{children}</section>
          </div>
        </main>

        <DragOverlay modifiers={[snapOverlayToCursor]}>
          {activeEvent ? (
            <div className="pointer-events-none w-[min(20rem,calc(100vw-2rem))] max-w-[24rem] rotate-1 shadow-2xl">
              <EventBadge event={activeEvent} />
            </div>
          ) : null}
        </DragOverlay>

        {isCreateModalOpen ? (
          <PlannerEventForm
            heading="Add event"
            submitLabel="Add event"
            title={title}
            category={category}
            startDate={startDate}
            endDate={endDate}
            participants={participants}
            availableParticipants={friendNames}
            onTitleChange={setTitle}
            onCategoryChange={(nextCategory: PlannerEventCategory) =>
              setCategory(nextCategory)
            }
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onParticipantsChange={setParticipants}
            onSubmit={handleCreateEvent}
            onCancel={closeCreateEvent}
          />
        ) : null}

        {isCreateWeekModalOpen ? (
          <PlannerWeekEventForm
            heading="Add weekly appointment"
            submitLabel="Add weekly appointment"
            title={weekTitle}
            category={weekCategory}
            day={weekDay}
            startTime={weekStartTime}
            endTime={weekEndTime}
            participants={weekParticipants}
            availableParticipants={friendNames}
            onTitleChange={setWeekTitle}
            onCategoryChange={setWeekCategory}
            onDayChange={setWeekDay}
            onStartTimeChange={setWeekStartTime}
            onEndTimeChange={setWeekEndTime}
            onParticipantsChange={setWeekParticipants}
            onSubmit={handleCreateWeekEvent}
            onCancel={closeCreateWeekEvent}
          />
        ) : null}

        {isManageFriendsOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"
            onClick={() => setIsManageFriendsOpen(false)}
          >
            <section
              className="w-full max-w-md rounded-2xl border border-sam-border bg-sam-surface p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sam-text-3">
                Friends
              </p>
              <h3 className="mt-1 text-lg font-semibold text-sam-text-1">
                Manage your friends
              </h3>
              <p className="mt-1 text-xs text-sam-text-3">
                Add, rename, or remove friends used in event participants.
              </p>

              <form
                onSubmit={handleAddFriend}
                className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem_auto]"
              >
                <input
                  value={newFriendName}
                  onChange={(event) => setNewFriendName(event.target.value)}
                  placeholder="Add friend"
                  maxLength={15}
                  className="min-w-0 flex-1 rounded-lg border border-sam-border bg-sam-surface px-3 py-2 text-sm text-sam-text-2 outline-none ring-slate-300 focus:ring dark:ring-slate-600"
                />
                <input
                  type="date"
                  value={newFriendBirthday}
                  onChange={(event) => setNewFriendBirthday(event.target.value)}
                  aria-label="Birthday"
                  className="min-w-0 rounded-lg border border-sam-border bg-sam-surface px-3 py-2 text-sm text-sam-text-2 outline-none ring-slate-300 focus:ring dark:ring-slate-600"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-sam-solid px-3 py-2 text-sm font-medium text-sam-solid-fg hover:bg-slate-700 dark:hover:bg-slate-200"
                >
                  Add
                </button>
              </form>

              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                {friends.map((friend) => (
                  <div
                    key={friend.name}
                    className="rounded-xl border border-sam-border bg-sam-surface-2/80 p-2"
                  >
                    {friendToDelete === friend.name ? (
                      <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-2">
                        <p className="text-xs font-medium text-red-800 dark:text-red-700 text-center">
                          Remove {friend.name} from all events?
                          <br />
                          <span className="mt-1 block font-normal opacity-80 dark:opacity-100 dark:text-red-500">
                            (Be careful, it&apos;s always easier to lose friends
                            than to make new ones!)
                          </span>
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setFriendToDelete(null)}
                            className="flex-1 rounded-md border border-sam-border bg-sam-surface px-2 py-1.5 text-xs text-sam-text-2 hover:bg-sam-surface-3 dark:hover:bg-slate-600"
                          >
                            Keep
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              removeFriend(friend.name);
                              setFriendToDelete(null);
                            }}
                            className="flex-1 rounded-md bg-red-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                          >
                            Yes, remove
                          </button>
                        </div>
                      </div>
                    ) : editingFriendName === friend.name ? (
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem_auto_auto] sm:items-center">
                        <input
                          value={editingFriendValue}
                          onChange={(event) =>
                            setEditingFriendValue(event.target.value)
                          }
                          maxLength={15}
                          className="min-w-0 flex-1 rounded-lg border border-sam-border bg-sam-surface px-3 py-1.5 text-sm text-sam-text-2 outline-none ring-slate-300 focus:ring dark:ring-slate-600"
                          aria-label={`Edit ${friend.name}`}
                        />
                        <input
                          type="date"
                          value={editingFriendBirthday}
                          onChange={(event) =>
                            setEditingFriendBirthday(event.target.value)
                          }
                          aria-label={`Birthday for ${friend.name}`}
                          className="min-w-0 rounded-lg border border-sam-border bg-sam-surface px-3 py-1.5 text-sm text-sam-text-2 outline-none ring-slate-300 focus:ring dark:ring-slate-600"
                        />
                        <button
                          type="button"
                          onClick={saveEditedFriend}
                          className="rounded-md border border-sam-border bg-sam-surface px-2 py-1 text-xs text-sam-text-2 hover:bg-sam-surface-3 dark:hover:bg-slate-600"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingFriend}
                          className="rounded-md border border-sam-border bg-sam-surface px-2 py-1 text-xs text-sam-text-3 hover:bg-sam-surface-3 dark:hover:bg-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="block truncate text-sm text-sam-text-2">
                            {friend.name}
                          </span>
                          {friend.birthday ? (
                            <span className="block text-[11px] text-sam-text-3">
                              Birthday: {friend.birthday}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditingFriend(friend)}
                            className="rounded-md border border-sam-border bg-sam-surface px-2 py-1 text-xs text-sam-text-3 hover:bg-sam-surface-3 dark:hover:bg-slate-600"
                            aria-label={`Edit ${friend.name}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (editingFriendName === friend.name) {
                                cancelEditingFriend();
                              }
                              setFriendToDelete(friend.name);
                            }}
                            className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-400 dark:hover:bg-rose-900"
                            aria-label={`Remove ${friend.name}`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {friends.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-sam-border bg-sam-surface-2 px-3 py-5 text-center text-xs text-sam-text-3">
                    No friends yet. Add someone to start assigning participants.
                  </p>
                ) : null}
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsManageFriendsOpen(false)}
                  className="rounded-lg border border-sam-border bg-sam-surface px-3 py-2 text-sm text-sam-text-2"
                >
                  Close
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </DndContext>
    </CreateEventProvider>
  );
}
