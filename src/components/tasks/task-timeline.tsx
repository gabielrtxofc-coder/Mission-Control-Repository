"use client";

import * as React from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { todayISO, type ISODate } from "@/lib/dates";
import { TASK_STATUS_META } from "@/lib/constants";
import type { TaskDTO, ProjectDTO } from "@/lib/serializers";
import { cn } from "@/lib/utils";

/**
 * Linha do tempo (Gantt simplificado): barras posicionadas e dimensionadas
 * conforme as datas reais de início e prazo das tarefas e projetos.
 */
export function TaskTimeline({
  tasks,
  projects,
  onOpenTask,
}: {
  tasks: TaskDTO[];
  projects: Pick<ProjectDTO, "id" | "name" | "color">[];
  onOpenTask: (id: string) => void;
}) {
  const today = todayISO();

  // Intervalo: min(inícios/prazos) … max, com margem; fallback ±15 dias
  const dates: string[] = [];
  for (const t of tasks) {
    if (t.startDate) dates.push(t.startDate);
    if (t.dueDate) dates.push(t.dueDate);
  }
  let minDate = dates.length > 0 ? dates.reduce((a, b) => (a < b ? a : b)) : today;
  let maxDate = dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : addDaysISOLocal(today, 30);
  if (differenceInCalendarDays(parseISO(minDate), parseISO(today)) > 0) minDate = today;
  if (differenceInCalendarDays(parseISO(maxDate), parseISO(minDate)) < 14) {
    maxDate = addDaysISOLocal(minDate, 30);
  }
  minDate = addDaysISOLocal(minDate, -2);
  maxDate = addDaysISOLocal(maxDate, 3);

  const totalDays = differenceInCalendarDays(parseISO(maxDate), parseISO(minDate)) + 1;

  function pct(date: ISODate): number {
    return (differenceInCalendarDays(parseISO(date), parseISO(minDate)) / totalDays) * 100;
  }

  function barStyle(task: TaskDTO): React.CSSProperties {
    const start = task.startDate ?? task.dueDate ?? today;
    const end = task.dueDate ?? task.startDate ?? today;
    const left = Math.max(0, pct(start));
    const right = Math.min(100, pct(end) + 100 / totalDays);
    return {
      left: `${left}%`,
      width: `${Math.max(right - left, 100 / totalDays)}%`,
    };
  }

  // Marcadores de semana
  const markers: { date: ISODate; label: string }[] = [];
  for (let i = 0; i < totalDays; i += 7) {
    const d = addDaysISOLocal(minDate, i);
    markers.push({ date: d, label: format(parseISO(d), "dd/MM", { locale: ptBR }) });
  }

  const todayPct = pct(today);

  // Agrupa por projeto
  const groups = new Map<string, TaskDTO[]>();
  for (const task of tasks) {
    const key = task.projectId ?? "__none__";
    const list = groups.get(key) ?? [];
    list.push(task);
    groups.set(key, list);
  }

  return (
    <div className="surface-panel overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-[800px]">
          {/* Cabeçalho de datas */}
          <div className="flex border-b border-border bg-surface-2/50">
            <div className="w-[240px] shrink-0 px-4 py-2 text-xs font-medium text-muted">
              Tarefa
            </div>
            <div className="relative flex-1">
              {markers.map((m) => (
                <span
                  key={m.date}
                  className="absolute top-2 text-[10px] text-muted"
                  style={{ left: `${pct(m.date)}%` }}
                >
                  {m.label}
                </span>
              ))}
              <div className="h-9" />
            </div>
          </div>

          {groups.size === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">
              Nenhuma tarefa com datas para exibir na linha do tempo.
            </p>
          ) : (
            [...groups.entries()].map(([projectId, groupTasks]) => {
              const project = projects.find((p) => p.id === projectId);
              return (
                <div key={projectId}>
                  <div className="flex items-center border-b border-border/60 bg-surface/60">
                    <div className="flex w-[240px] shrink-0 items-center gap-2 px-4 py-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: project?.color ?? "#8B94A3" }}
                        aria-hidden
                      />
                      <span className="truncate text-xs font-medium text-text">
                        {project?.name ?? "Sem projeto"}
                      </span>
                    </div>
                    <div className="flex-1" />
                  </div>

                  {groupTasks.map((task) => (
                    <div key={task.id} className="group flex border-b border-border/40">
                      <div className="w-[240px] shrink-0 truncate px-4 py-2.5 text-xs text-muted group-hover:text-text">
                        {task.title}
                      </div>
                      <div className="relative flex-1 py-2.5">
                        {/* Linha de hoje */}
                        {todayPct >= 0 && todayPct <= 100 && (
                          <div
                            className="absolute inset-y-0 w-px bg-accent/40"
                            style={{ left: `${todayPct}%` }}
                            aria-hidden
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenTask(task.id)}
                          className={cn(
                            "absolute top-1/2 h-6 -translate-y-1/2 cursor-pointer rounded-md border text-[10px] leading-6 transition-opacity",
                            "hover:opacity-80",
                          )}
                          style={{
                            ...barStyle(task),
                            backgroundColor:
                              task.status === "DONE"
                                ? "rgba(163,230,53,0.25)"
                                : "rgba(56,189,248,0.25)",
                            borderColor:
                              task.status === "DONE"
                                ? "rgba(163,230,53,0.6)"
                                : "rgba(56,189,248,0.6)",
                          }}
                          title={`${task.title} · ${TASK_STATUS_META[task.status].label}`}
                        >
                          <span className="pointer-events-none block truncate px-2 text-left text-text">
                            {task.title}
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-info/60" aria-hidden /> Em aberto
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent/60" aria-hidden /> Concluída
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-px bg-accent/60" aria-hidden /> Hoje
        </span>
      </div>
    </div>
  );
}

function addDaysISOLocal(date: ISODate, days: number): ISODate {
  return format(addDays(parseISO(date), days), "yyyy-MM-dd");
}
