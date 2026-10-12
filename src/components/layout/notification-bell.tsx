"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NotificationDTO } from "@/lib/serializers";

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const [unread, setUnread] = React.useState(initialUnread);
  const [items, setItems] = React.useState<NotificationDTO[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  async function load() {
    try {
      const [countRes, listRes] = await Promise.all([
        fetch("/api/notifications/count"),
        fetch("/api/notifications?limit=6"),
      ]);
      if (countRes.ok) {
        const data = (await countRes.json()) as { count: number };
        setUnread(data.count);
      }
      if (listRes.ok) {
        const data = (await listRes.json()) as { notifications: NotificationDTO[] };
        setItems(data.notifications);
      }
      setLoaded(true);
    } catch {
      /* silencioso */
    }
  }

  React.useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 60_000);
    return () => clearInterval(timer);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    router.refresh();
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) void load();
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-text"
          aria-label={`Notificações${unread > 0 ? ` (${unread} não lidas)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-background">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-text">Notificações</p>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="h-7 px-2 text-xs">
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
              Marcar todas
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {!loaded ? (
            <p className="px-4 py-6 text-center text-sm text-muted">Carregando…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              Nenhuma notificação por enquanto.
            </p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.link) {
                    void fetch("/api/notifications/read", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ids: [item.id] }),
                    }).catch(() => {});
                    router.push(item.link);
                  }
                }}
                className={cn(
                  "block w-full border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface-3",
                  !item.readAt && "bg-accent/10",
                )}
              >
                <p className="text-xs font-medium text-text">{item.title}</p>
                {item.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{item.body}</p>}
                <p className="mt-1 text-[10px] text-muted">
                  {formatDistanceToNow(new Date(item.createdAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </button>
            ))
          )}
        </div>
        <button
          type="button"
          onClick={() => router.push("/notifications")}
          className="block w-full border-t border-border px-4 py-2.5 text-center text-xs font-medium text-accent hover:bg-surface-2"
        >
          Ver todas
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
