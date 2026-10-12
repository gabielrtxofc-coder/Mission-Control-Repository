"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MissionControlLogo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import type { ShellUser } from "@/components/layout/app-shell";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/projects", label: "Projetos", icon: FolderKanban },
  { href: "/tasks", label: "Tarefas", icon: CheckSquare },
  { href: "/my", label: "Minha área", icon: UserRound },
  { href: "/notifications", label: "Notificações", icon: Bell },
] as const;

const BOTTOM_ITEMS = [{ href: "/settings", label: "Configurações", icon: Settings }] as const;

export function Sidebar({
  user,
  collapsed,
  mobileOpen,
  onMobileClose,
  onToggleCollapse,
}: {
  user: ShellUser;
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();

  const nav = (items: readonly { href: string; label: string; icon: React.ElementType }[]) =>
    items.map((item) => {
      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onMobileClose}
          className={cn(
            "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            collapsed && "justify-center px-2",
            active
              ? "bg-accent-soft text-accent"
              : "text-muted hover:bg-surface-2 hover:text-text",
          )}
          aria-current={active ? "page" : undefined}
          title={collapsed ? item.label : undefined}
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </Link>
      );
    });

  return (
    <>
      {/* Overlay móvel */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "z-50 flex h-full flex-col border-r border-border bg-surface transition-[width] duration-200",
          collapsed ? "w-[68px]" : "w-[248px]",
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:w-[248px] max-lg:transition-transform",
          mobileOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
        )}
        aria-label="Navegação principal"
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-border px-4",
            collapsed && "justify-center px-2",
          )}
        >
          <Link href="/dashboard" className="flex min-w-0 items-center">
            <MissionControlLogo size="sm" showText={!collapsed} />
          </Link>
          <button
            type="button"
            onClick={onMobileClose}
            className="ml-auto rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-text lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          {nav(NAV_ITEMS)}
        </nav>

        <div className="space-y-1 border-t border-border px-3 py-3">
          {nav(BOTTOM_ITEMS)}
          <div
            className={cn(
              "mt-2 flex items-center gap-2.5 rounded-md px-3 py-2",
              collapsed && "justify-center px-2",
            )}
          >
            <Avatar name={user.name} color={user.avatarColor} size="sm" />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-text">{user.name}</p>
                <p className="truncate text-[11px] text-muted">
                  {user.role === "ADMIN" ? "Administrador" : user.jobTitle || "Membro"}
                </p>
              </div>
            )}
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={cn(
                "hidden w-full items-center gap-3 rounded-md px-3 py-2 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-text lg:flex",
                collapsed && "justify-center px-2",
              )}
              aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" aria-hidden />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4" aria-hidden />
                  <span>Recolher</span>
                </>
              )}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
