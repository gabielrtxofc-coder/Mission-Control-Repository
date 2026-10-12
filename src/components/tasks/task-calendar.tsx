"use client";

import * as React from "react";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { todayISO } from "@/lib/dates";
import type { TaskDTO } from "@/lib/serializers";
import { capitalizeFirst, cn } from "@/lib/utils";
import { TASK_STATUS_META } from "@/lib/constants";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function TaskCalendar({
  tasks,
  onOpenTask,
}: {
  tasks: TaskDTO[];
  onOpenTask: (id: string) => void;
}) {
  const [anchor, setAnchor] = React.useState(() => parseISO(todayISO()));

  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = new Date(d.getTime() + 86_400_000)) {
    days.push(d);
  }

  const byDate = React.useMemo(() => {
    const map = new Map<string, TaskDTO[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const list = map.get(task.dueDate) ?? [];
      list.push(task);
      map.set(task.dueDate, list);
    }
    return map;
  }, [tasks]);

  return (
    <div className="surface-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text">
          {capitalizeFirst(format(anchor, "MMMM 'de' yyyy", { locale: ptBR }))}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setAnchor((a) => addMonths(a, -1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAnchor(parseISO(todayISO()))}
          >
            Hoje
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setAnchor((a) => addMonths(a, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-surface-2/50">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-2 py-2 text-center text-xs font-medium text-muted">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const dayTasks = byDate.get(iso) ?? [];
          const inMonth = isSameMonth(day, anchor);
          const today = isToday(day);
          return (
            <div
              key={iso}
              className={cn(
                "min-h-[110px] border-b border-r border-border/60 p-1.5",
                !inMonth && "bg-surface-2/30",
              )}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    today
                      ? "bg-accent font-semibold text-background"
                      : inMonth
                        ? "text-text"
                        : "text-muted/50",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onOpenTask(task.id)}
                    className="block w-full truncate rounded border-l-2 bg-surface-2 px-1.5 py-1 text-left text-[11px] text-text transition-colors hover:bg-surface-3"
                    style={{ borderLeftColor: task.projectColor ?? TASK_STATUS_META[task.status].dot.replace("bg-", "") }}
                    title={task.title}
                  >
                    {task.title}
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <p className="px-1 text-[10px] text-muted">
                    +{dayTasks.length - 3} mais
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
