"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Plus } from "lucide-react";
import { formatDateBR, isOverdue, todayISO } from "@/lib/dates";
import { PriorityBadge, StatusBadge, TagChip } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskPanel } from "@/components/tasks/task-panel";
import type { TaskDTO } from "@/lib/serializers";
import { cn } from "@/lib/utils";

export function ProjectTasks({ projectId, tasks }: { projectId: string; tasks: TaskDTO[] }) {
  const router = useRouter();
  const today = todayISO();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [openId, setOpenId] = React.useState<string | null>(null);

  return (
    <>
      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Nenhuma tarefa neste projeto"
          description="Adicione a primeira tarefa para começar a executar."
          action={
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Nova tarefa
            </Button>
          }
        />
      ) : (
        <div className="surface-panel divide-y divide-border/60">
          {tasks.map((task) => (
            <button
              key={task.id}
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
                  {task.tags?.map((tag) => (
                    <TagChip key={tag.id} name={tag.name} color={tag.color} />
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {task.assignee ? (
                  <Avatar name={task.assignee.name} color={task.assignee.avatarColor} size="sm" />
                ) : (
                  <span className="text-xs text-muted/60">—</span>
                )}
                {task.dueDate && (
                  <span
                    className={cn(
                      "text-xs",
                      isOverdue(task.dueDate, today) && task.status !== "DONE"
                        ? "text-danger"
                        : "text-muted",
                    )}
                  >
                    {formatDateBR(task.dueDate)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <TaskFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaults={{ projectId }}
        onSaved={() => router.refresh()}
      />
      <TaskPanel
        taskId={openId}
        onClose={() => {
          setOpenId(null);
          router.refresh();
        }}
        onSaved={() => router.refresh()}
      />
    </>
  );
}
