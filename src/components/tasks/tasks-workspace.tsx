"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  GanttChartSquare,
  LayoutGrid,
  Plus,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/skeleton";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { TaskDTO, UserDTO, ProjectDTO, TagDTO } from "@/lib/serializers";
import { TaskFiltersBar, type TaskFilterState, EMPTY_FILTERS } from "@/components/tasks/task-filters";
import { TaskTable } from "@/components/tasks/task-table";
import { TaskKanban } from "@/components/tasks/task-kanban";
import { TaskCalendar } from "@/components/tasks/task-calendar";
import { TaskTimeline } from "@/components/tasks/task-timeline";
import { TaskPanel } from "@/components/tasks/task-panel";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";

export type TaskView = "table" | "kanban" | "calendar" | "timeline";

export type OptionsData = {
  members: UserDTO[];
  projects: Pick<ProjectDTO, "id" | "name" | "color" | "status">[];
  tags: TagDTO[];
};

function buildQuery(filters: TaskFilterState, sort: string, dir: string): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status.length > 0) params.set("status", filters.status.join(","));
  if (filters.priority.length > 0) params.set("priority", filters.priority.join(","));
  if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
  if (filters.projectId) params.set("projectId", filters.projectId);
  if (filters.dueFrom) params.set("dueFrom", filters.dueFrom);
  if (filters.dueTo) params.set("dueTo", filters.dueTo);
  if (filters.includeArchived) params.set("includeArchived", "true");
  params.set("sort", sort);
  params.set("dir", dir);
  return params.toString();
}

