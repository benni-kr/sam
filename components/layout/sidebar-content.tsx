"use client";

/**
 * Dynamic command center for the App Shell.
 *
 * This component switches its navigation, filters, and legends based on the
 * active Next.js route so each planner domain can keep its own sidebar controls
 * without leaking concerns into the shared layout.
 */

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Search, Users, SlidersHorizontal, Settings2, X } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";

import { PlannerTabs } from "@/features/planner/components/planner-tabs";
import { SidebarInbox } from "@/components/layout/sidebar-inbox";
import {
  defaultPlannerSemesterId,
  plannerEventCategories,
} from "@/features/planner/lib/planner";
import { plannerWeekEventCategories } from "@/features/weekly-schedule/lib/week-types";
import { getCalendarTheme } from "@/features/planner/lib/category-config";
import { getWeekTheme } from "@/features/weekly-schedule/lib/week-category-config";
import { useCreateEvent } from "@/features/planner/components/create-event-context";
import {
  useFilterState,
  type ActivePanel,
} from "@/features/planner/state/filter-state";
import { useFriendsState } from "@/features/friends/state/friends-state";

/**
 * Renders the route-aware sidebar controls for the active planner domain.
 */
export function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const semesterId = searchParams.get("semester") ?? defaultPlannerSemesterId;

  const { openCreateEvent, openCreateWeekEvent, openManageFriends } =
    useCreateEvent();

  const {
    hiddenCategories,
    hiddenWeekCategories,
    activePanel,
    toggleCategory,
    toggleWeekCategory,
    syncParticipantFiltersToFriends,
    clearDateTimeRange,
  } = useFilterState();

  const { friendNames, isHydrated: friendsHydrated } = useFriendsState();

  // Remove any participant filters for friends that no longer exist
  useEffect(() => {
    if (friendsHydrated) {
      syncParticipantFiltersToFriends(friendNames);
    }
  }, [friendsHydrated, friendNames, syncParticipantFiltersToFriends]);

  const isWeekView = pathname === "/week";

  const prevIsWeekView = useRef(isWeekView);
  useEffect(() => {
    if (prevIsWeekView.current !== isWeekView) {
      prevIsWeekView.current = isWeekView;
      clearDateTimeRange();
    }
  }, [isWeekView, clearDateTimeRange]);

  return (
    <>
      <div>
        <PlannerTabs activeSemesterId={semesterId} />
      </div>

      {isWeekView ? (
        <>
          <section className="rounded-[1.25rem] border border-sam-border bg-sam-surface p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sam-text-3">
              Weekly categories
            </p>
            <div className="mt-3 space-y-2">
              {plannerWeekEventCategories.map((category) => {
                const isHidden = hiddenWeekCategories.has(category);

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleWeekCategory(category)}
                    className={`flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-xs transition-all hover:bg-sam-surface-2 dark:hover:bg-sam-surface-3 ${
                      isHidden ? "opacity-40" : ""
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${getWeekTheme(category).accent}`}
                    />
                    <span className="flex-1 text-left text-sam-text-2">
                      {category}
                    </span>
                    {isHidden ? (
                      <EyeOff size={11} className="shrink-0 text-sam-text-4" />
                    ) : (
                      <Eye size={11} className="shrink-0 text-sam-text-3" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <button
            type="button"
            onClick={() => openManageFriends()}
            className="w-full rounded-lg border border-sam-border bg-sam-surface px-3 py-2 text-xs font-medium text-sam-text-2 transition-colors hover:bg-sam-surface-2 dark:hover:bg-sam-surface-2"
          >
            Manage friends
          </button>

          <button
            type="button"
            onClick={() => openCreateWeekEvent()}
            className="w-full rounded-lg border border-sam-border bg-sam-surface px-3 py-2 text-xs font-medium text-sam-text-2 transition-colors hover:bg-sam-surface-2 dark:hover:bg-sam-surface-2"
          >
            + Add weekly appointment
          </button>

          <FilterArea />
        </>
      ) : (
        <>
          <section className="rounded-[1.25rem] border border-sam-border bg-sam-surface p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sam-text-3">
              Categories
            </p>
            <div className="mt-3 space-y-2">
              {plannerEventCategories.map((category) => {
                const theme = getCalendarTheme(category);
                const isHidden = hiddenCategories.has(category);

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-xs transition-all hover:bg-sam-surface-2 dark:hover:bg-sam-surface-3 ${
                      isHidden ? "opacity-40" : ""
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${theme.accent}`}
                    />
                    <span className="flex-1 text-left text-sam-text-2">
                      {category}
                    </span>
                    {isHidden ? (
                      <EyeOff size={11} className="shrink-0 text-sam-text-4" />
                    ) : (
                      <Eye size={11} className="shrink-0 text-sam-text-3" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <button
            type="button"
            onClick={() => openManageFriends()}
            className="w-full rounded-lg border border-sam-border bg-sam-surface px-3 py-2 text-xs font-medium text-sam-text-2 transition-colors hover:bg-sam-surface-2 dark:hover:bg-sam-surface-2"
          >
            Manage friends
          </button>

          <button
            type="button"
            onClick={() => openCreateEvent()}
            className="w-full rounded-lg border border-sam-border bg-sam-surface px-3 py-2 text-xs font-medium text-sam-text-2 transition-colors hover:bg-sam-surface-2 dark:hover:bg-sam-surface-2"
          >
            + Add Event
          </button>

          <FilterArea />
        </>
      )}

      {pathname === "/crosstables" || pathname === "/week" ? null : (
        <SidebarInbox />
      )}
    </>
  );
}

function FilterButtons() {
  const {
    activePanel,
    setActivePanel,
    searchText,
    requiredParticipants,
    filterStartDate,
    filterEndDate,
    filterStartTime,
    filterEndTime,
  } = useFilterState();
  const pathname = usePathname();

  const hasViewFilters = pathname === "/crosstables" || pathname === "/list";

  function toggle(panel: NonNullable<ActivePanel>) {
    setActivePanel(activePanel === panel ? null : panel);
  }

  return (
    <div className="flex w-full items-center justify-between">
      <PanelButton
        icon={<Search size={16} />}
        label="Search events"
        isActive={activePanel === "search"}
        hasFilter={searchText.trim().length > 0}
        onClick={() => toggle("search")}
      />
      <PanelButton
        icon={<Users size={16} />}
        label="Filter by participants"
        isActive={activePanel === "participants"}
        hasFilter={requiredParticipants.length > 0}
        onClick={() => toggle("participants")}
      />
      <PanelButton
        icon={<SlidersHorizontal size={16} />}
        label="Filter by date range"
        isActive={activePanel === "daterange"}
        hasFilter={filterStartDate.length > 0 || filterEndDate.length > 0 || filterStartTime.length > 0 || filterEndTime.length > 0}
        onClick={() => toggle("daterange")}
      />
      <PanelButton
        icon={<Settings2 size={16} />}
        label="View options"
        isActive={activePanel === "viewfilters"}
        hasFilter={false}
        disabled={!hasViewFilters}
        onClick={() => toggle("viewfilters")}
      />
    </div>
  );
}


function PanelButton({
  icon,
  label,
  isActive,
  hasFilter,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  hasFilter: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      disabled={disabled}
      className={`relative flex items-center justify-center rounded-full border px-4 py-2 transition-colors ${
        disabled
          ? "cursor-not-allowed border-sam-border bg-sam-surface text-sam-text-4 opacity-30 dark:bg-sam-surface-2"
          : isActive
            ? "border-sam-solid bg-sam-solid text-sam-solid-fg shadow-sm"
            : "border-sam-border bg-sam-surface text-sam-text-3 hover:border-sam-border-2 hover:text-sam-text-1 dark:bg-sam-surface-2 dark:hover:border-slate-500 dark:hover:text-slate-200"
      }`}
    >
      {icon}
      {!disabled && !isActive && hasFilter && (
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400" />
      )}
    </button>
  );
}

function FilterArea() {
  const { activePanel, isFiltering, clearAllFilters } = useFilterState();

  return (
    <div className="rounded-[1.25rem] border border-sam-border bg-sam-surface p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sam-text-3">
          Filters
        </span>
        <button
          type="button"
          onClick={clearAllFilters}
          disabled={!isFiltering}
          className="flex items-center gap-1 rounded-full border border-sam-border px-2 py-0.5 text-[10px] text-sam-text-3 transition-colors enabled:hover:border-sam-border-2 enabled:hover:text-sam-text-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={9} />
          Clear
        </button>
      </div>
      <FilterButtons />
      {activePanel !== null && (
        <div className="mt-3 border-t border-sam-border pt-3">
          {activePanel === "search" && <SearchPanelContent />}
          {activePanel === "participants" && <ParticipantsPanelContent />}
          {activePanel === "daterange" && <DateRangePanelContent />}
          {activePanel === "viewfilters" && <ViewFiltersPanelContent />}
        </div>
      )}
    </div>
  );
}

function SearchPanelContent() {
  const { searchText, setSearchText } = useFilterState();

  return (
    <div className="flex items-center gap-2 rounded-lg border border-sam-border bg-sam-surface-2 px-2.5 py-1.5">
      <input
        type="search"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder="Search events…"
        autoFocus
        className="flex-1 bg-transparent text-xs text-sam-text-1 placeholder:text-sam-text-4 focus:outline-none"
      />
      {searchText && (
        <button
          type="button"
          onClick={() => setSearchText("")}
          aria-label="Clear search"
          className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-sam-border bg-sam-surface text-sam-text-4 transition-colors hover:text-sam-text-2"
        >
          <X size={8} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

function ParticipantsPanelContent() {
  const { friendNames } = useFriendsState();
  const { requiredParticipants, toggleParticipantFilter } = useFilterState();

  if (friendNames.length === 0) {
    return (
      <p className="text-xs text-sam-text-4">
        No friends added yet. Use &ldquo;Manage friends&rdquo; to add some.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {friendNames.map((friend) => {
        const isSelected = requiredParticipants.some(
          (p) => p.toLowerCase() === friend.toLowerCase(),
        );
        return (
          <button
            key={friend}
            type="button"
            onClick={() => toggleParticipantFilter(friend)}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
              isSelected
                ? "border-sam-solid bg-sam-solid text-sam-solid-fg"
                : "border-sam-border bg-sam-surface-2 text-sam-text-3 hover:border-sam-border-2 hover:text-sam-text-1 dark:bg-sam-surface-3"
            }`}
          >
            {friend}
          </button>
        );
      })}
    </div>
  );
}

function DateRangePanelContent() {
  const pathname = usePathname();

  return pathname === "/week" ? (
    <TimeRangePanelContent />
  ) : (
    <DatePickerPanelContent />
  );
}

function DatePickerPanelContent() {
  const { filterStartDate, filterEndDate, setFilterStartDate, setFilterEndDate } =
    useFilterState();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="w-10 shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-sam-text-3">
          From
        </label>
        <DatePicker
          value={filterStartDate}
          onChange={setFilterStartDate}
          placeholder="Start date"
          clearLabel="Clear start date"
          clearable
          ariaLabel="Filter start date"
          className="flex-1"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="w-10 shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-sam-text-3">
          To
        </label>
        <DatePicker
          value={filterEndDate}
          onChange={setFilterEndDate}
          placeholder="End date"
          clearLabel="Clear end date"
          clearable
          ariaLabel="Filter end date"
          className="flex-1"
        />
      </div>
    </div>
  );
}

function TimeRangePanelContent() {
  const { filterStartTime, filterEndTime, setFilterStartTime, setFilterEndTime } =
    useFilterState();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="w-10 shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-sam-text-3">
          From
        </label>
        <div className="flex-1">
          <TimePicker
            value={filterStartTime}
            onChange={setFilterStartTime}
            placeholder="Start time"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="w-10 shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-sam-text-3">
          To
        </label>
        <div className="flex-1">
          <TimePicker
            value={filterEndTime}
            onChange={setFilterEndTime}
            placeholder="End time"
          />
        </div>
      </div>
    </div>
  );
}

function ViewFiltersPanelContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const hideFinished = searchParams.get("hideFinished") !== "0";
  const hideUndated = searchParams.get("hideUndated") === "1";
  const hideInactiveParticipants = searchParams.get("hideInactive") !== "0";

  function setViewFilterParam(
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
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="space-y-2">
      <ViewFilterToggle
        label="Hide finished events"
        checked={hideFinished}
        onChange={(v) => setViewFilterParam("hideFinished", v)}
      />
      {pathname === "/crosstables" && (
        <>
          <ViewFilterToggle
            label="Hide undated events"
            checked={hideUndated}
            onChange={(v) => setViewFilterParam("hideUndated", v)}
          />
          <ViewFilterToggle
            label="Hide inactive participants"
            checked={hideInactiveParticipants}
            onChange={(v) => setViewFilterParam("hideInactive", v)}
          />
        </>
      )}
    </div>
  );
}

function ViewFilterToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs text-sam-text-2">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 ${
          checked
            ? "border-slate-900 bg-slate-900 dark:border-slate-400 dark:bg-slate-400"
            : "border-sam-border-2 bg-slate-200 dark:bg-sam-surface-3"
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
