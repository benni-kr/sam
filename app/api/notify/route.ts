/**
 * POST /api/notify — Web Push broadcast sender.
 *
 * Called by an authenticated client after it detects a new event or a new
 * participant. Fans the given notifications out to every push subscription in
 * the current planner scope (except the acting device), signing each with the
 * VAPID keys. Stale subscriptions (404/410 from the push service) are pruned.
 *
 * This is the whole "backend": no cron, no separate service. Secrets
 * (VAPID_PRIVATE_KEY, SUPABASE_SERVICE_ROLE_KEY) live only here, server-side.
 */

import webpush from "web-push";
import { normalizePlannerScope } from "@/features/planner/lib/planner-scope";

// web-push relies on Node's crypto, so this route must run on the Node runtime
// rather than the Edge runtime.
export const runtime = "nodejs";

const SUBSCRIPTIONS_TABLE = "push_subscriptions";
const MAX_NOTIFICATIONS_PER_REQUEST = 20;

type PushPayload = {
  title: string;
  body: string;
  tag?: string;
  url?: string;
};

type SubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function readServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:paisc.business@gmail.com";

  if (
    !url ||
    !anonKey ||
    !serviceRoleKey ||
    !vapidPublicKey ||
    !vapidPrivateKey
  ) {
    return null;
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
    vapidPublicKey,
    vapidPrivateKey,
    vapidSubject,
    plannerScope: normalizePlannerScope(process.env.NEXT_PUBLIC_SAM_PLANNER_SCOPE),
  };
}

// Confirms the bearer token belongs to a real Supabase user before allowing a
// broadcast, so the endpoint is not an open push-spam relay.
async function isAuthenticated(
  config: NonNullable<ReturnType<typeof readServerConfig>>,
  token: string,
) {
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  return response.ok;
}

function parsePayloads(value: unknown): PushPayload[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      title: typeof item.title === "string" ? item.title : "SAM",
      body: typeof item.body === "string" ? item.body : "",
      tag: typeof item.tag === "string" ? item.tag : undefined,
      url: typeof item.url === "string" ? item.url : "/",
    }))
    .slice(0, MAX_NOTIFICATIONS_PER_REQUEST);
}

async function fetchSubscriptions(
  config: NonNullable<ReturnType<typeof readServerConfig>>,
): Promise<SubscriptionRow[]> {
  const endpoint = `${config.url}/rest/v1/${SUBSCRIPTIONS_TABLE}?select=endpoint,p256dh,auth&planner_scope=eq.${encodeURIComponent(config.plannerScope)}`;

  const response = await fetch(endpoint, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load push subscriptions: ${response.status}`);
  }

  return (await response.json()) as SubscriptionRow[];
}

async function pruneSubscriptions(
  config: NonNullable<ReturnType<typeof readServerConfig>>,
  endpoints: string[],
) {
  if (endpoints.length === 0) {
    return;
  }

  const filter = endpoints.map((endpoint) => encodeURIComponent(endpoint)).join(",");

  await fetch(
    `${config.url}/rest/v1/${SUBSCRIPTIONS_TABLE}?endpoint=in.(${filter})`,
    {
      method: "DELETE",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
      },
    },
  ).catch(() => {
    // Pruning is opportunistic; a failure just retries on the next broadcast.
  });
}

export async function POST(request: Request) {
  const config = readServerConfig();

  if (!config) {
    return Response.json(
      { error: "Push notifications are not configured on the server." },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token || !(await isAuthenticated(config, token))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { excludeEndpoint?: unknown; notifications?: unknown };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payloads = parsePayloads(body.notifications);
  const excludeEndpoint =
    typeof body.excludeEndpoint === "string" ? body.excludeEndpoint : null;

  if (payloads.length === 0) {
    return Response.json({ sent: 0, recipients: 0 });
  }

  webpush.setVapidDetails(
    config.vapidSubject,
    config.vapidPublicKey,
    config.vapidPrivateKey,
  );

  const subscriptions = (await fetchSubscriptions(config)).filter(
    (subscription) => subscription.endpoint !== excludeEndpoint,
  );

  const staleEndpoints: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      const target = {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      };

      for (const payload of payloads) {
        try {
          await webpush.sendNotification(target, JSON.stringify(payload));
          sent += 1;
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;

          // 404/410 mean the browser dropped the subscription; stop trying it
          // and schedule it for removal.
          if (statusCode === 404 || statusCode === 410) {
            staleEndpoints.push(subscription.endpoint);
            break;
          }
        }
      }
    }),
  );

  await pruneSubscriptions(config, staleEndpoints);

  return Response.json({ sent, recipients: subscriptions.length });
}
