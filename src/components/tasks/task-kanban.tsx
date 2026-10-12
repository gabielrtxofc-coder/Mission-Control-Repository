"use client";

import * as React from "react";
import type { TaskStatus } from "@prisma/client";
import { TASK_STATUSES, TASK_STATUS_META, TASK_PRIORITY_META } from "@/lib/constants";
import { formatDateBR, isOverdue, todayISO } from "@/lib/dates";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { TaskDTO } from "@/lib/serializers";

type DragState = {
  taskId: string;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fromStatus: TaskStatus;
  overStatus: TaskStatus | null;
};

export function TaskKanban({
  tasks,
  onOpenTask,
  onMove,
}: {
  tasks: TaskDTO[];
  onOpenTask: (id: string) => void;
  onMove: (id: string, status: TaskStatus, position: number) => Promise<void> | void;
}) {
  const today = todayISO();
  const [drag, setDrag] = React.useState<DragState | null>(null);
  const columnRefs = React.useRef<Partial<Record<TaskStatus, HTMLDivElement | null>>>({});
  const dragRef = React.useRef<DragState | null>(null);
  dragRef.current = drag;

  const byStatus = React.useMemo(() => {
    const map = new Map<TaskStatus, TaskDTO[]>();
    for (const status of TASK_STATUSES) map.set(status, []);
    for (const task of tasks) {
      map.get(task.status)?.push(task);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.position - b.position);
    }
    return map;
  }, [tasks]);

  function handlePointerDown(event: React.PointerEvent, task: TaskDTO) {
    if (event.button !== 0) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    let started = false;

    function handleDragMove(e: PointerEvent) {
      if (!started && Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) < 6) return;
      if (!started) {
        started = true;
        target.setPointerCapture?.(e.pointerId);
        setDrag({
          taskId: task.id,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
          x: e.clientX,
          y: e.clientY,
          width: rect.width,
          height: rect.height,
          fromStatus: task.status,
          overStatus: task.status,
        });
      }
      // Detecta coluna sob o cursor
      let over: TaskStatus | null = null;
      for (const status of TASK_STATUSES) {
        const col = columnRefs.current[status];
        if (!col) continue;
        const cr = col.getBoundingClientRect();
        if (e.clientX >= cr.left && e.clientX <= cr.right) {
          over = status;
          break;
        }
      }
      setDrag((prev) =>
        prev
          ? { ...prev, x: e.clientX, y: e.clientY, overStatus: over ?? prev.overStatus }
          : prev,
      );
    }

    function handleDragEnd() {
      document.removeEventListener("pointermove", handleDragMove);
      document.removeEventListener("pointerup", handleDragEnd);
      document.removeEventListener("pointercancel", handleDragEnd);
      if (!started) {
        // clique simples
        onOpenTask(task.id);
        return;
      }
      const current = dragRef.current;
      const targetStatus = current?.overStatus ?? task.status;
      setDrag(null);
      if (targetStatus !== task.status) {
        // posição: coloca no fim da coluna de destino
        const dest = byStatus.get(targetStatus) ?? [];
        const maxPos = dest.reduce((max, t) => Math.max(max, t.position), 0);
        void onMove(task.id, targetStatus, maxPos + 1000);
      }
    }

    document.addEventListener("pointermove", handleDragMove);
    document.addEventListener("pointerup", handleDragEnd);
    document.addEventListener("pointercancel", handleDragEnd);
    event.preventDefault();
  }

  return (
    <div className="relative">
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {TASK_STATUSES.map((status) => {
          const list = byStatus.get(status) ?? [];
          const meta = TASK_STATUS_META[status];
          const isTarget = drag?.overStatus === status && drag.fromStatus !== status;
          return (
            <div
              key={status}
              ref={(el) => {
                columnRefs.current[status] = el;
              }}
              data-status-column={status}
              className={cn(
                "flex w-[300px] shrink-0 flex-col rounded-lg border bg-surface/70 transition-colors",
                isTarget ? "border-accent/60 bg-accent/10" : "border-border",
              )}
            >
              <div className="flex items-center gap-2 px-3 py-3">
                <span className={cn("h-2 w-2 rounded-full", meta.dot)} aria-hidden />
                <h3 className="text-sm font-medium text-text">{meta.label}</h3>
                <span className="ml-auto rounded-full bg-surface-3 px-2 py-0.5 text-xs text-muted">
                  {list.length}
                </span>
              </div>

              <div className="flex min-h-[220px] flex-1 flex-col gap-2 px-2 pb-3">
                {list.map((task) => {
                  const isDragging = drag?.taskId === task.id;
                  const overdue = task.status !== "DONE" && isOverdue(task.dueDate, today);
                  return (
                    <div
                      key={task.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Mover tarefa ${task.title}`}
                      onPointerDown={(e) => handlePointerDown(e, task)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onOpenTask(task.id);
                        }
                      }}
                      className={cn(
                        "cursor-grab touch-none rounded-md border border-border bg-surface-2 p-3 shadow-sm transition-colors select-none",
                        "hover:border-border-strong active:cursor-grabbing",
                        isDragging && "pointer-events-none opacity-30",
                        task.archived && "opacity-50",
                      )}
                    >
                      <p
                        className={cn(
                          "text-sm font-medium leading-snug text-text",
                          task.status === "DONE" && "text-muted line-through decoration-muted/50",
                        )}
                      >
                        {task.title}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span
                          className={cn(
                            "rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                            TASK_PRIORITY_META[task.priority].badge,
                          )}
                        >
                          {TASK_PRIORITY_META[task.priority].label}
                        </span>
                        {task.dueDate && (
                          <span
                            className={cn(
                              "text-[10px]",
                              overdue ? "text-danger" : "text-muted",
                            )}
                          >
                            {formatDateBR(task.dueDate)}
                          </span>
                        )}
                        <span className="ml-auto">
                          {task.assignee ? (
                            <Avatar
                              name={task.assignee.name}
                              color={task.assignee.avatarColor}
                              size="xs"
                            />
                          ) : (
                            <span className="text-[10px] text-muted/60">—</span>
                          )}
                        </span>
                      </div>
                      {(task.subtaskCount ?? 0) > 0 && (
                        <p className="mt-2 text-[10px] text-muted">
                          {task.doneSubtaskCount ?? 0}/{task.subtaskCount} subtarefas
                        </p>
                      )}
                    </div>
                  );
                })}

                {list.length === 0 && (
                  <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border/60 px-3 py-6">
                    <p className="text-xs text-muted/70">
                      {drag && drag.overStatus === status
                        ? "Solte aqui"
                        : "Arraste tarefas para esta coluna"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fantasma arrastável */}
      {drag && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-accent/50 bg-surface-2 p-3 shadow-pop"
          style={{
            left: drag.x - drag.offsetX,
            top: drag.y - drag.offsetY,
            width: drag.width,
            opacity: 0.95,
          }}
          aria-hidden
        >
          <p className="text-sm font-medium text-text">
            {tasks.find((t) => t.id === drag.taskId)?.title}
          </p>
          <p className="mt-1 text-[10px] text-accent">
            {drag.overStatus && drag.overStatus !== drag.fromStatus
              ? `Mover para “${TASK_STATUS_META[drag.overStatus].label}”`
              : "Arraste até uma coluna"}
          </p>
        </div>
      )}
    </div>
  );
}
