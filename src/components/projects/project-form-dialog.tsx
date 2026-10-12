"use client";

import * as React from "react";
import { toast } from "sonner";
import { projectCreateSchema, projectUpdateSchema } from "@/lib/validators";
import type { ProjectStatus } from "@prisma/client";
import { PROJECT_STATUSES, PROJECT_STATUS_META, PROJECT_COLORS } from "@/lib/constants";
import { Dialog, DialogContent, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select, FieldError } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar } from "@/components/ui/avatar";
import { api, ClientApiError } from "@/lib/client-api";
import { useOptions } from "@/components/shared/use-options";
import type { ProjectDTO } from "@/lib/serializers";
import { cn } from "@/lib/utils";

export type ProjectFormValues = {
  name: string;
  description: string;
  status: ProjectStatus;
  color: string;
  startDate: string;
  dueDate: string;
  ownerId: string;
  memberIds: string[];
};

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSaved,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectDTO | null;
  onSaved?: (project: ProjectDTO) => void;
  currentUserId?: string;
}) {
  const options = useOptions(open);
  const [values, setValues] = React.useState<ProjectFormValues>({
    name: "",
    description: "",
    status: "PLANNING",
    color: PROJECT_COLORS[0],
    startDate: "",
    dueDate: "",
    ownerId: currentUserId ?? "",
    memberIds: [],
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  // Reset síncrono na abertura (evita corrida com digitação do usuário)
  const [prevOpen, setPrevOpen] = React.useState(open);
  const [prevProjectId, setPrevProjectId] = React.useState(project?.id ?? null);
  if (open !== prevOpen || (project?.id ?? null) !== prevProjectId) {
    setPrevOpen(open);
    setPrevProjectId(project?.id ?? null);
    if (open) {
      setErrors({});
      if (project) {
        setValues({
          name: project.name,
          description: project.description,
          status: project.status,
          color: project.color,
          startDate: project.startDate ?? "",
          dueDate: project.dueDate ?? "",
          ownerId: project.ownerId,
          memberIds: project.memberIds ?? [],
        });
      } else {
        setValues({
          name: "",
          description: "",
          status: "PLANNING",
          color: PROJECT_COLORS[0]!,
          startDate: "",
          dueDate: "",
          ownerId: currentUserId ?? "",
          memberIds: currentUserId ? [currentUserId] : [],
        });
      }
    }
  }

  function set<K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMember(userId: string) {
    setValues((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(userId)
        ? prev.memberIds.filter((id) => id !== userId)
        : [...prev.memberIds, userId],
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      name: values.name.trim(),
      description: values.description.trim(),
      status: values.status,
      color: values.color,
      startDate: values.startDate || null,
      dueDate: values.dueDate || null,
      ownerId: values.ownerId || undefined,
      memberIds: values.memberIds,
    };

    const schema = project ? projectUpdateSchema : projectCreateSchema;
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
      const saved = project
        ? await api.patch<{ project: ProjectDTO }>(`/api/projects/${project.id}`, parsed.data)
        : await api.post<{ project: ProjectDTO }>("/api/projects", parsed.data);
      toast.success(project ? "Projeto atualizado." : "Projeto criado.");
      onSaved?.(saved.project);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ClientApiError) {
        toast.error(error.message);
      } else {
        toast.error("Não foi possível salvar o projeto.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={project ? "Editar projeto" : "Novo projeto"}
        description={
          project ? "Atualize as informações do projeto." : "Defina o essencial para começar."
        }
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <Label htmlFor="project-name">Nome *</Label>
            <Input
              id="project-name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex.: Lançamento do produto"
              aria-invalid={Boolean(errors.name)}
              autoFocus
            />
            <FieldError message={errors.name} />
          </div>

          <div>
            <Label htmlFor="project-description">Descrição</Label>
            <Textarea
              id="project-description"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Objetivo, escopo e contexto do projeto"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="project-status">Status</Label>
              <Select
                id="project-status"
                value={values.status}
                onChange={(e) => set("status", e.target.value as ProjectStatus)}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_META[s].label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="project-owner">Responsável</Label>
              <Select
                id="project-owner"
                value={values.ownerId}
                onChange={(e) => set("ownerId", e.target.value)}
              >
                <option value="">Selecione…</option>
                {options.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.ownerId} />
            </div>
            <div>
              <Label htmlFor="project-start">Data de início</Label>
              <Input
                id="project-start"
                type="date"
                value={values.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
              <FieldError message={errors.startDate} />
            </div>
            <div>
              <Label htmlFor="project-due">Prazo final</Label>
              <Input
                id="project-due"
                type="date"
                value={values.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
              <FieldError message={errors.dueDate} />
            </div>
          </div>

          <div>
            <Label>Cor de identificação</Label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => set("color", color)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                    values.color === color ? "border-text" : "border-transparent",
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Cor ${color}`}
                  aria-pressed={values.color === color}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>Membros do projeto</Label>
            <div className="space-y-2 rounded-md border border-border bg-surface-2 p-3">
              {options.members.length === 0 ? (
                <p className="text-xs text-muted">Carregando membros…</p>
              ) : (
                options.members.map((member) => (
                  <label
                    key={member.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-sm px-1 py-1 hover:bg-surface-3"
                  >
                    <Checkbox
                      checked={values.memberIds.includes(member.id)}
                      onCheckedChange={() => toggleMember(member.id)}
                    />
                    <Avatar name={member.name} color={member.avatarColor} size="sm" />
                    <span className="text-sm text-text">{member.name}</span>
                  </label>
                ))
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
              {project ? "Salvar alterações" : "Criar projeto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
