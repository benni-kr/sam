"use client";

import type { Friend } from "@/features/friends/lib/friend";
import { formatBirthdayMessage } from "@/features/friends/lib/birthday-utils";

type BirthdayBannerProps = {
  dateStr: string;
  birthdays: Friend[];
};

function formatBirthdaySummary(dateStr: string, birthdays: Friend[]) {
  return formatBirthdayMessage(dateStr, birthdays);
}

/**
 * Celebratory birthday banner for day-level views.
 */
export function BirthdayBanner({ dateStr, birthdays }: BirthdayBannerProps) {
  if (birthdays.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">
        Birthday spotlight
      </p>
      <p className="mt-1 text-sm font-medium">
        {formatBirthdaySummary(dateStr, birthdays)}
      </p>
    </div>
  );
}
