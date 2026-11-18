"use client";

/**
 * Primary feature-level component for the Chronological Calendar domain.
 *
 * It coordinates rendering the semester's six-month grid by mapping the
 * state-provided months to individual `MonthCard` units.
 */

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { MonthCard } from "@/features/planner/components/month-card";
import { usePlannerState } from "@/features/planner/state/planner-state";
import { formatDateKey } from "@/features/planner/lib/planner-utils";

/**
 * Renders the semester calendar as a vertical stack of month cards.
 *
 * This view relies on `PlannerStateProvider` for the active semester's data,
 * keeping the grid in sync when the user switches semesters in the App Shell.
 * Auto-scrolls to the deep-linked event or current week/month on mount.
 */
export function CalendarView() {
  const { months, allEvents } = usePlannerState();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handledScrollKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const eventId = searchParams.get("event");
    const semesterKey = searchParams.get("semester") ?? "default";
    const scrollKey = `${semesterKey}|${eventId ?? ""}`;

    // Never hijack the user's scroll position after initial mount / deep-link scroll
    // when events are created, edited, dragged, or deleted.
    if (handledScrollKeyRef.current === scrollKey) {
      return;
    }

    if (eventId) {
      const event = allEvents.find((e) => e.id === eventId);
      if (!event) {
        // Wait for events to hydrate before resolving the deep-linked event.
        return;
      }

      if (!event.startDate) {
        handledScrollKeyRef.current = scrollKey;
        return;
      }

      const scrollToDayOrMonth = () => {
        const dayElement = document.querySelector(
          `[data-date-key="${event.startDate}"]`,
        );
        if (dayElement) {
          dayElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          handledScrollKeyRef.current = scrollKey;
          return true;
        }

        const parts = event.startDate?.split("-");
        if (parts && parts.length === 3) {
          const targetYear = parseInt(parts[0], 10);
          const targetMonthIndex = parseInt(parts[1], 10) - 1;
          const monthElement = document.querySelector(
            `[data-month-year="${targetYear}"][data-month-index="${targetMonthIndex}"]`,
          );
          if (monthElement) {
            monthElement.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
            handledScrollKeyRef.current = scrollKey;
            return true;
          }
        }
        return false;
      };

      if (!scrollToDayOrMonth()) {
        const timer = setTimeout(() => {
          scrollToDayOrMonth();
          handledScrollKeyRef.current = scrollKey;
        }, 120);
        return () => clearTimeout(timer);
      }
      return;
    }

    const scrollToCurrentWeekOrMonth = () => {
      const now = new Date();
      const todayKey = formatDateKey(now);
      const todayElement = document.querySelector(
        `[data-date-key="${todayKey}"]`,
      );

      if (todayElement) {
        const weekRow = todayElement.closest("[data-week-row]") ?? todayElement;
        weekRow.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return true;
      }

      const currentYear = now.getFullYear();
      const currentMonthIndex = now.getMonth();
      const currentMonthElement = document.querySelector(
        `[data-month-year="${currentYear}"][data-month-index="${currentMonthIndex}"]`,
      );

      if (currentMonthElement) {
        currentMonthElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return true;
      }

      return false;
    };

    if (scrollToCurrentWeekOrMonth()) {
      handledScrollKeyRef.current = scrollKey;
    } else {
      const timer = setTimeout(() => {
        scrollToCurrentWeekOrMonth();
        handledScrollKeyRef.current = scrollKey;
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [allEvents, searchParams]);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div ref={containerRef} className="flex flex-col gap-4">
        {months.map((month) => (
          <MonthCard key={`${month.year}-${month.monthIndex}`} month={month} />
        ))}
      </div>
    </section>
  );
}
