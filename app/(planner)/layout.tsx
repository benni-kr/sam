import type { ReactNode } from "react";

import { PlannerShell } from "@/components/planner/planner-shell";

export default function PlannerLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <PlannerShell>{children}</PlannerShell>;
}