"use client";

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
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { EventBadge } from "@/features/planner/components/event-badge";
import { PlannerEventForm } from "@/features/planner/components/event-form";
import { PlannerStateProvider } from "@/features/planner/state/planner-state";
import { usePlannerState } from "@/features/planner/state/planner-state";
import { PlannerTabs } from "@/features/planner/components/planner-tabs";
import { SidebarInbox } from "@/features/planner/components/sidebar-inbox";
import {
  defaultPlannerSemesterId,
  getPlannerSemester,
  plannerSemesters,
  type PlannerEventCategory,
  type PlannerEvent,
} from "@/features/planner/lib/planner";

type PlannerShellProps = {
  children: React.ReactNode;
};

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
 * Top-level planner shell with semester routing, drag-and-drop context, and sidebar.
 */
export function PlannerShell({ children }: PlannerShellProps) {
  const [semesterMenuOpen, setSemesterMenuOpen] = useState(false);
  const semesterMenuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const semesterId = searchParams.get("semester") ?? defaultPlannerSemesterId;
  const activeSemester = getPlannerSemester(semesterId);
  const hideFinished = searchParams.get("hideFinished") !== "0";
  const hideUndated = searchParams.get("hideUndated") === "1";
  const hideInactiveParticipants = searchParams.get("hideInactive") !== "0";

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
    <PlannerStateProvider activeSemesterId={semesterId}>
      <PlannerShellFrame
        pathname={pathname}
        semesterId={semesterId}
        activeSemester={activeSemester}
        semesterMenuOpen={semesterMenuOpen}
        semesterMenuRef={semesterMenuRef}
        setSemesterMenuOpen={setSemesterMenuOpen}
        buildSemesterHref={buildSemesterHref}
        hideFinished={hideFinished}
        hideUndated={hideUndated}
        hideInactiveParticipants={hideInactiveParticipants}
        setCrosstablesFilterParam={setCrosstablesFilterParam}
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
  hideFinished,
  hideUndated,
  hideInactiveParticipants,
  setCrosstablesFilterParam,
  children,
}: {
  pathname: string;
  semesterId: string;
  activeSemester: ReturnType<typeof getPlannerSemester>;
  semesterMenuOpen: boolean;
  semesterMenuRef: React.RefObject<HTMLDivElement | null>;
  setSemesterMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  buildSemesterHref: (nextSemesterId: string) => string;
  hideFinished: boolean;
  hideUndated: boolean;
  hideInactiveParticipants: boolean;
  setCrosstablesFilterParam: (
    key: "hideFinished" | "hideUndated" | "hideInactive",
    enabled: boolean,
  ) => void;
  children: React.ReactNode;
}) {
  const {
    events,
    moveEventToInbox,
    moveEventToDate,
    createEvent,
    friends,
    addFriend,
    renameFriend,
    removeFriend,
  } = usePlannerState();

  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PlannerEventCategory>("Exam");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [newFriendName, setNewFriendName] = useState("");
  const [editingFriendName, setEditingFriendName] = useState<string | null>(
    null,
  );
  const [editingFriendValue, setEditingFriendValue] = useState("");
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

    addFriend(newFriendName);
    setNewFriendName("");
  }

  function startEditingFriend(friendName: string) {
    setEditingFriendName(friendName);
    setEditingFriendValue(friendName);
  }

  function cancelEditingFriend() {
    setEditingFriendName(null);
    setEditingFriendValue("");
  }

  function saveEditedFriend() {
    if (!editingFriendName) {
      return;
    }

    renameFriend(editingFriendName, editingFriendValue);
    cancelEditingFriend();
  }

  return (
    <DndContext
      id="sam-planner-dnd"
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8f7f3,_#efede6_55%,_#e7e2d7)] text-slate-950">
        <div className="mx-auto grid min-h-screen w-full max-w-[1400px] gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6">
          <aside className="overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/80 p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
            <div className="min-w-0 flex flex-col gap-4 lg:h-full lg:overflow-y-auto">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Semester Activity Manager
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
                    Exam
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
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                + Add Event
              </button>

              <button
                type="button"
                onClick={() => setIsManageFriendsOpen(true)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Manage friends
              </button>

              {pathname === "/crosstables" ? (
                <>
                  <section className="rounded-[1.25rem] border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Table Filters
                    </p>
                    <div className="mt-3 space-y-2">
                      <SidebarToggle
                        label="Hide finished events"
                        checked={hideFinished}
                        onToggle={(checked) =>
                          setCrosstablesFilterParam("hideFinished", checked)
                        }
                      />

                      <SidebarToggle
                        label="Hide undated events"
                        checked={hideUndated}
                        onToggle={(checked) =>
                          setCrosstablesFilterParam("hideUndated", checked)
                        }
                      />

                      <SidebarToggle
                        label="Hide inactive participants"
                        checked={hideInactiveParticipants}
                        onToggle={(checked) =>
                          setCrosstablesFilterParam("hideInactive", checked)
                        }
                      />
                    </div>
                  </section>
                </>
              ) : null}

              {pathname === "/crosstables" ? null : <SidebarInbox />}
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <section
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <PlannerEventForm
              heading="Add event"
              submitLabel="Add event"
              title={title}
              category={category}
              startDate={startDate}
              endDate={endDate}
              participants={participants}
              availableParticipants={friends}
              onTitleChange={setTitle}
              onCategoryChange={(nextCategory: PlannerEventCategory) =>
                setCategory(nextCategory)
              }
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onParticipantsChange={setParticipants}
              onSubmit={handleCreateEvent}
              onCancel={() => setIsCreateModalOpen(false)}
            />
          </section>
        </div>
      ) : null}

      {isManageFriendsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"
          onClick={() => setIsManageFriendsOpen(false)}
        >
          <section
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Friends
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              Manage your friends
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Add, rename, or remove friends used in event participants.
            </p>

            <form onSubmit={handleAddFriend} className="mt-3 flex gap-2">
              <input
                value={newFriendName}
                onChange={(event) => setNewFriendName(event.target.value)}
                placeholder="Add friend"
                maxLength={15}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-slate-300 focus:ring"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Add
              </button>
            </form>

            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
              {friends.map((friend: string) => (
                <div
                  key={friend}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 p-2"
                >
                  {friendToDelete === friend ? (
                    <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-2">
                      <p className="text-xs font-medium text-red-800 text-center">
                        Remove {friend} from all events?
                        <br />
                        <span className="font-normal opacity-80 mt-1 block">
                          (Be careful, it&apos;s always easier to lose friends
                          than to make new ones!)
                        </span>
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFriendToDelete(null)}
                          className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                        >
                          Keep
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            removeFriend(friend);
                            setFriendToDelete(null);
                          }}
                          className="flex-1 rounded-md bg-red-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Yes, remove
                        </button>
                      </div>
                    </div>
                  ) : editingFriendName === friend ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editingFriendValue}
                        onChange={(event) =>
                          setEditingFriendValue(event.target.value)
                        }
                        maxLength={15}
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none ring-slate-300 focus:ring"
                        aria-label={`Edit ${friend}`}
                      />
                      <button
                        type="button"
                        onClick={saveEditedFriend}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditingFriend}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-slate-700">
                        {friend}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEditingFriend(friend)}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                          aria-label={`Edit ${friend}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (editingFriendName === friend) {
                              cancelEditingFriend();
                            }
                            setFriendToDelete(friend); // <-- Trigger the confirm state instead of deleting immediately
                          }}
                          className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600 hover:bg-rose-100"
                          aria-label={`Remove ${friend}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {friends.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-xs text-slate-500">
                  No friends yet. Add someone to start assigning participants.
                </p>
              ) : null}
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setIsManageFriendsOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </DndContext>
  );
}

function SidebarToggle({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs text-slate-700">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onToggle(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 ${
          checked
            ? "border-slate-900 bg-slate-900"
            : "border-slate-300 bg-slate-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
