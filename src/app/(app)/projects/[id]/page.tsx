import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarIcon, ListTodo, Users } from "lucide-react";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertWorkspaceScope } from "@/lib/permissions";
import { listActivity } from "@/lib/activity";
import { formatDateBR, formatRelative } from "@/lib/dates";
import { projectDTO, taskDTO } from "@/lib/serializers";
import { ProjectStatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ProjectDetailActions } from "@/components/projects/project-detail-actions";
import { ProjectTasks } from "@/components/projects/project-tasks";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { id } = await params;

  const raw = await db.project.findUnique({
    where: { id },
    include: {
      owner: true,
      members: { include: { user: true } },
      tasks: {
        where: { archivedAt: null },
        include: {
          assignee: true,
          creator: true,
          project: { select: { id: true, name: true, color: true } },
          tags: { include: { tag: true } },
          _count: { select: { comments: true, subtasks: true } },
        },
        orderBy: [{ position: "asc" }],
      },
    },
  });

  let project;
  try {
    project = assertWorkspaceScope(ctx, raw, "Projeto não encontrado.");
  } catch {
    notFound();
  }

  const activity = await listActivity({
    workspaceId: ctx.workspace.id,
    entityType: "project",
    entityId: project.id,
    limit: 15,
  });

  const dto = projectDTO(project);
  const tasks = project.tasks.map(taskDTO);
  const done = tasks.filter((t) => t.status === "DONE").length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Projetos
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className="mt-2 h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
              aria-hidden
            />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-semibold tracking-tight text-text">{project.name}</h1>
                <ProjectStatusBadge status={project.status} />
                {project.archivedAt && <Badge>Arquivado</Badge>}
              </div>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
                {project.description || "Sem descrição."}
              </p>
            </div>
          </div>
          <ProjectDetailActions
            project={{
              id: project.id,
              name: project.name,
              description: project.description,
              status: project.status,
              color: project.color,
              ownerId: project.ownerId,
              startDate: dto.startDate,
              dueDate: dto.dueDate,
              memberIds: dto.memberIds ?? [],
              archived: dto.archived,
              workspaceId: project.workspaceId,
              createdAt: project.createdAt.toISOString(),
              updatedAt: project.updatedAt.toISOString(),
            }}
          />
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="surface-panel p-4">
          <p className="text-xs text-muted">Progresso</p>
          <p className="mt-1 text-2xl font-semibold text-text">{dto.progress ?? 0}%</p>
          <Progress value={dto.progress ?? 0} color={project.color} className="mt-2" />
        </div>
        <div className="surface-panel p-4">
          <p className="text-xs text-muted">Tarefas</p>
          <p className="mt-1 text-2xl font-semibold text-text">
            {done}/{tasks.length}
          </p>
          <p className="mt-2 text-xs text-muted">concluídas</p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-xs text-muted">Responsável</p>
          <div className="mt-2">
            <span className="inline-flex items-center gap-2">
              <Avatar name={project.owner.name} color={project.owner.avatarColor} size="sm" />
              <span className="text-sm text-text">{project.owner.name}</span>
            </span>
          </div>
        </div>
        <div className="surface-panel p-4">
          <p className="text-xs text-muted">Prazo final</p>
          <p className="mt-1 text-sm font-medium text-text">
            {project.dueDate ? formatDateBR(dto.dueDate) : "Não definido"}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <CalendarIcon className="h-3.5 w-3.5" aria-hidden />
            {project.startDate
              ? `Início: ${formatDateBR(dto.startDate)}`
              : "Sem data de início"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tarefas do projeto */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
              <ListTodo className="h-4 w-4 text-muted" aria-hidden />
              Tarefas do projeto
            </h2>
            <Link href={`/tasks?project=${project.id}`}>
              <span className="text-xs font-medium text-accent hover:underline">
                Ver na visualização de tarefas →
              </span>
            </Link>
          </div>
          <ProjectTasks projectId={project.id} tasks={tasks} />
        </div>

        {/* Lateral: membros + atividade */}
        <div className="space-y-6">
          <div className="surface-panel p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
              <Users className="h-4 w-4 text-muted" aria-hidden />
              Membros
            </h2>
            <ul className="space-y-2.5">
              {project.members.map((m) => (
                <li key={m.id} className="flex items-center gap-2.5">
                  <Avatar name={m.user.name} color={m.user.avatarColor} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-text">{m.user.name}</p>
                    <p className="text-xs text-muted">
                      {m.user.id === project.ownerId ? "Responsável" : "Membro"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="surface-panel p-5">
            <h2 className="mb-3 text-sm font-semibold text-text">Atividade recente</h2>
            {activity.length === 0 ? (
              <p className="text-sm text-muted">Sem atividade registrada.</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((event) => (
                  <li key={event.id} className="flex items-start gap-2.5">
                    <Avatar
                      name={event.actorName}
                      color={event.actor?.avatarColor}
                      size="xs"
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-relaxed text-muted">
                        <span className="font-medium text-text">{event.actorName}</span>{" "}
                        {describeProjectActivity(event.action, event.entityName)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted/70">
                        {formatRelative(event.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function describeProjectActivity(action: string, entityName: string): string {
  const map: Record<string, string> = {
    "project.created": `criou o projeto`,
    "project.updated": `atualizou o projeto`,
    "project.archived": `arquivou o projeto`,
    "project.restored": `restaurou o projeto`,
    "project.member_added": `adicionou ${entityName} ao projeto`,
    "project.member_removed": `removeu ${entityName} do projeto`,
  };
  return map[action] ?? `realizou uma ação (${action})`;
}
