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
 * True when SAM runs on mobile screens (where the sidebar add button is scrolled
 * away) or when installed as a standalone PWA.
 */
function useIsMobileOrStandalone() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const mobileQuery = window.matchMedia("(max-width: 1023px)");

    const evaluate = () => {
      const isStandalone =
        standaloneQuery.matches ||
        (window.navigator as { standalone?: boolean }).standalone === true;
      const isMobile = mobileQuery.matches;
      setIsVisible(isStandalone || isMobile);
    };

    evaluate();

    if (standaloneQuery?.addEventListener) {
      standaloneQuery.addEventListener("change", evaluate);
    }
    if (mobileQuery?.addEventListener) {
      mobileQuery.addEventListener("change", evaluate);
    }

    return () => {
      if (standaloneQuery?.removeEventListener) {
        standaloneQuery.removeEventListener("change", evaluate);
      }
      if (mobileQuery?.removeEventListener) {
        mobileQuery.removeEventListener("change", evaluate);
      }
    };
  }, []);

  return isVisible;
}

export function AddEventFab() {
  const { openCreateEvent } = useCreateEvent();
  const { isOffline } = usePlannerState();
  const pathname = usePathname();
  const isVisible = useIsMobileOrStandalone();

  // The floating action button should only exist in the calendar view ("/"),
  // and is explicitly hidden on crosstables (table) and list views.
  if (!pathname || pathname !== "/") {
    return null;
  }

  // Surface the floating action on mobile screens and installed PWA; in desktop
  // browsers the sticky sidebar "add" controls are the intended entry point.
  if (!isVisible) {
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
      onClick={() => openCreateEvent()}
      aria-label="Add event"
      title="Add event"
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
