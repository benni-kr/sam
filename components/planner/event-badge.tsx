import type { PlannerEvent } from "@/lib/planner";

function categoryTone(category: PlannerEvent["category"]) {
  switch (category) {
    case "Exams":
      return "border-violet-200 bg-violet-50 text-violet-900";
    case "Group Events":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "Private Events":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "Inbox":
      return "border-stone-200 bg-stone-100 text-stone-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

/**
 * Rich event card used in drag previews and non-compact event contexts.
 */
export function EventBadge({ event }: { event: PlannerEvent }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 shadow-sm ${categoryTone(event.category)}`}
    >
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
