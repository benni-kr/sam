"use client";

import type { Friend } from "@/features/friends/lib/friend";
import { calculateAge } from "@/features/friends/lib/birthday-utils";

export function formatBirthdayTooltip(dateStr: string, birthdays: Friend[]) {
  return birthdays
    .map(
      (friend) =>
        `${friend.name} (${calculateAge(friend.birthday ?? "", dateStr)})`,
    )
    .join(", ");
}
