/**
 * @vitest-environment jsdom
 */
import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { CalendarView } from "@/features/planner/components/calendar-view";
import type { PlannerEvent, PlannerMonth } from "@/features/planner/lib/planner";

let mockSearchParams = new URLSearchParams();
let mockAllEvents: PlannerEvent[] = [];
const mockMonths: PlannerMonth[] = [
  {
    label: "November 2026",
    year: 2026,
    monthIndex: 10,
  },
];

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/features/planner/state/planner-state", () => ({
  usePlannerState: () => ({
    months: mockMonths,
    allEvents: mockAllEvents,
  }),
}));

vi.mock("@/features/planner/components/month-card", () => ({
  MonthCard: ({ month }: { month: PlannerMonth }) => (
    <div
      data-month-year={month.year}
      data-month-index={month.monthIndex}
      data-week-row="true"
    >
      <div data-date-key="2026-11-18" />
      <div data-date-key="2026-12-20" />
    </div>
  ),
}));

describe("CalendarView auto-scroll", () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-18T10:00:00Z"));
    mockSearchParams = new URLSearchParams();
    mockAllEvents = [];
    scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock as unknown as typeof Element.prototype.scrollIntoView;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("scrolls to current week once on mount and does not jump back when events change", () => {
    const { rerender } = render(<CalendarView />);
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);

    scrollIntoViewMock.mockClear();

    // Simulate adding or editing events in allEvents
    mockAllEvents = [
      {
        id: "evt-1",
        title: "December Trip",
        category: "Group Event",
        startDate: "2026-12-20",
        endDate: "2026-12-20",
        participants: [],
      },
    ];
    rerender(<CalendarView />);

    mockAllEvents = [
      {
        ...mockAllEvents[0],
        title: "Updated Trip",
        participants: ["Alice"],
      },
    ];
    rerender(<CalendarView />);

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it("waits for a deep-linked event to hydrate and does not re-scroll on later edits", () => {
    mockSearchParams = new URLSearchParams("semester=fall-2026&event=evt-target");
    mockAllEvents = [];

    const { rerender } = render(<CalendarView />);
    // Not loaded yet -> should NOT fall through and jump to today's week
    expect(scrollIntoViewMock).not.toHaveBeenCalled();

    // Event finishes loading -> scrolls once to the target event
    mockAllEvents = [
      {
        id: "evt-target",
        title: "Target Event",
        category: "Group Event",
        startDate: "2026-12-20",
        endDate: "2026-12-20",
        participants: [],
      },
    ];
    rerender(<CalendarView />);
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);

    scrollIntoViewMock.mockClear();

    // Later edit to any event does NOT re-trigger scroll
    mockAllEvents = [
      {
        ...mockAllEvents[0],
        participants: ["Bob"],
      },
    ];
    rerender(<CalendarView />);
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });
});
