"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  FolderKanban,
  MoreHorizontal,
  Pencil,
  Plus,
} from "lucide-react";
import type { ProjectStatus } from "@prisma/client";
import { PROJECT_STATUSES, PROJECT_STATUS_META } from "@/lib/constants";
import { formatDateBR } from "@/lib/dates";
import { Badge, ProjectStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { api } from "@/lib/client-api";
import Link from "next/link";
import type { ProjectDTO } from "@/lib/serializers";
import { cn } from "@/lib/utils";

export function ProjectsList({
  initialProjects,
  currentUserId,
}: {
  initialProjects: ProjectDTO[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [projects, setProjects] = React.useState(initialProjects);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<"" | ProjectStatus | "ARCHIVED">("");
  const [showArchived, setShowArchived] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editProject, setEditProject] = React.useState<ProjectDTO | null>(null);

  React.useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  const filtered = projects.filter((p) => {
    if (!showArchived && p.archived) return false;
    if (showArchived && !p.archived) return false;
    if (status === "ARCHIVED" && !p.archived) return false;
    if (status && status !== "ARCHIVED" && p.status !== status) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function archive(project: ProjectDTO) {
    try {
      if (project.archived) {
        await api.post(`/api/projects/${project.id}/restore`);
        toast.success("Projeto restaurado.");
      } else {
        await api.post(`/api/projects/${project.id}/archive`);
        toast.success("Projeto arquivado.");
      }
      router.refresh();
    } catch {
      toast.error("Não foi possível concluir a operação.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text">Projetos</h1>
          <p className="mt-0.5 text-sm text-muted">
            {projects.filter((p) => !p.archived).length} projetos ativos
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditProject(null);
            setCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Novo projeto
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar projeto…"
          className="max-w-xs"
          aria-label="Buscar projeto"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="w-auto"
          aria-label="Filtrar por status"
        >
          <option value="">Todos os status</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_META[s].label}
            </option>
          ))}
          <option value="ARCHIVED">Arquivados</option>
        </Select>
        <label className="ml-2 flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => {
              setShowArchived(e.target.checked);
              if (e.target.checked) setStatus("ARCHIVED");
              else setStatus("");
            }}
            className="h-4 w-4 rounded border-border-strong bg-surface-2 accent-[#A3E635]"
          />
          Mostrar arquivados
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={showArchived ? "Nenhum projeto arquivado" : "Nenhum projeto encontrado"}
          description={
            showArchived
              ? "Projetos arquivados ficam guardados aqui e podem ser restaurados."
              : "Crie um projeto para organizar as tarefas da equipe."
          }
          action={
            !showArchived ? (
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                Criar projeto
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className={cn(
                "surface-panel group flex flex-col gap-4 p-5 transition-colors hover:border-border-strong",
                project.archived && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span
                    className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-text group-hover:text-accent">
                      {project.name}
                    </h2>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                      {project.description || "Sem descrição"}
                    </p>
                  </div>
                </div>
                <div onClick={(e) => e.preventDefault()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Ações de ${project.name}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => {
                          setEditProject(project);
                          setCreateOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted" aria-hidden />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => void archive(project)}>
                        {project.archived ? (
                          <>
                            <ArchiveRestore className="h-3.5 w-3.5 text-muted" aria-hidden />
                            Restaurar
                          </>
                        ) : (
                          <>
                            <Archive className="h-3.5 w-3.5 text-muted" aria-hidden />
                            Arquivar
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ProjectStatusBadge status={project.status} />
                {project.archived && <Badge>Arquivado</Badge>}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
                  <span>Progresso</span>
                  <span>
                    {project.doneTaskCount}/{project.taskCount} tarefas · {project.progress}%
                  </span>
                </div>
                <Progress value={project.progress ?? 0} color={project.color} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex -space-x-1.5">
                  {(project.members ?? []).slice(0, 4).map((m) => (
                    <Avatar key={m.id} name={m.name} color={m.avatarColor} size="xs" />
                  ))}
                </div>
                <span className="text-xs text-muted">
                  {project.dueDate
                    ? `Prazo: ${formatDateBR(project.dueDate)}`
                    : "Sem prazo definido"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <ProjectFormDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setEditProject(null);
        }}
        project={editProject}
        currentUserId={currentUserId}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
