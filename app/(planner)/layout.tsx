import { Suspense } from "react";
import type { ReactNode } from "react";

import { PlannerShell } from "@/features/planner/components/planner-shell";

export default function PlannerLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <Suspense fallback={null}>
      <PlannerShell>{children}</PlannerShell>
    </Suspense>
  );
}
