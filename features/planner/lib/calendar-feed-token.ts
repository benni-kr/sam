import crypto from "node:crypto";
import { normalizePlannerScope } from "@/features/planner/lib/planner-scope";

/**
 * Returns the secret key used for HMAC signing of calendar feed URLs.
 * Uses available server secrets in fallback order.
 */
export function getFeedSecret(): string {
  return (
    process.env.CALENDAR_FEED_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VAPID_PRIVATE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "sam-default-calendar-feed-secret"
  );
}

/**
 * Generates a deterministic HMAC token for a given planner scope.
 * This allows calendar applications (which cannot use session cookies or headers)
 * to securely subscribe to their schedule without exposing private database rows.
 */
export function generateFeedToken(rawScope?: string): string {
  const scope = normalizePlannerScope(rawScope);
  const secret = getFeedSecret();
  return crypto
    .createHmac("sha256", secret)
    .update(`sam-calendar-feed:${scope}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Verifies that a feed token matches the expected HMAC for the specified scope.
 * Uses timingSafeEqual to guard against timing attacks.
 */
export function verifyFeedToken(token: string | null | undefined, rawScope?: string): boolean {
  if (!token || typeof token !== "string") {
    return false;
  }

  const expected = generateFeedToken(rawScope);
  if (token.length !== expected.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}
