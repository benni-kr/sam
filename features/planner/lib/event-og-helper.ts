/**
 * Server-side helpers for Open Graph (OG) metadata and link preview generation.
 *
 * Used by dynamic route metadata (`generateMetadata`) to query event details
 * and build compact Open Graph metadata and square image URLs for chat previews.
 */

import { headers } from "next/headers";
import { normalizePlannerScope } from "@/features/planner/lib/planner-scope";

export type OgEventData = {
  id: string;
  title: string;
  category: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  day?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  participants?: string[];
};

const fullWeekdayNames: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}.${month}.${year}`;
  }
  return dateStr;
}

function readServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const defaultScope = normalizePlannerScope(
    process.env.NEXT_PUBLIC_SAM_PLANNER_SCOPE,
  );

  return {
    url,
    apiKey: serviceRoleKey || anonKey,
    defaultScope,
  };
}

/**
 * Fetches an event by ID from Supabase for Open Graph preview generation.
 * Checks calendar events first, then weekly schedule appointments.
 */
export async function fetchEventForOg(
  eventId: string,
): Promise<OgEventData | null> {
  const { url, apiKey } = readServerConfig();

  if (!url || !apiKey || !eventId) {
    return null;
  }

  const headers = {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
  };

  try {
    // 1. Try calendar events
    const calendarEndpoint = `${url}/rest/v1/planner_events?select=event_id,title,description,category,start_date,end_date,start_time,end_time,participants&event_id=eq.${encodeURIComponent(eventId)}&limit=1`;
    const calRes = await fetch(calendarEndpoint, {
      headers,
      cache: "no-store",
    });

    if (calRes.ok) {
      const calRows = (await calRes.json()) as Array<{
        event_id: string;
        title: string;
        description: string | null;
        category: string;
        start_date: string | null;
        end_date: string | null;
        start_time?: string | null;
        end_time?: string | null;
        participants?: unknown;
      }>;

      if (calRows.length > 0 && calRows[0]) {
        const row = calRows[0];
        const participants = Array.isArray(row.participants)
          ? row.participants.filter((p): p is string => typeof p === "string")
          : [];

        return {
          id: row.event_id,
          title: row.title,
          category: row.category,
          description: row.description,
          startDate: row.start_date,
          endDate: row.end_date,
          startTime: row.start_time,
          endTime: row.end_time,
          participants,
        };
      }
    }

    // 2. Try weekly schedule appointments
    const weekEndpoint = `${url}/rest/v1/planner_week_events?select=event_id,title,description,category,day,start_time,end_time,participants&event_id=eq.${encodeURIComponent(eventId)}&limit=1`;
    const weekRes = await fetch(weekEndpoint, {
      headers,
      cache: "no-store",
    });

    if (weekRes.ok) {
      const weekRows = (await weekRes.json()) as Array<{
        event_id: string;
        title: string;
        description: string | null;
        category: string;
        day: string;
        start_time?: string | null;
        end_time?: string | null;
        participants?: unknown;
      }>;

      if (weekRows.length > 0 && weekRows[0]) {
        const row = weekRows[0];
        const participants = Array.isArray(row.participants)
          ? row.participants.filter((p): p is string => typeof p === "string")
          : [];

        return {
          id: row.event_id,
          title: row.title,
          category: row.category,
          description: row.description,
          day: row.day,
          startTime: row.start_time,
          endTime: row.end_time,
          participants,
        };
      }
    }

    return null;
  } catch (err) {
    console.error("[OG helper] Failed to fetch event for OG metadata:", err);
    return null;
  }
}

/**
 * Builds the compact description snippet displayed to the right of the thumbnail.
 * Example: "15.11.2026 · 14:00 – 16:30 · Sports · 4 friends"
 */
export function formatOgDescription(event: OgEventData): string {
  const parts: string[] = [];

  if (event.day) {
    const dayLabel = fullWeekdayNames[event.day] || event.day;
    const time = event.startTime
      ? event.endTime
        ? `${event.startTime} – ${event.endTime}`
        : event.startTime
      : "";
    parts.push(`Every ${dayLabel}${time ? ` · ${time}` : ""}`);
  } else if (event.startDate) {
    const dateFormatted = formatDisplayDate(event.startDate);
    const dateStr =
      event.endDate && event.endDate !== event.startDate
        ? `${dateFormatted} – ${formatDisplayDate(event.endDate)}`
        : dateFormatted;
    const time = event.startTime
      ? event.endTime
        ? `${event.startTime} – ${event.endTime}`
        : event.startTime
      : "";
    parts.push(`${dateStr}${time ? ` · ${time}` : ""}`);
  }

  if (event.category) {
    parts.push(event.category);
  }

  return parts.join(" · ");
}

/**
 * Canonical 1:1 square icon image path for Open Graph chat previews.
 * Uses the compact SAM app logo on dark plate generated by generate-icons.mjs.
 * Sized at 200×200 (<300px) so WhatsApp renders the small ~2cm horizontal card
 * with the square thumbnail on the left, rather than the full-width giant banner.
 */
export const OG_IMAGE_PATH = "/icons/og-thumb.png";
export const OG_IMAGE_WIDTH = 200;
export const OG_IMAGE_HEIGHT = 200;

/**
 * Dynamically resolves the base URL of the incoming request.
 *
 * Supports Cloudflare tunnels, ngrok, reverse proxies, and custom domains
 * by reading the request headers (x-forwarded-host, host, x-forwarded-proto).
 * Falls back to NEXT_PUBLIC_APP_URL, VERCEL_URL, or http://localhost:3000.
 */
export async function getRequestOrigin(): Promise<string> {
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");

  try {
    const headersList = await headers();
    const forwardedHost = headersList.get("x-forwarded-host");
    const host = forwardedHost || headersList.get("host");

    if (host) {
      const isLocal =
        host.startsWith("localhost") ||
        host.startsWith("127.0.0.1") ||
        host.startsWith("0.0.0.0");

      // If accessed via localhost but an explicit production APP_URL is configured, use it
      if (isLocal && envAppUrl) {
        return envAppUrl;
      }

      const forwardedProto = headersList.get("x-forwarded-proto");
      const proto = forwardedProto || (isLocal ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // Outside request context (e.g. during build or tests)
  }

  if (envAppUrl) {
    return envAppUrl;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}
