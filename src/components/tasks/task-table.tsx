"use client";

import * as React from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_PRIORITY_META,
  TASK_STATUS_META,
} from "@/lib/constants";
import { formatDateBR, isOverdue, todayISO, isDueSoon } from "@/lib/dates";
import { Badge, TagChip } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import type { TaskDTO } from "@/lib/serializers";
import { ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "title" | "dueDate" | "priority" | "status" | "updatedAt";

const COLUMNS: { key: SortKey | null; label: string; className?: string }[] = [
  { key: "title", label: "Tarefa" },
  { key: null, label: "Projeto" },
  { key: null, label: "Responsável" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Prioridade" },
  { key: "dueDate", label: "Prazo" },
  { key: "updatedAt", label: "Atualizada", className: "hidden lg:table-cell" },
  { key: null, label: "", className: "w-10" },
];

export function TaskTable({
  tasks,
  sort,
  dir,
  onSort,
  onOpenTask,
  onQuickUpdate,
  onEdit,
  onArchive,
  onRestore,
}: {
  tasks: TaskDTO[];
  sort: string;
  dir: "asc" | "desc";
  onSort: (key: SortKey, dir: "asc" | "desc") => void;
  onOpenTask: (id: string) => void;
  onQuickUpdate: (id: string, patch: Partial<TaskDTO>) => Promise<void> | void;
  onEdit: (task: TaskDTO) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  const today = todayISO();

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ListTodo}
        title="Nenhuma tarefa encontrada"
        description="Ajuste os filtros ou crie uma nova tarefa para começar."
      />
    );
  }

  return (
    <div className="surface-panel overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            {COLUMNS.map((col) => (
              <th
                key={col.label || "actions"}
                className={cn("px-4 py-3 font-medium text-muted", col.className)}
              >
                {col.key ? (
                  <button
                    type="button"
                    onClick={() =>
                      onSort(col.key!, sort === col.key && dir === "desc" ? "asc" : "desc")
                    }
                    className="inline-flex items-center gap-1 hover:text-text"
                  >
                    {col.label}
                    {sort === col.key ? (
                      dir === "desc" ? (
                        <ArrowDown className="h-3 w-3" aria-hidden />
                      ) : (
                        <ArrowUp className="h-3 w-3" aria-hidden />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden />
                    )}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const done = task.status === "DONE";
            const overdue = !done && isOverdue(task.dueDate, today);
            const soon = !done && isDueSoon(task.dueDate, today) && !overdue;
            return (
              <tr
                key={task.id}
                className={cn(
                  "group cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-surface-2/70",
                  task.archived && "opacity-50",
                )}
                onClick={() => onOpenTask(task.id)}
              >
                <td className="max-w-[320px] px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "truncate font-medium text-text",
                          task.status === "DONE" && "text-muted line-through decoration-muted/50",
                        )}
                      >
                        {task.title}
                      </p>
                      {(task.tags?.length ?? 0) > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {task.tags!.map((tag) => (
                            <TagChip key={tag.id} name={tag.name} color={tag.color} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {task.projectId ? (
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: task.projectColor ?? "#8B94A3" }}
                        aria-hidden
                      />
                      <span className="truncate">{task.projectName}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted/60">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {task.assignee ? (
                    <span className="inline-flex items-center gap-2">
                      <Avatar name={task.assignee.name} color={task.assignee.avatarColor} size="xs" />
                      <span className="truncate text-text">{task.assignee.name}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted/60">Não atribuída</span>
                  )}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={task.status}
                    onChange={(e) =>
                      void onQuickUpdate(task.id, { status: e.target.value as TaskStatus })
                    }
                    className={cn(
                      "cursor-pointer rounded-md border border-transparent bg-transparent px-2 py-1 text-xs font-medium",
                      "hover:border-border-strong focus:border-accent/50 focus:outline-none",
                      TASK_STATUS_META[task.status].badge,
                    )}
                    aria-label={`Status de ${task.title}`}
                  >
                    {TASK_STATUSES.map((s) => (
                      <option key={s} value={s} className="bg-surface-2 text-text">
                        {TASK_STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={task.priority}
                    onChange={(e) =>
                      void onQuickUpdate(task.id, { priority: e.target.value as TaskPriority })
                    }
                    className={cn(
                      "cursor-pointer rounded-md border border-transparent bg-transparent px-2 py-1 text-xs font-medium",
                      "hover:border-border-strong focus:border-accent/50 focus:outline-none",
                      TASK_PRIORITY_META[task.priority].badge,
                    )}
                    aria-label={`Prioridade de ${task.title}`}
                  >
                    {TASK_PRIORITIES.map((p) => (
                      <option key={p} value={p} className="bg-surface-2 text-text">
                        {TASK_PRIORITY_META[p].label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  {task.dueDate ? (
                    <Badge
                      className={cn(
                        "font-normal",
                        overdue
                          ? "border-danger/40 bg-danger-soft text-danger"
                          : soon
                            ? "border-warning/40 bg-warning-soft text-warning"
                            : "border-transparent bg-transparent text-muted",
                      )}
                    >
                      {formatDateBR(task.dueDate)}
                      {overdue ? " · atrasada" : soon ? " · em breve" : ""}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted/60">—</span>
                  )}
                </td>
                <td className="hidden px-4 py-3 text-xs text-muted lg:table-cell">
                  {new Date(task.updatedAt).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                        aria-label={`Ações de ${task.title}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => onEdit(task)}>
                        <Pencil className="h-3.5 w-3.5 text-muted" aria-hidden />
                        Editar
                      </DropdownMenuItem>
                      {task.archived ? (
                        <DropdownMenuItem onSelect={() => onRestore(task.id)}>
                          <ArchiveRestore className="h-3.5 w-3.5 text-muted" aria-hidden />
                          Restaurar
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onSelect={() => onArchive(task.id)}>
                          <Archive className="h-3.5 w-3.5 text-muted" aria-hidden />
                          Arquivar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
