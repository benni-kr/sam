import { Suspense } from "react";
import type { ReactNode } from "react";

import { AppShell } from "@/features/planner/components/layout/app-shell";
import { SidebarContent } from "@/features/planner/components/sidebar-content";
import { AuthGuard } from "@/features/planner/components/auth-guard";

export default function PlannerLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <Suspense fallback={null}>
      <AuthGuard>
        <AppShell sidebarContent={<SidebarContent />}>{children}</AppShell>
      </AuthGuard>
    </Suspense>
  );
}
