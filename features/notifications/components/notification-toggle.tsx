"use client";

import { Bell, BellOff, BellRing } from "lucide-react";
import { useEffect, useState } from "react";

import {
  disablePushNotifications,
  enablePushNotifications,
  getActiveSubscriptionEndpoint,
  getPermissionState,
} from "@/features/notifications/lib/push-subscription";

/**
 * Bell toggle that lets a user opt in to (or out of) push notifications for new
 * events and new participants. Rendered in the sidebar header next to the theme
 * toggle. Hidden entirely when push is unsupported or unconfigured — notably in
 * a plain iOS Safari tab, where the PWA must be installed to the home screen
 * first.
 *
 * On every state change it dispatches `sam:push:changed` so the planner state
 * can refresh the device endpoint it excludes from its own broadcasts.
 */
export function NotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const state = getPermissionState();

    if (state === "unsupported") {
      return;
    }

    void getActiveSubscriptionEndpoint().then((endpoint) => {
      if (cancelled) {
        return;
      }

      setSupported(true);
      setDenied(state === "denied");
      setEnabled(Boolean(endpoint) && state === "granted");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleClick() {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      if (enabled) {
        await disablePushNotifications();
        setEnabled(false);
      } else {
        await enablePushNotifications();
        setEnabled(true);
        setDenied(false);
      }

      window.dispatchEvent(new CustomEvent("sam:push:changed"));
    } catch {
      // The most common failure is the user dismissing or blocking the prompt;
      // reflect that in the button state rather than surfacing an error dialog.
      setDenied(getPermissionState() === "denied");
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return null;
  }

  const label = denied
    ? "Benachrichtigungen im Browser blockiert"
    : enabled
      ? "Benachrichtigungen ausschalten"
      : "Benachrichtigungen einschalten";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || denied}
      aria-label={label}
      aria-pressed={enabled}
      title={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-sam-border bg-sam-surface text-sam-text-3 transition-colors hover:bg-sam-surface-2 hover:text-sam-text-2 disabled:opacity-50 dark:bg-sam-surface-2 dark:hover:bg-slate-700 dark:hover:text-slate-200"
    >
      {denied ? (
        <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
      ) : enabled ? (
        <BellRing className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" aria-hidden="true" />
      ) : (
        <Bell className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </button>
  );
}
