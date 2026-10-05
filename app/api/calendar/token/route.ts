/**
 * GET /api/calendar/token — Returns the authenticated user's secure calendar feed subscription URLs.
 */

import { NextResponse } from "next/server";
import { normalizePlannerScope } from "@/features/planner/lib/planner-scope";
import { generateFeedToken } from "@/features/planner/lib/calendar-feed-token";

export const runtime = "nodejs";

function readServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const defaultScope = normalizePlannerScope(process.env.NEXT_PUBLIC_SAM_PLANNER_SCOPE);

  return {
    url,
    anonKey,
    defaultScope,
  };
}

async function verifyAuth(authHeader: string | null, config: ReturnType<typeof readServerConfig>) {
  if (!config.url || !config.anonKey) {
    // Local dev without Supabase auth configured
    return true;
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");

  try {
    const response = await fetch(`${config.url}/auth/v1/user`, {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const config = readServerConfig();
  const authHeader = request.headers.get("authorization");

  const authorized = await verifyAuth(authHeader, config);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedScope = url.searchParams.get("scope");
  const scope = normalizePlannerScope(requestedScope || config.defaultScope);
  const token = generateFeedToken(scope);

  const origin = `${url.protocol}//${url.host}`;
  const webcalOrigin = `webcal://${url.host}`;

  const feedPath = `/api/calendar/feed.ics?token=${encodeURIComponent(token)}&scope=${encodeURIComponent(scope)}`;
  const httpsUrl = `${origin}${feedPath}`;
  const webcalUrl = `${webcalOrigin}${feedPath}`;

  return NextResponse.json({
    scope,
    token,
    httpsUrl,
    webcalUrl,
  });
}
