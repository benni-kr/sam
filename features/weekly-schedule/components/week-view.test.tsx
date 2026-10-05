/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { WeekView, mobileDaysCountStore } from "@/features/weekly-schedule/components/week-view";
import type { PlannerWeekEvent } from "@/features/weekly-schedule/lib/week-types";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const mockWeekEvents: PlannerWeekEvent[] = [
  {
    id: "event-1",
    title: "Monday Math",
    category: "University",
    day: "Mon",
    startTime: "09:00",
    endTime: "10:30",
    participants: ["Alice"],
  },
  {
    id: "event-2",
    title: "Saturday Sports",
    category: "Sports",
    day: "Sat",
    startTime: "11:00",
    endTime: "12:00",
    participants: ["Bob"],
  },
];

vi.mock("@/features/planner/state/planner-state", () => ({
  usePlannerState: () => ({
    weekEvents: mockWeekEvents,
    activeSemesterId: "spring-2026",
    findWeekEventById: (id: string) => {
      const event = mockWeekEvents.find((e) => e.id === id);
      return event ? { event, semesterId: "spring-2026" } : undefined;
    },
    updateWeekEvent: vi.fn(),
    deleteWeekEvent: vi.fn(),
  }),
}));

vi.mock("@/features/planner/state/filter-state", () => ({
  useFilterState: () => ({
    applyWeekFilters: (events: PlannerWeekEvent[]) => events,
  }),
}));

vi.mock("@/features/friends/state/friends-state", () => ({
  useFriendsState: () => ({
    friendNames: ["Alice", "Bob"],
  }),
}));

vi.mock("@/features/weekly-schedule/hooks/use-measured-height", () => ({
  useMeasuredHeight: () => ({
    ref: { current: null },
    height: 600,
  }),
}));

describe("WeekView mobile day controls", () => {
  let mediaQueryMatches = true;

  beforeEach(() => {
    localStorage.clear();
    mobileDaysCountStore._reset();
    mediaQueryMatches = true;

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("max-width: 767px") ? mediaQueryMatches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("renders mobile controls with 1d, 2d, 3d, All pills and pagination buttons", () => {
    render(<WeekView />);

    expect(screen.getByRole("button", { name: "Show 1 day" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show 2 days" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show 3 days" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show all days" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Previous days" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next days" })).toBeTruthy();
  });

  it("defaults to 3-day view on mobile and moves exactly 1 day per step for all combinations", () => {
    render(<WeekView />);

    // Available days with Saturday event: Mon, Tue, Wed, Thu, Fri, Sat (6 days)
    // Initially offset 0: Mon – Wed
    expect(screen.getByText("Mon – Wed")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Previous days" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Next days" }).hasAttribute("disabled")).toBe(false);

    // Click Next -> moves 1 day to Tue – Thu
    fireEvent.click(screen.getByRole("button", { name: "Next days" }));
    expect(screen.getByText("Tue – Thu")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Previous days" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Next days" }).hasAttribute("disabled")).toBe(false);

    // Click Next -> moves 1 day to Wed – Fri
    fireEvent.click(screen.getByRole("button", { name: "Next days" }));
    expect(screen.getByText("Wed – Fri")).toBeTruthy();

    // Click Next -> moves 1 day to Thu – Sat (offset 3, maxOffset reached)
    fireEvent.click(screen.getByRole("button", { name: "Next days" }));
    expect(screen.getByText("Thu – Sat")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next days" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Previous days" }).hasAttribute("disabled")).toBe(false);

    // Click Prev -> back to Wed – Fri
    fireEvent.click(screen.getByRole("button", { name: "Previous days" }));
    expect(screen.getByText("Wed – Fri")).toBeTruthy();
  });

  it("switches to 1-day view and steps day by day", () => {
    render(<WeekView />);

    fireEvent.click(screen.getByRole("button", { name: "Show 1 day" }));

    expect(screen.getByText("Monday")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Previous days" }).hasAttribute("disabled")).toBe(true);

    // Next day
    fireEvent.click(screen.getByRole("button", { name: "Next days" }));
    expect(screen.getByText("Tuesday")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Previous days" }).hasAttribute("disabled")).toBe(false);

    // Next day
    fireEvent.click(screen.getByRole("button", { name: "Next days" }));
    expect(screen.getByText("Wednesday")).toBeTruthy();
  });

  it("switches to 2-day view and steps day by day for all adjacent combinations", () => {
    render(<WeekView />);

    fireEvent.click(screen.getByRole("button", { name: "Show 2 days" }));

    expect(screen.getByText("Mon – Tue")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next days" }));
    expect(screen.getByText("Tue – Wed")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next days" }));
    expect(screen.getByText("Wed – Thu")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next days" }));
    expect(screen.getByText("Thu – Fri")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next days" }));
    expect(screen.getByText("Fri – Sat")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next days" }).hasAttribute("disabled")).toBe(true);
  });

  it("switches to All days view and disables left/right navigation", () => {
    render(<WeekView />);

    fireEvent.click(screen.getByRole("button", { name: "Show all days" }));

    expect(screen.getByText("Mon – Sat")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Previous days" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Next days" }).hasAttribute("disabled")).toBe(true);
  });

  it("handles touch swipe left and right to navigate by 1 day", () => {
    const { container } = render(<WeekView />);
    const section = container.querySelector("section");
    expect(section).toBeTruthy();

    expect(screen.getByText("Mon – Wed")).toBeTruthy();

    // Swipe left (next 1 day -> Tue – Thu)
    fireEvent.touchStart(section!, {
      touches: [{ clientX: 200, clientY: 100 }],
    });
    fireEvent.touchEnd(section!, {
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });

    expect(screen.getByText("Tue – Thu")).toBeTruthy();

    // Swipe right (previous 1 day -> Mon – Wed)
    fireEvent.touchStart(section!, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchEnd(section!, {
      changedTouches: [{ clientX: 200, clientY: 100 }],
    });

    expect(screen.getByText("Mon – Wed")).toBeTruthy();
  });
});
