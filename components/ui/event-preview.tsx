"use client";

export type PreviewEventShape = {
  title: string;
  category: string;
  participants: string[];
  // week event fields
  day?: string;
  startTime?: string;
  endTime?: string;
  // calendar event fields
  startDate?: string | null;
  endDate?: string | null;
};

// Helper to convert "YYYY-MM-DD" to "DD.MM.YYYY"
function formatDisplayDate(dateStr?: string | null) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}.${month}.${year}`;
  }
  return dateStr; // Fallback if it's already formatted or a weird string
}

export function EventPreviewModal({
  heading,
  event,
  showTime = false,
  onEdit,
  onClose,
}: {
  heading: string;
  event: PreviewEventShape;
  showTime?: boolean;
  onEdit: () => void;
  onClose: () => void;
}) {
  const displayDay = formatDisplayDate(event.day) || event.day || "";

  const dateLine = showTime
    ? `${displayDay} · ${event.startTime} - ${event.endTime}`
    : event.startDate
      ? `${formatDisplayDate(event.startDate)}${event.endDate && event.endDate !== event.startDate ? ` - ${formatDisplayDate(event.endDate)}` : ""}`
      : "Date TBD";

  function categoryBadgeStyle(category: string) {
    switch (category) {
      //appointment categories
      case "University":
        return "border-slate-300 bg-slate-100 text-slate-950";
      case "Language courses":
        return "border-emerald-500 bg-emerald-100 text-emerald-950";
      case "Sports":
        return "border-orange-300 bg-orange-100 text-orange-950";
      //event categories
      case "Exam":
        return "border-violet-300 bg-violet-50 text-violet-900";
      case "Language Exam":
        return "border-rose-300 bg-rose-50 text-rose-900";
      case "Group Event":
        return "border-emerald-300 bg-emerald-50 text-emerald-900";
      case "Private Event":
        return "border-amber-300 bg-amber-50 text-amber-900";
      //other for both
      case "Other":
        return "border-sky-300 bg-sky-100 text-sky-900";
      default:
        return "border-slate-200 bg-slate-50 text-slate-700";
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${heading}: ${event.title}`}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Title and Top Right Actions */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {heading}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-md border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              aria-label="Edit"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-md border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              aria-label="Close"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div
          className={`rounded-xl border p-4 ${categoryBadgeStyle(
            event.category,
          )}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold leading-none">
                {event.title}
              </h3>
              <p className="mt-2 text-sm font-medium opacity-80">{dateLine}</p>
            </div>

            <span className="shrink-0 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] shadow-sm">
              {event.category}
            </span>
          </div>

          <div className="mt-4 text-[13px] font-medium opacity-90">
            {event.participants.join(" · ") || "No participants"}
          </div>
        </div>
      </div>
    </div>
  );
}
