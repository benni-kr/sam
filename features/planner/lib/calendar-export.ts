/**
 * Calendar export helpers for Google Calendar and Apple Calendar / iCal (RFC 5545).
 */

import {
  defaultPlannerSemesterId,
  getSemesterIdForDate,
} from "@/features/planner/lib/planner";

export type ExportDateTimes = {
  isAllDay: boolean;
  startDateString: string;     // YYYYMMDD
  endDateString: string;       // YYYYMMDD (exclusive for all-day)
  startDateTimeString?: string; // YYYYMMDDTHHmmss
  endDateTimeString?: string;   // YYYYMMDDTHHmmss
};

export type CalendarExportableEvent = {
  id?: string;
  title: string;
  category: string;
  description?: string;
  startDate: string | null;
  endDate: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

/**
 * Adds a number of days to a YYYY-MM-DD date key in UTC to prevent daylight saving shifts.
 */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Calculates start and end datetime representations for external calendar systems.
 * - For all-day events, the end date is rendered exclusive (endDate + 1 day) per RFC 5545 and Google Calendar specs.
 * - When only a start time is provided, defaults to a 1-hour duration.
 * - If 1-hour rollover crosses midnight (e.g. 23:30 -> 00:30), increments the end date by 1 day.
 */
export function calculateExportDateTimes(
  event: CalendarExportableEvent,
): ExportDateTimes {
  if (!event.startDate) {
    throw new Error("Cannot calculate export dates for an undated event.");
  }

  const rawEndDate = event.endDate || event.startDate;

  // Case 1: No time set -> All-Day Event
  if (!event.startTime) {
    const exclusiveEndDate = addDaysToDateKey(rawEndDate, 1);
    return {
      isAllDay: true,
      startDateString: event.startDate.replace(/-/g, ""),
      endDateString: exclusiveEndDate.replace(/-/g, ""),
    };
  }

  // Case 2: Timed Event
  const startClean = event.startTime.replace(":", "");
  const startDateStr = event.startDate.replace(/-/g, "");

  if (event.endTime) {
    const endClean = event.endTime.replace(":", "");
    const endDateStr = rawEndDate.replace(/-/g, "");
    return {
      isAllDay: false,
      startDateString: startDateStr,
      endDateString: endDateStr,
      startDateTimeString: `${startDateStr}T${startClean}00`,
      endDateTimeString: `${endDateStr}T${endClean}00`,
    };
  }

  // Case 3: Start Time Only -> Default to 1-hour duration
  const [startH, startM] = event.startTime.split(":").map(Number);
  const totalMinutes = startH * 60 + startM + 60; // + 1 hour

  if (totalMinutes < 24 * 60) {
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    const endClean = `${String(endH).padStart(2, "0")}${String(endM).padStart(2, "0")}`;
    const endDateStr = startDateStr;
    return {
      isAllDay: false,
      startDateString: startDateStr,
      endDateString: endDateStr,
      startDateTimeString: `${startDateStr}T${startClean}00`,
      endDateTimeString: `${endDateStr}T${endClean}00`,
    };
  }

  // Rolled over midnight
  const rolledMinutes = totalMinutes - 24 * 60;
  const endH = Math.floor(rolledMinutes / 60);
  const endM = rolledMinutes % 60;
  const endClean = `${String(endH).padStart(2, "0")}${String(endM).padStart(2, "0")}`;
  const rolledEndDate = addDaysToDateKey(event.startDate, 1);
  const endDateStr = rolledEndDate.replace(/-/g, "");

  return {
    isAllDay: false,
    startDateString: startDateStr,
    endDateString: endDateStr,
    startDateTimeString: `${startDateStr}T${startClean}00`,
    endDateTimeString: `${endDateStr}T${endClean}00`,
  };
}

/**
 * Builds the rich description for external calendars.
 * Note: Participants are omitted per user specifications.
 */
export function buildExportDescription(
  event: CalendarExportableEvent,
  originUrl?: string,
): string {
  const parts: string[] = [];

  parts.push(`🏷️ Category: ${event.category}`);

  if (event.description?.trim()) {
    parts.push(`\n📝 Notes:\n${event.description.trim()}`);
  }

  if (originUrl && event.id) {
    const cleanOrigin = originUrl.replace(/\/$/, "");
    const semesterId = event.startDate
      ? getSemesterIdForDate(event.startDate)
      : defaultPlannerSemesterId;
    parts.push(
      `\n🔗 View in SAM:\n${cleanOrigin}/?semester=${encodeURIComponent(semesterId)}&event=${encodeURIComponent(event.id)}`,
    );
  }

  return parts.join("\n");
}

/**
 * Generates a pre-filled Google Calendar URL.
 */
export function buildGoogleCalendarUrl(
  event: CalendarExportableEvent,
  originUrl?: string,
): string {
  if (!event.startDate) return "";

  const dateTimes = calculateExportDateTimes(event);
  const details = buildExportDescription(event, originUrl);

  const datesParam = dateTimes.isAllDay
    ? `${dateTimes.startDateString}/${dateTimes.endDateString}`
    : `${dateTimes.startDateTimeString}/${dateTimes.endDateTimeString}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: datesParam,
    details,
  });

  if (!dateTimes.isAllDay) {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) params.set("ctz", tz);
    } catch {
      // noop
    }
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Escapes characters for RFC 5545 iCalendar values.
 */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Folds lines longer than 75 octets per RFC 5545.
 */
export function foldLine(line: string): string {
  const maxLen = 75;
  if (line.length <= maxLen) return line;

  let result = "";
  let remaining = line;
  let isFirst = true;

  while (remaining.length > 0) {
    const limit = isFirst ? maxLen : maxLen - 1;
    if (remaining.length <= limit) {
      result += (isFirst ? "" : "\r\n ") + remaining;
      break;
    }
    result += (isFirst ? "" : "\r\n ") + remaining.slice(0, limit);
    remaining = remaining.slice(limit);
    isFirst = false;
  }

  return result;
}

/**
 * Generates standard RFC 5545 .ics content for an event.
 */
export function buildICalendarEvent(
  event: CalendarExportableEvent,
  originUrl?: string,
): string {
  if (!event.startDate) return "";

  const dateTimes = calculateExportDateTimes(event);
  const description = buildExportDescription(event, originUrl);
  const uid = `${event.id || "sam-event"}@sam.app`;
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SAM//Student Academic Manager//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
  ];

  if (dateTimes.isAllDay) {
    lines.push(`DTSTART;VALUE=DATE:${dateTimes.startDateString}`);
    lines.push(`DTEND;VALUE=DATE:${dateTimes.endDateString}`);
  } else {
    lines.push(`DTSTART:${dateTimes.startDateTimeString}`);
    lines.push(`DTEND:${dateTimes.endDateTimeString}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.map(foldLine).join("\r\n");
}

/**
 * Triggers a browser download of an .ics file.
 */
export function downloadIcsFile(filename: string, icsContent: string) {
  if (typeof window === "undefined") return;

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
