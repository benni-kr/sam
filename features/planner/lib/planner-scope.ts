/**
 * Planner scope.
 *
 * Every planner row is partitioned by this value so environments sharing one
 * Supabase project never collide — see NEXT_PUBLIC_SAM_PLANNER_SCOPE in
 * .env.example. It lives in its own module because consumers such as the
 * offline cache need the scope without pulling in (or being defeated by test
 * mocks of) a persistence adapter.
 *
 * This is the single definition. Every planner, friends, weekly-schedule and
 * notification adapter imports it — client and server alike — so the scope a
 * row is written under can never disagree with the scope it is read under.
 */

const DEFAULT_PLANNER_SCOPE = "default";

export function normalizePlannerScope(rawScope: string | undefined) {
  const normalized = (rawScope ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || DEFAULT_PLANNER_SCOPE;
}

export function getPlannerScope() {
  return normalizePlannerScope(process.env.NEXT_PUBLIC_SAM_PLANNER_SCOPE);
}
