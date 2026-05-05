import type { PlannerEvent } from "@/features/planner/lib/planner";
import { getCalendarTheme } from "@/features/planner/lib/category-config";

/**
 * Rich event card used in drag previews and non-compact event contexts.
 */
export function EventBadge({ event }: { event: PlannerEvent }) {
  const theme = getCalendarTheme(event.category);

  return (
    <div className={`rounded-xl border px-3 py-2 shadow-sm ${theme.badge}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-5 text-slate-950">
          {event.title}
        </p>
        <span className="rounded-full border border-current/10 bg-white/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-current/70">
          {event.category}
        </span>
      </div>
      <p className="mt-1 text-xs leading-4 text-slate-600">
        {event.participants.join(" · ")}
      </p>
    </div>
  );
}
