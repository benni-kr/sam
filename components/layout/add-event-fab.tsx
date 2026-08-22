"use client";

/**
 * Floating "add event" button.
 *
 * A persistent action anchored to the lower-right of the planner shell so a new
 * event is always one tap away — especially handy on the installed PWA where
 * the sidebar "add" controls are further away on small screens.
 *
 * It is view-aware: on the weekly schedule it opens the weekly-appointment
 * editor, everywhere else the calendar-event editor. Both modals are owned by
 * the AppShell and triggered through the CreateEvent command context.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { useCreateEvent } from "@/features/planner/components/create-event-context";
import { usePlannerState } from "@/features/planner/state/planner-state";

/**
 * True only when SAM runs as an installed PWA (standalone display mode), false
 * in a normal browser tab. Starts false so the button never flashes in-browser
 * during SSR/hydration; flips true after the client check if we're standalone.
 */
function useIsStandalone() {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");

    const evaluate = () =>
      // `navigator.standalone` covers iOS Safari, which reports home-screen
      // installs there rather than via the display-mode media query.
      setStandalone(
        mediaQuery.matches ||
          (window.navigator as { standalone?: boolean }).standalone === true,
      );

    evaluate();
    mediaQuery.addEventListener("change", evaluate);

    return () => mediaQuery.removeEventListener("change", evaluate);
  }, []);

  return standalone;
}

export function AddEventFab() {
  const { openCreateEvent, openCreateWeekEvent } = useCreateEvent();
  const { isOffline } = usePlannerState();
  const pathname = usePathname();
  const isWeekView = pathname?.startsWith("/week") ?? false;
  const isStandalone = useIsStandalone();

  // Only surface the floating action on the installed PWA; in a browser tab the
  // sidebar "add" controls are the intended entry point.
  if (!isStandalone) {
    return null;
  }

  // Offline is read-only, and the editors refuse to open anyway — hiding the
  // button avoids offering an action that would silently do nothing.
  if (isOffline) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => (isWeekView ? openCreateWeekEvent() : openCreateEvent())}
      aria-label={isWeekView ? "Add weekly appointment" : "Add event"}
      title={isWeekView ? "Add weekly appointment" : "Add event"}
      // Respect the device safe area so the button never hides behind the
      // home indicator / rounded corners on installed phones.
      style={{
        bottom: "max(1.5rem, env(safe-area-inset-bottom))",
        right: "max(1.5rem, env(safe-area-inset-right))",
      }}
      className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full border border-sam-border bg-sam-surface text-sam-text-2 shadow-lg shadow-slate-900/10 transition-colors hover:bg-sam-surface-2 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-sam-border-2 dark:shadow-black/30 dark:hover:bg-sam-surface-2"
    >
      <Plus className="h-7 w-7" aria-hidden="true" strokeWidth={2.25} />
    </button>
  );
}
