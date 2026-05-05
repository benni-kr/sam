import { Suspense } from "react";
import type { ReactNode } from "react";

import { AppShell } from "@/features/planner/components/layout/app-shell";
import { AuthGuard } from "@/features/auth/components/auth-guard";
import { SidebarContent } from "@/components/layout/sidebar-content";

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
