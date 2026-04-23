import { Suspense } from "react";
import type { ReactNode } from "react";

import { PlannerShell } from "@/features/planner/components/planner-shell";
import { AuthGuard } from "@/features/planner/components/auth-guard";

export default function PlannerLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <Suspense fallback={null}>
      <AuthGuard>
        <PlannerShell>{children}</PlannerShell>
      </AuthGuard>
    </Suspense>
  );
}
