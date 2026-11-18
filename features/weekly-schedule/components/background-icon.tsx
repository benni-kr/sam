"use client";

import {
  BookOpen,
  Coffee,
  Dumbbell,
  Moon,
  TrainFront,
  UtensilsCrossed,
} from "lucide-react";

import type { BackgroundIconKind } from "@/features/weekly-schedule/lib/week-types";

export function BackgroundIcon({
  kind,
  className = "h-4 w-4 shrink-0 pointer-events-none",
}: {
  kind: BackgroundIconKind;
  className?: string;
}) {
  const iconProps = { className, "aria-hidden": true as const };

  switch (kind) {
    case "coffee":
      return <Coffee {...iconProps} />;
    case "study":
      return <BookOpen {...iconProps} />;
    case "workout":
      return <Dumbbell {...iconProps} />;
    case "commute":
      return <TrainFront {...iconProps} />;
    case "rest":
      return <Moon {...iconProps} />;
    case "lunch":
    default:
      return <UtensilsCrossed {...iconProps} />;
  }
}