export function TasksWorkspace({
  initialTasks,
  options,
  initialFilters,
  initialView,
  initialOpenId,
  currentUserId,
}: {
  initialTasks: TaskDTO[];
  options: OptionsData;
  initialFilters: TaskFilterState;
  initialView: TaskView;
  initialOpenId: string | null;
  currentUserId: string;
}) {
  const [tasks, setTasks] = React.useState<TaskDTO[]>(initialTasks);
  const [filters, setFilters] = React.useState<TaskFilterState>(initialFilters);
  const [view, setView] = React.useState<TaskView>(initialView);
  const [sort, setSort] = React.useState<string>("updatedAt");
  const [dir, setDir] = React.useState<"asc" | "desc">("desc");
  const [loading, setLoading] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(initialOpenId);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTask, setEditTask] = React.useState<TaskDTO | null>(null);

  // Sincroniza filtros com a URL (shallow) para deep-links
  const syncUrl = React.useCallback(
    (nextFilters: TaskFilterState, nextView: TaskView, openId: string | null) => {
      const params = new URLSearchParams();
      if (nextView !== "table") params.set("view", nextView);
      if (nextFilters.search) params.set("q", nextFilters.search);
      if (nextFilters.status.length > 0) params.set("status", nextFilters.status.join(","));
      if (nextFilters.priority.length > 0) params.set("priority", nextFilters.priority.join(","));
      if (nextFilters.assigneeId) {
        params.set("assignee", nextFilters.assigneeId === currentUserId ? "me" : nextFilters.assigneeId);
      }
      if (nextFilters.projectId) params.set("project", nextFilters.projectId);
      if (nextFilters.dueFrom) params.set("dueFrom", nextFilters.dueFrom);
      if (nextFilters.dueTo) params.set("dueTo", nextFilters.dueTo);
      if (nextFilters.includeArchived) params.set("archived", "1");
      if (openId) params.set("open", openId);
      const qs = params.toString();
      window.history.replaceState(null, "", `/tasks${qs ? `?${qs}` : ""}`);
    },
    [currentUserId],
  );

  const refresh = React.useCallback(
    async (f: TaskFilterState, s: string, d: string) => {
      setLoading(true);
      try {
        const res = await api.get<{ tasks: TaskDTO[] }>(`/api/tasks?${buildQuery(f, s, d)}`);
        setTasks(res.tasks);
      } catch {
        toast.error("Não foi possível carregar as tarefas.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  function applyFilters(next: TaskFilterState) {
    setFilters(next);
    syncUrl(next, view, selectedId);
    void refresh(next, sort, dir);
  }

  function applyView(next: TaskView) {
    setView(next);
    syncUrl(filters, next, selectedId);
  }

  function applySort(nextSort: string, nextDir: "asc" | "desc") {
    setSort(nextSort);
    setDir(nextDir);
    void refresh(filters, nextSort, nextDir);
  }

  function openTask(id: string | null) {
    setSelectedId(id);
    syncUrl(filters, view, id);
  }

  function handleTaskSaved(updated: TaskDTO) {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === updated.id);
      return exists ? prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)) : [updated, ...prev];
    });
    setEditTask(null);
  }

  async function handleQuickUpdate(id: string, patch: Partial<TaskDTO>) {
    // Atualização otimista
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    try {
      await api.patch(`/api/tasks/${id}`, patch);
    } catch {
      toast.error("Não foi possível salvar a alteração.");
      void refresh(filters, sort, dir);
    }
  }

  async function handleMove(id: string, status: TaskDTO["status"], position: number) {
    const before = tasks;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status, position } : t)),
    );
    try {
      await api.post(`/api/tasks/${id}/move`, { status, position });
    } catch {
      setTasks(before);
      toast.error("Não foi possível mover a tarefa.");
    }
  }

  async function handleArchive(id: string) {
    try {
      await api.post(`/api/tasks/${id}/archive`);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Tarefa arquivada.");
    } catch {
      toast.error("Não foi possível arquivar a tarefa.");
    }
  }

  async function handleRestore(id: string) {
    try {
      await api.post(`/api/tasks/${id}/restore`);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, archived: false } : t)));
      toast.success("Tarefa restaurada.");
    } catch {
      toast.error("Não foi possível restaurar a tarefa.");
    }
  }

  const activeFilterCount = countActiveFilters(filters);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text">Tarefas</h1>
          <p className="mt-0.5 text-sm text-muted">
            {tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"}
            {activeFilterCount > 0 ? ` · ${activeFilterCount} filtro${activeFilterCount > 1 ? "s" : ""} ativo${activeFilterCount > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => applyView(v as TaskView)}>
            <TabsList>
              <TabsTrigger value="table">
                <Table2 className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Lista</span>
              </TabsTrigger>
              <TabsTrigger value="kanban">
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Quadro</span>
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Calendário</span>
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <GanttChartSquare className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Linha do tempo</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Nova tarefa
          </Button>
        </div>
      </div>

      <TaskFiltersBar
        filters={filters}
        options={options}
        onChange={applyFilters}
        onClear={() =>
          applyFilters({ ...EMPTY_FILTERS, includeArchived: filters.includeArchived })
        }
      />

      <div className={cn("relative", loading && "opacity-60 transition-opacity")}>
        {loading && (
          <div className="absolute right-2 top-2 z-10">
            <Spinner />
          </div>
        )}

        {view === "table" && (
          <TaskTable
            tasks={tasks}
            sort={sort}
            dir={dir}
            onSort={applySort}
            onOpenTask={openTask}
            onQuickUpdate={handleQuickUpdate}
            onEdit={(task) => setEditTask(task)}
            onArchive={handleArchive}
            onRestore={handleRestore}
          />
        )}
        {view === "kanban" && (
          <TaskKanban
            tasks={tasks}
            onOpenTask={openTask}
            onMove={handleMove}
          />
        )}
        {view === "calendar" && (
          <TaskCalendar tasks={tasks} onOpenTask={openTask} />
        )}
        {view === "timeline" && (
          <TaskTimeline tasks={tasks} projects={options.projects} onOpenTask={openTask} />
        )}
      </div>

      <TaskPanel
        taskId={selectedId}
        onClose={() => openTask(null)}
        onSaved={handleTaskSaved}
        onEdit={() => {
          const t = tasks.find((x) => x.id === selectedId);
          if (t) setEditTask(t);
        }}
      />

      <TaskFormDialog
        open={createOpen || editTask !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditTask(null);
          }
        }}
        task={editTask}
        onSaved={(saved) => {
          handleTaskSaved(saved);
          void refresh(filters, sort, dir);
        }}
      />
    </div>
  );
}

export function countActiveFilters(filters: TaskFilterState): number {
  let count = 0;
  if (filters.search) count += 1;
  if (filters.status.length > 0) count += 1;
  if (filters.priority.length > 0) count += 1;
  if (filters.assigneeId) count += 1;
  if (filters.projectId) count += 1;
  if (filters.dueFrom) count += 1;
  if (filters.dueTo) count += 1;
  return count;
}
