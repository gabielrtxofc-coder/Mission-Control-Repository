"use client";

import * as React from "react";
import { Check, Filter, Search, X } from "lucide-react";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_PRIORITY_META,
  TASK_STATUS_META,
} from "@/lib/constants";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { OptionsData } from "@/components/tasks/tasks-workspace";
import { cn } from "@/lib/utils";

export type TaskFilterState = {
  search: string;
  status: TaskStatus[];
  priority: TaskPriority[];
  assigneeId: string;
  projectId: string;
  dueFrom: string;
  dueTo: string;
  includeArchived: boolean;
};

export const EMPTY_FILTERS: TaskFilterState = {
  search: "",
  status: [],
  priority: [],
  assigneeId: "",
  projectId: "",
  dueFrom: "",
  dueTo: "",
  includeArchived: false,
};

function MultiSelect({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: string[];
  options: { value: string; label: string; dot?: React.ReactNode }[];
  onChange: (next: string[]) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors",
            values.length > 0
              ? "border-accent/50 bg-accent-soft text-accent"
              : "border-border bg-surface-2 text-muted hover:border-border-strong hover:text-text",
          )}
        >
          <Filter className="h-3.5 w-3.5" aria-hidden />
          {label}
          {values.length > 0 && (
            <Badge variant="accent" className="ml-0.5 px-1.5 py-0">
              {values.length}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-2">
        <div className="space-y-1">
          {options.map((option) => {
            const checked = values.includes(option.value);
            return (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-text hover:bg-surface-3"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() =>
                    onChange(
                      checked
                        ? values.filter((v) => v !== option.value)
                        : [...values, option.value],
                    )
                  }
                />
                {option.dot}
                <span className="flex-1">{option.label}</span>
                {checked && <Check className="h-3.5 w-3.5 text-accent" aria-hidden />}
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TaskFiltersBar({
  filters,
  options,
  onChange,
  onClear,
}: {
  filters: TaskFilterState;
  options: OptionsData;
  onChange: (next: TaskFilterState) => void;
  onClear: () => void;
}) {
  const [search, setSearch] = React.useState(filters.search);

  // Debounce da busca
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== filters.search) onChange({ ...filters, search });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const hasActive =
    filters.search ||
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    filters.assigneeId ||
    filters.projectId ||
    filters.dueFrom ||
    filters.dueTo;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou descrição…"
            className="pl-9"
            aria-label="Buscar tarefas"
          />
        </div>

        <MultiSelect
          label="Status"
          values={filters.status}
          options={TASK_STATUSES.map((s) => ({
            value: s,
            label: TASK_STATUS_META[s].label,
            dot: <span className={cn("h-2 w-2 rounded-full", TASK_STATUS_META[s].dot)} />,
          }))}
          onChange={(next) =>
            onChange({ ...filters, status: next as TaskStatus[] })
          }
        />

        <MultiSelect
          label="Prioridade"
          values={filters.priority}
          options={TASK_PRIORITIES.map((p) => ({
            value: p,
            label: TASK_PRIORITY_META[p].label,
          }))}
          onChange={(next) =>
            onChange({ ...filters, priority: next as TaskPriority[] })
          }
        />

        <select
          value={filters.assigneeId}
          onChange={(e) => onChange({ ...filters, assigneeId: e.target.value })}
          className="input-base h-9 w-auto cursor-pointer py-0 text-sm"
          aria-label="Filtrar por responsável"
        >
          <option value="">Responsável: todos</option>
          <option value="__none__">Sem responsável</option>
          {options.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <select
          value={filters.projectId}
          onChange={(e) => onChange({ ...filters, projectId: e.target.value })}
          className="input-base h-9 w-auto cursor-pointer py-0 text-sm"
          aria-label="Filtrar por projeto"
        >
          <option value="">Projeto: todos</option>
          {options.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={filters.dueFrom}
            onChange={(e) => onChange({ ...filters, dueFrom: e.target.value })}
            className="h-9 w-[150px] py-0 text-sm"
            aria-label="Prazo a partir de"
          />
          <span className="text-xs text-muted">até</span>
          <Input
            type="date"
            value={filters.dueTo}
            onChange={(e) => onChange({ ...filters, dueTo: e.target.value })}
            className="h-9 w-[150px] py-0 text-sm"
            aria-label="Prazo até"
          />
        </div>

        {hasActive && (
          <Button variant="ghost" size="sm" onClick={onClear} className="text-muted">
            <X className="h-3.5 w-3.5" aria-hidden />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
