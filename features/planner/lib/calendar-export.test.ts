import { describe, expect, it } from "vitest";
import {
  calculateExportDateTimes,
  buildExportDescription,
  buildGoogleCalendarUrl,
  buildICalendarEvent,
  buildICalendarFeed,
  addDaysToDateKey,
} from "./calendar-export";

describe("calendar-export utilities", () => {
  describe("addDaysToDateKey", () => {
    it("correctly advances dates without timezone drift", () => {
      expect(addDaysToDateKey("2026-05-15", 1)).toBe("2026-05-16");
      expect(addDaysToDateKey("2026-05-31", 1)).toBe("2026-06-01");
      expect(addDaysToDateKey("2026-12-31", 1)).toBe("2027-01-01");
      expect(addDaysToDateKey("2026-02-28", 1)).toBe("2026-03-01");
    });
  });

  describe("calculateExportDateTimes", () => {
    it("handles single-day all-day event with exclusive end date (+1 day)", () => {
      const result = calculateExportDateTimes({
        title: "Conference",
        category: "Other",
        startDate: "2026-05-15",
        endDate: "2026-05-15",
      });

      expect(result.isAllDay).toBe(true);
      expect(result.startDateString).toBe("20260515");
      expect(result.endDateString).toBe("20260516"); // RFC 5545 exclusive end date
      expect(result.startDateTimeString).toBeUndefined();
    });

    it("handles multi-day all-day event with exclusive end date (+1 day)", () => {
      const result = calculateExportDateTimes({
        title: "Hackathon",
        category: "Other",
        startDate: "2026-05-15",
        endDate: "2026-05-17",
      });

      expect(result.isAllDay).toBe(true);
      expect(result.startDateString).toBe("20260515");
      expect(result.endDateString).toBe("20260518");
    });

    it("handles timed event with both start and end time", () => {
      const result = calculateExportDateTimes({
        title: "Math Exam",
        category: "Exam",
        startDate: "2026-06-10",
        endDate: "2026-06-10",
        startTime: "14:00",
        endTime: "16:30",
      });

      expect(result.isAllDay).toBe(false);
      expect(result.startDateTimeString).toBe("20260610T140000");
      expect(result.endDateTimeString).toBe("20260610T163000");
    });

    it("defaults to 1-hour duration when only start time is provided", () => {
      const result = calculateExportDateTimes({
        title: "Office Hours",
        category: "Course",
        startDate: "2026-06-10",
        endDate: "2026-06-10",
        startTime: "10:15",
        endTime: null,
      });

      expect(result.isAllDay).toBe(false);
      expect(result.startDateTimeString).toBe("20260610T101500");
      expect(result.endDateTimeString).toBe("20260610T111500");
    });

    it("correctly rolls over to next day when start-only time crosses midnight", () => {
      const result = calculateExportDateTimes({
        title: "Night Study",
        category: "Other",
        startDate: "2026-06-10",
        endDate: "2026-06-10",
        startTime: "23:30",
        endTime: null,
      });

      expect(result.isAllDay).toBe(false);
      expect(result.startDateTimeString).toBe("20260610T233000");
      expect(result.endDateTimeString).toBe("20260611T003000");
    });
  });

  describe("buildExportDescription", () => {
    it("builds structured description and omits participants", () => {
      const description = buildExportDescription(
        {
          id: "evt-999",
          title: "Physics Lab",
          category: "Course",
          description: "Room 402. Bring safety goggles.",
          startDate: "2026-05-10",
          endDate: "2026-05-10",
        },
        "https://sam.local:3000",
      );

      expect(description).toContain("🏷️ Category: Course");
      expect(description).toContain("📝 Notes:\nRoom 402. Bring safety goggles.");
      expect(description).toContain(
        "🔗 View in SAM:\nhttps://sam.local:3000/?semester=spring-2026&event=evt-999",
      );
      // Explicitly ensure participants are not included
      expect(description).not.toContain("Participants");
      expect(description).not.toContain("👥");
    });
  });

  describe("buildGoogleCalendarUrl", () => {
    it("generates correct URL for all-day event", () => {
      const url = buildGoogleCalendarUrl(
        {
          id: "evt-gcal",
          title: "Project Milestone",
          category: "Assignment",
          startDate: "2026-05-20",
          endDate: "2026-05-20",
        },
        "http://localhost:3000",
      );

      expect(url).toContain("calendar.google.com/calendar/render");
      expect(url).toContain("action=TEMPLATE");
      expect(url).toContain("text=Project+Milestone");
      expect(url).toContain("dates=20260520%2F20260521"); // Exclusive end date
    });

    it("generates correct URL for timed event", () => {
      const url = buildGoogleCalendarUrl(
        {
          id: "evt-gcal-timed",
          title: "Dentist",
          category: "Personal",
          startDate: "2026-05-20",
          endDate: "2026-05-20",
          startTime: "09:00",
          endTime: "10:00",
        },
        "http://localhost:3000",
      );

      expect(url).toContain("dates=20260520T090000%2F20260520T100000");
    });
  });

  describe("buildICalendarEvent", () => {
    it("produces RFC 5545 valid .ics output", () => {
      const ics = buildICalendarEvent(
        {
          id: "evt-ics-1",
          title: "Math Oral Exam",
          category: "Exam",
          description: "Room 101, bring ID",
          startDate: "2026-07-01",
          endDate: "2026-07-01",
          startTime: "13:30",
          endTime: "14:15",
        },
        "https://sam.app",
      );

      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("VERSION:2.0");
      expect(ics).toContain("BEGIN:VEVENT");
      expect(ics).toContain("UID:evt-ics-1@sam.app");
      expect(ics).toContain("SUMMARY:Math Oral Exam");
      expect(ics).toContain("DTSTART:20260701T133000");
      expect(ics).toContain("DTEND:20260701T141500");
      expect(ics).toContain("END:VEVENT");
      expect(ics).toContain("END:VCALENDAR");
    });
  });

  describe("buildICalendarFeed", () => {
    it("produces a valid multi-event feed with VTIMEZONE and filters", () => {
      const events = [
        {
          id: "evt-1",
          title: "Team Meeting",
          category: "Group Event",
          description: "Discuss architecture",
          startDate: "2026-10-10",
          endDate: "2026-10-10",
          startTime: "14:00",
          endTime: "15:30",
        },
        {
          id: "evt-2",
          title: "Final Exam",
          category: "Exam",
          startDate: "2026-10-15",
          endDate: "2026-10-15",
        },
        {
          id: "evt-3",
          title: "Personal Gym",
          category: "Private Event",
          startDate: "2026-10-12",
          endDate: "2026-10-12",
        },
        {
          id: "evt-inbox",
          title: "Unscheduled Idea",
          category: "Other",
          startDate: null,
          endDate: null,
        },
      ];

      const feed = buildICalendarFeed(events, {
        calendarName: "SAM Subscription",
        timeZone: "Europe/Berlin",
        originUrl: "https://sam.app",
        categories: ["Group Event", "Exam"],
      });

      expect(feed).toContain("BEGIN:VCALENDAR");
      expect(feed).toContain("X-WR-CALNAME:SAM Subscription");
      expect(feed).toContain("BEGIN:VTIMEZONE");
      expect(feed).toContain("TZID:Europe/Berlin");

      // Should include Group Event and Exam
      expect(feed).toContain("SUMMARY:Team Meeting");
      expect(feed).toContain("CATEGORIES:Group Event");
      expect(feed).toContain("DTSTART;TZID=Europe/Berlin:20261010T140000");
      expect(feed).toContain("DTEND;TZID=Europe/Berlin:20261010T153000");

      expect(feed).toContain("SUMMARY:Final Exam");
      expect(feed).toContain("DTSTART;VALUE=DATE:20261015");
      expect(feed).toContain("DTEND;VALUE=DATE:20261016"); // exclusive end date

      // Should filter out Private Event and undated inbox item
      expect(feed).not.toContain("SUMMARY:Personal Gym");
      expect(feed).not.toContain("SUMMARY:Unscheduled Idea");

      expect(feed).toContain("END:VCALENDAR");
    });
  });
});
