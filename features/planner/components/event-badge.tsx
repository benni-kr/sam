import type { PlannerEvent } from "@/features/planner/lib/planner";
import { getCalendarTheme } from "@/features/planner/lib/category-config";

/**
 * Rich event card used in drag previews and non-compact event contexts.
 *
 * The text elements intentionally rely on CSS color inheritance from the
 * `CalendarCategoryTheme` tokens applied by the wrapper.
 */
export function EventBadge({ event }: { event: PlannerEvent }) {
  const theme = getCalendarTheme(event.category);

  return (
    <div className={`rounded-xl border px-3 py-2 shadow-sm ${theme.badge}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-5">{event.title}</p>
        <span className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-900 shadow-xs">
          {event.category}
        </span>
      </div>
      <p className="mt-1 text-xs leading-4 opacity-75">
        {event.participants.join(" · ")}
      </p>
    </div>
  );
}
