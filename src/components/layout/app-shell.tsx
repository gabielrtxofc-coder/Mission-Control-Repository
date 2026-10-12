"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { UserDTO } from "@/lib/serializers";
import { applyTheme, resolveTheme } from "@/lib/theme";

export type ShellUser = UserDTO & {
  role: "ADMIN" | "MEMBER";
  workspaceName: string;
  prefs: Record<string, unknown>;
};

export function AppShell({
  user,
  initialUnread,
  children,
}: {
  user: ShellUser;
  initialUnread: number;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Aplica o tema salvo do usuário (escuro por padrão).
  React.useEffect(() => {
    applyTheme(resolveTheme(user.prefs));
  }, [user.prefs]);

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      void fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs: { sidebarCollapsed: next } }),
      }).catch(() => {});
      return next;
    });
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        user={user}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onToggleCollapse={toggleCollapsed}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          initialUnread={initialUnread}
          onOpenMobileMenu={() => setMobileOpen(true)}
          onToggleSidebar={toggleCollapsed}
          collapsed={collapsed}
        />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
