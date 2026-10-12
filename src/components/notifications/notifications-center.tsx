"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/skeleton";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { NotificationDTO } from "@/lib/serializers";

export function NotificationsCenter() {
  const router = useRouter();
  const [items, setItems] = React.useState<NotificationDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<"all" | "unread">("all");

  const load = React.useCallback(
    async (unreadOnly: boolean, append = false) => {
      setLoading(true);
      try {
        const res = await api.get<{
          notifications: NotificationDTO[];
          total: number;
        }>(`/api/notifications?limit=40${unreadOnly ? "&unreadOnly=true" : ""}`);
        setItems((prev) => (append ? [...prev, ...res.notifications] : res.notifications));
      } catch {
        /* vazio */
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    void load(tab === "unread");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function markAllRead() {
    await api.post("/api/notifications/read", { all: true });
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    router.refresh();
  }

  async function markRead(item: NotificationDTO) {
    if (item.readAt) return;
    await api.post("/api/notifications/read", { ids: [item.id] }).catch(() => {});
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n)));
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text">Notificações</h1>
          <p className="mt-0.5 text-sm text-muted">
            Eventos das suas tarefas, projetos e equipe.
          </p>
        </div>
        <Button variant="secondary" onClick={markAllRead}>
          <CheckCheck className="h-4 w-4" aria-hidden />
          Marcar todas como lidas
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unread")}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="unread">Não lidas</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-16">
          <Spinner label="Carregando notificações…" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={tab === "unread" ? "Tudo em dia" : "Nenhuma notificação"}
          description={
            tab === "unread"
              ? "Você não tem notificações não lidas."
              : "Eventos relevantes aparecerão aqui — atribuições, comentários e prazos."
          }
        />
      ) : (
        <ul className="surface-panel divide-y divide-border/60">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  void markRead(item);
                  if (item.link) router.push(item.link);
                }}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-2/70",
                  !item.readAt && "bg-accent/10",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    item.readAt ? "bg-surface-2 text-muted" : "bg-accent/20 text-accent",
                  )}
                >
                  <Bell className="h-3.5 w-3.5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p
                      className={cn(
                        "text-sm",
                        item.readAt ? "text-muted" : "font-medium text-text",
                      )}
                    >
                      {item.title}
                    </p>
                    {!item.readAt && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Não lida" />
                    )}
                  </div>
                  {item.body && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{item.body}</p>
                  )}
                  <p className="mt-1.5 text-[10px] text-muted/80">
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
