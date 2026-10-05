/**
 * GET /api/calendar/feed — Generates an RFC 5545 iCalendar (.ics) subscription feed.
 *
 * External calendar applications (Apple Calendar, Google Calendar, Outlook) periodically
 * poll this endpoint to synchronize the user's SAM events into their native calendar apps.
 */

import { normalizePlannerScope } from "@/features/planner/lib/planner-scope";
import { verifyFeedToken } from "@/features/planner/lib/calendar-feed-token";
import {
  buildICalendarFeed,
  type CalendarExportableEvent,
} from "@/features/planner/lib/calendar-export";

export const runtime = "nodejs";

type SupabaseEventFetchRow = {
  event_id: string;
  title: string;
  description: string | null;
  category: string;
  start_date: string | null;
  end_date: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

function readServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const defaultScope = normalizePlannerScope(process.env.NEXT_PUBLIC_SAM_PLANNER_SCOPE);

  return {
    url,
    anonKey,
    serviceRoleKey,
    defaultScope,
  };
}

async function fetchScopeEvents(
  config: ReturnType<typeof readServerConfig>,
  scope: string,
): Promise<CalendarExportableEvent[]> {
  if (!config.url || (!config.serviceRoleKey && !config.anonKey)) {
    return [];
  }

  const apiKey = config.serviceRoleKey || config.anonKey!;
  const endpoint = `${config.url}/rest/v1/planner_events?select=event_id,title,description,category,start_date,end_date,start_time,end_time&planner_scope=eq.${encodeURIComponent(scope)}`;

  const response = await fetch(endpoint, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch planner events: ${response.status}`);
  }

  const rows = (await response.json()) as SupabaseEventFetchRow[];

  return rows.map((row) => ({
    id: row.event_id,
    title: row.title,
    description: row.description || undefined,
    category: row.category,
    startDate: row.start_date,
    endDate: row.end_date,
    startTime: row.start_time || undefined,
    endTime: row.end_time || undefined,
  }));
}

export async function GET(request: Request) {
  const config = readServerConfig();
  const url = new URL(request.url);

  const token = url.searchParams.get("token");
  const requestedScope = url.searchParams.get("scope");
  const scope = normalizePlannerScope(requestedScope || config.defaultScope);
  const timeZone = url.searchParams.get("tz") || "Europe/Berlin";

  const rawCategories = url.searchParams.get("categories");
  const categories = rawCategories
    ? rawCategories.split(",").map((c) => c.trim()).filter(Boolean)
    : undefined;

  // Validate the secret HMAC token to prevent unauthorized access
  const isValid = verifyFeedToken(token, scope);
  if (!isValid) {
    return new Response("Unauthorized: Invalid or missing calendar feed token.", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    const origin = `${url.protocol}//${url.host}`;
    const events = await fetchScopeEvents(config, scope);

    const icsContent = buildICalendarFeed(events, {
      calendarName: "SAM Planner",
      timeZone,
      originUrl: origin,
      categories,
    });

    return new Response(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="sam-planner.ics"',
        // Cache for 15 minutes, allow stale for up to 30 minutes while revalidating
        "Cache-Control": "public, max-age=900, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    console.error("[SAM Calendar Feed] Error generating feed:", error);
    return new Response("Internal Server Error generating calendar feed.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
