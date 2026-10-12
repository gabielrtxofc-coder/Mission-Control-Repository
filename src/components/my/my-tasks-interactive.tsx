"use client";

import * as React from "react";
import { CheckSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskPanel } from "@/components/tasks/task-panel";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { formatDateBR } from "@/lib/dates";
import type { TaskDTO } from "@/lib/serializers";
import { cn } from "@/lib/utils";

/** Lista interativa: clique abre o painel da tarefa e atualizações refletem na hora. */
export function MyTasksInteractive({ tasks }: { tasks: TaskDTO[] }) {
  const [items, setItems] = React.useState(tasks);
  const [openId, setOpenId] = React.useState<string | null>(null);

  React.useEffect(() => setItems(tasks), [tasks]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="Nenhuma tarefa atribuída"
        description="Quando alguém atribuir uma tarefa a você, ela aparece aqui."
      />
    );
  }

  return (
    <>
      <ul className="surface-panel divide-y divide-border/60">
        {items.map((task) => (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => setOpenId(task.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/70"
            >
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-sm font-medium text-text",
                    task.status === "DONE" && "text-muted line-through decoration-muted/50",
                  )}
                >
                  {task.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                  {task.projectName && (
                    <span className="text-xs text-muted">· {task.projectName}</span>
                  )}
                </div>
              </div>
              {task.dueDate && (
                <span className="shrink-0 text-xs text-muted">{formatDateBR(task.dueDate)}</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <TaskPanel
        taskId={openId}
        onClose={() => setOpenId(null)}
        onSaved={(updated) =>
          setItems((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)))
        }
      />
    </>
  );
}
