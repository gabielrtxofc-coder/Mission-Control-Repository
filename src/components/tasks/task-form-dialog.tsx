"use client";

import * as React from "react";
import { toast } from "sonner";
import { taskCreateSchema, taskUpdateSchema } from "@/lib/validators";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import { TASK_PRIORITIES, TASK_STATUSES, TASK_PRIORITY_META, TASK_STATUS_META } from "@/lib/constants";
import { Dialog, DialogContent, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select, FieldError } from "@/components/ui/input";
import { TagChip } from "@/components/ui/badge";
import { api, ClientApiError } from "@/lib/client-api";
import { useOptions } from "@/components/shared/use-options";
import type { TaskDTO } from "@/lib/serializers";

export type TaskFormValues = {
  title: string;
  description: string;
  projectId: string | null;
  assigneeId: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string;
  dueDate: string;
  tagIds: string[];
};

const EMPTY: TaskFormValues = {
  title: "",
  description: "",
  projectId: null,
  assigneeId: null,
  status: "TODO",
  priority: "NORMAL",
  startDate: "",
  dueDate: "",
  tagIds: [],
};

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  defaults,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se presente, modo edição. */
  task?: TaskDTO | null;
  /** Valores iniciais no modo criação (ex.: projeto pré-selecionado). */
  defaults?: Partial<TaskFormValues>;
  onSaved?: (task: TaskDTO) => void;
}) {
  const options = useOptions(open);
  const [values, setValues] = React.useState<TaskFormValues>(EMPTY);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  // Reset síncrono na abertura (evita corrida com digitação do usuário)
  const [prevOpen, setPrevOpen] = React.useState(open);
  const [prevTaskId, setPrevTaskId] = React.useState(task?.id ?? null);
  if (open !== prevOpen || (task?.id ?? null) !== prevTaskId) {
    setPrevOpen(open);
    setPrevTaskId(task?.id ?? null);
    if (open) {
      setErrors({});
      if (task) {
        setValues({
          title: task.title,
          description: task.description,
          projectId: task.projectId,
          assigneeId: task.assigneeId,
          status: task.status,
          priority: task.priority,
          startDate: task.startDate ?? "",
          dueDate: task.dueDate ?? "",
          tagIds: task.tags?.map((t) => t.id) ?? [],
        });
      } else {
        setValues({ ...EMPTY, ...defaults, tagIds: defaults?.tagIds ?? [] });
      }
    }
  }

  function set<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      projectId: values.projectId,
      assigneeId: values.assigneeId,
      status: values.status,
      priority: values.priority,
      startDate: values.startDate || null,
      dueDate: values.dueDate || null,
      tagIds: values.tagIds,
    };

    const schema = task ? taskUpdateSchema : taskCreateSchema;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      const saved = task
        ? await api.patch<{ task: TaskDTO }>(`/api/tasks/${task.id}`, parsed.data)
        : await api.post<{ task: TaskDTO }>("/api/tasks", parsed.data);
      toast.success(task ? "Tarefa atualizada." : "Tarefa criada.");
      onSaved?.(saved.task);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ClientApiError) {
        toast.error(error.message);
        if (error.details && typeof error.details === "object") {
          setErrors(
            Object.fromEntries(
              Object.entries((error.details as { fieldErrors?: Record<string, string[]> }).fieldErrors ?? {})
                .map(([k, v]) => [k, v?.[0] ?? "Inválido."]),
            ),
          );
        }
      } else {
        toast.error("Não foi possível salvar a tarefa.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={task ? "Editar tarefa" : "Nova tarefa"}
        description={task ? "Atualize os detalhes da tarefa." : "Preencha os dados da nova tarefa."}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <Label htmlFor="task-title">Título *</Label>
            <Input
              id="task-title"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="O que precisa ser feito?"
              aria-invalid={Boolean(errors.title)}
              autoFocus
            />
            <FieldError message={errors.title} />
          </div>

          <div>
            <Label htmlFor="task-description">Descrição</Label>
            <Textarea
              id="task-description"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Contexto, critérios de aceite, links…"
              rows={4}
            />
            <FieldError message={errors.description} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="task-project">Projeto</Label>
              <Select
                id="task-project"
                value={values.projectId ?? ""}
                onChange={(e) => set("projectId", e.target.value || null)}
              >
                <option value="">Sem projeto</option>
                {options.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="task-assignee">Responsável</Label>
              <Select
                id="task-assignee"
                value={values.assigneeId ?? ""}
                onChange={(e) => set("assigneeId", e.target.value || null)}
              >
                <option value="">Não atribuída</option>
                {options.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.assigneeId} />
            </div>
            <div>
              <Label htmlFor="task-status">Status</Label>
              <Select
                id="task-status"
                value={values.status}
                onChange={(e) => set("status", e.target.value as TaskStatus)}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TASK_STATUS_META[s].label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="task-priority">Prioridade</Label>
              <Select
                id="task-priority"
                value={values.priority}
                onChange={(e) => set("priority", e.target.value as TaskPriority)}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {TASK_PRIORITY_META[p].label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="task-start">Data de início</Label>
              <Input
                id="task-start"
                type="date"
                value={values.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
              <FieldError message={errors.startDate} />
            </div>
            <div>
              <Label htmlFor="task-due">Prazo</Label>
              <Input
                id="task-due"
                type="date"
                value={values.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
              <FieldError message={errors.dueDate} />
            </div>
          </div>

          <div>
            <Label>Etiquetas</Label>
            <div className="flex flex-wrap items-center gap-2">
              {options.tags.length === 0 ? (
                <p className="text-xs text-muted">Nenhuma etiqueta criada nas configurações.</p>
              ) : (
                options.tags.map((tag) => {
                  const selected = values.tagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() =>
                        set(
                          "tagIds",
                          selected
                            ? values.tagIds.filter((id) => id !== tag.id)
                            : [...values.tagIds, tag.id],
                        )
                      }
                      className="rounded-full"
                      aria-pressed={selected}
                    >
                      <TagChip
                        name={tag.name}
                        color={selected ? tag.color : "#8B94A3"}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="primary" loading={saving}>
              {task ? "Salvar alterações" : "Criar tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
