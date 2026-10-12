"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronsLeft, LogOut, Menu, Settings, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationBell } from "@/components/layout/notification-bell";
import { QuickCreate } from "@/components/layout/quick-create";
import type { ShellUser } from "@/components/layout/app-shell";
import { api } from "@/lib/client-api";

export function Topbar({
  user,
  initialUnread,
  onOpenMobileMenu,
  onToggleSidebar,
  collapsed,
}: {
  user: ShellUser;
  initialUnread: number;
  onOpenMobileMenu: () => void;
  onToggleSidebar: () => void;
  collapsed: boolean;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await api.post("/api/auth/logout");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Não foi possível sair. Tente novamente.");
      setLoggingOut(false);
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-surface/60 px-4 backdrop-blur-sm sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-text lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onToggleSidebar}
        className="hidden rounded-md p-2 text-muted hover:bg-surface-2 hover:text-text lg:block"
        aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
      >
        <ChevronsLeft
          className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-1.5">
        <QuickCreate />
        <NotificationBell initialUnread={initialUnread} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="ml-1 rounded-full transition-transform hover:scale-105"
              aria-label="Menu do usuário"
            >
              <Avatar name={user.name} color={user.avatarColor} size="md" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-text">{user.name}</span>
                <span className="text-xs text-muted">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/settings")}>
              <UserRound className="h-4 w-4 text-muted" aria-hidden />
              Meu perfil
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/settings?tab=workspace")}>
              <Settings className="h-4 w-4 text-muted" aria-hidden />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout} disabled={loggingOut}>
              <LogOut className="h-4 w-4 text-muted" aria-hidden />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
