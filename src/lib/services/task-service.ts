/**
 * Serviço de tarefas — regras de negócio (histórico + notificações) usadas
 * pelas rotas de API e pelos testes de integração.
 */
import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth";
import { badRequest, notFound } from "@/lib/errors";
import { assertWorkspaceScope } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { fromDateISO, toISODate, normalize } from "@/lib/services/helpers";
import type { TaskPriority, TaskStatus } from "@prisma/client";

export type TaskCreateInput = {
  title: string;
  description?: string;
  projectId?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: string | null;
  dueDate?: string | null;
  assigneeId?: string | null;
  tagIds?: string[];
};

export type TaskUpdateInput = Partial<TaskCreateInput>;

const TASK_INCLUDE = {
  assignee: true,
  creator: true,
  project: { select: { id: true, name: true, color: true } },
  tags: { include: { tag: true } },
  subtasks: { orderBy: { position: "asc" as const } },
  comments: { include: { author: true }, orderBy: { createdAt: "asc" as const } },
  attachments: { include: { uploader: true }, orderBy: { createdAt: "desc" as const } },
} as const;

export async function loadTaskOrThrow(ctx: AuthContext, taskId: string) {
  const task = await db.task.findUnique({ where: { id: taskId }, include: TASK_INCLUDE });
  return assertWorkspaceScope(ctx, task, "Tarefa não encontrada.");
}

async function assertProjectInWorkspace(ctx: AuthContext, projectId: string | null | undefined) {
  if (!projectId) return null;
  const project = await db.project.findUnique({ where: { id: projectId } });
  assertWorkspaceScope(ctx, project, "Projeto não encontrado.");
  return project;
}

async function assertUserInWorkspace(ctx: AuthContext, userId: string | null | undefined) {
  if (!userId) return null;
  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: ctx.workspace.id, userId } },
    include: { user: true },
  });
  if (!membership || !membership.user.isActive) {
    throw badRequest("Usuário não pertence a este espaço de trabalho.");
  }
  return membership.user;
}

async function assertTagsInWorkspace(ctx: AuthContext, tagIds: string[]) {
  if (tagIds.length === 0) return;
  const count = await db.tag.count({
    where: { id: { in: tagIds }, workspaceId: ctx.workspace.id },
  });
  if (count !== tagIds.length) throw badRequest("Etiqueta inválida.");
}

export async function createTask(ctx: AuthContext, input: TaskCreateInput) {
  const project = await assertProjectInWorkspace(ctx, input.projectId);
  await assertUserInWorkspace(ctx, input.assigneeId);
  if (input.tagIds) await assertTagsInWorkspace(ctx, input.tagIds);

  const last = await db.task.findFirst({
    where: { workspaceId: ctx.workspace.id, status: input.status ?? "TODO" },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const task = await db.task.create({
    data: {
      workspaceId: ctx.workspace.id,
      title: input.title,
      description: input.description ?? "",
      projectId: input.projectId ?? null,
      status: input.status ?? "TODO",
      priority: input.priority ?? "NORMAL",
      startDate: fromDateISO(normalize(input.startDate)),
      dueDate: fromDateISO(normalize(input.dueDate)),
      assigneeId: input.assigneeId ?? null,
      creatorId: ctx.user.id,
      position: (last?.position ?? 0) + 1000,
      ...(input.tagIds && input.tagIds.length > 0
        ? { tags: { create: input.tagIds.map((tagId) => ({ tagId })) } }
        : {}),
    },
    include: TASK_INCLUDE,
  });

  await logActivity({
    workspaceId: ctx.workspace.id,
    actor: { id: ctx.user.id, name: ctx.user.name },
    action: "task.created",
    entityType: "task",
    entityId: task.id,
    entityName: task.title,
    metadata: { projectId: task.projectId, status: task.status, priority: task.priority },
  });

  if (task.assigneeId) {
    await notify({
      workspaceId: ctx.workspace.id,
      recipients: [task.assigneeId],
      actorId: ctx.user.id,
      type: "TASK_ASSIGNED",
      title: `Você foi atribuído à tarefa: ${task.title}`,
      body: project ? `Projeto: ${project.name}` : undefined,
      link: `/tasks?open=${task.id}`,
      taskId: task.id,
      projectId: task.projectId ?? undefined,
    });
  }

  return task;
}

type TaskChange = { field: string; from: unknown; to: unknown };

function diffTask(
  current: {
    title: string;
    description: string;
    projectId: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    startDate: string | null;
    dueDate: string | null;
    assigneeId: string | null;
  },
  input: TaskUpdateInput,
  next: typeof current,
): TaskChange[] {
  const changes: TaskChange[] = [];
  for (const key of Object.keys(next) as (keyof typeof next)[]) {
    if (input[key] !== undefined && current[key] !== next[key]) {
      changes.push({ field: key, from: current[key], to: next[key] });
    }
  }
  return changes;
}

const FIELD_LABELS: Record<string, string> = {
  title: "título",
  description: "descrição",
  projectId: "projeto",
  status: "status",
  priority: "prioridade",
  startDate: "data de início",
  dueDate: "prazo",
  assigneeId: "responsável",
};

export async function updateTask(ctx: AuthContext, taskId: string, input: TaskUpdateInput) {
  const existing = await loadTaskOrThrow(ctx, taskId);

  if (input.projectId !== undefined) await assertProjectInWorkspace(ctx, input.projectId);
  if (input.assigneeId !== undefined && input.assigneeId !== null) {
    await assertUserInWorkspace(ctx, input.assigneeId);
  }
  if (input.tagIds) await assertTagsInWorkspace(ctx, input.tagIds);

  const current = {
    title: existing.title,
    description: existing.description,
    projectId: existing.projectId,
    status: existing.status,
    priority: existing.priority,
    startDate: toISODate(existing.startDate),
    dueDate: toISODate(existing.dueDate),
    assigneeId: existing.assigneeId,
  };

  const next = {
    title: input.title !== undefined ? input.title : current.title,
    description: input.description !== undefined ? input.description : current.description,
    projectId: input.projectId !== undefined ? input.projectId : current.projectId,
    status: input.status !== undefined ? input.status : current.status,
    priority: input.priority !== undefined ? input.priority : current.priority,
    startDate:
      input.startDate !== undefined ? normalize(input.startDate) ?? null : current.startDate,
    dueDate: input.dueDate !== undefined ? normalize(input.dueDate) ?? null : current.dueDate,
    assigneeId: input.assigneeId !== undefined ? input.assigneeId : current.assigneeId,
  };

  const changes = diffTask(current, input, next);

  const updated = await db.task.update({
    where: { id: taskId },
    data: {
      title: next.title,
      description: next.description,
      projectId: next.projectId,
      status: next.status,
      priority: next.priority,
      startDate: fromDateISO(next.startDate),
      dueDate: fromDateISO(next.dueDate),
      assigneeId: next.assigneeId,
      ...(input.tagIds
        ? {
            tags: {
              deleteMany: {},
              create: input.tagIds.map((tagId) => ({ tagId })),
            },
          }
        : {}),
    },
    include: TASK_INCLUDE,
  });

  if (changes.length > 0) {
    await logActivity({
      workspaceId: ctx.workspace.id,
      actor: { id: ctx.user.id, name: ctx.user.name },
      action: changes.length === 1 ? `task.${changes[0]!.field}_changed` : "task.updated",
      entityType: "task",
      entityId: taskId,
      entityName: updated.title,
      metadata: { changes },
    });

    // Notificações: atribuição e mudanças relevantes em tarefa atribuída
    const recipients = new Set<string>();
    if (next.assigneeId) recipients.add(next.assigneeId);
    if (current.assigneeId && current.assigneeId !== next.assigneeId) {
      recipients.add(current.assigneeId);
    }
    if (existing.creatorId) recipients.add(existing.creatorId);

    const relevant = changes.filter((c) =>
      ["status", "priority", "dueDate", "title"].includes(c.field),
    );
    if (changes.some((c) => c.field === "assigneeId") && next.assigneeId) {
      await notify({
        workspaceId: ctx.workspace.id,
        recipients: [next.assigneeId],
        actorId: ctx.user.id,
        type: "TASK_ASSIGNED",
        title: `Você foi atribuído à tarefa: ${updated.title}`,
        link: `/tasks?open=${taskId}`,
        taskId,
        projectId: updated.projectId ?? undefined,
      });
    }
    if (relevant.length > 0 && recipients.size > 0) {
      const parts = relevant.map((c) => `${FIELD_LABELS[c.field] ?? c.field}: ${String(c.from)} → ${String(c.to)}`);
      await notify({
        workspaceId: ctx.workspace.id,
        recipients: [...recipients],
        actorId: ctx.user.id,
        type: "TASK_STATUS_CHANGED",
        title: `Tarefa atualizada: ${updated.title}`,
        body: parts.join(" · "),
        link: `/tasks?open=${taskId}`,
        taskId,
        projectId: updated.projectId ?? undefined,
      });
    }
  }

  return updated;
}

export async function moveTask(
  ctx: AuthContext,
  taskId: string,
  input: { status?: TaskStatus; position?: number },
) {
  const existing = await loadTaskOrThrow(ctx, taskId);
  const changes: TaskChange[] = [];

  if (input.status !== undefined && input.status !== existing.status) {
    changes.push({ field: "status", from: existing.status, to: input.status });
  }

  const updated = await db.task.update({
    where: { id: taskId },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
    },
    include: TASK_INCLUDE,
  });

  if (changes.length > 0) {
    await logActivity({
      workspaceId: ctx.workspace.id,
      actor: { id: ctx.user.id, name: ctx.user.name },
      action: "task.status_changed",
      entityType: "task",
      entityId: taskId,
      entityName: updated.title,
      metadata: { changes },
    });

    const recipients = [updated.assigneeId, updated.creatorId].filter(
      (id): id is string => Boolean(id),
    );
    await notify({
      workspaceId: ctx.workspace.id,
      recipients,
      actorId: ctx.user.id,
      type: "TASK_STATUS_CHANGED",
      title: `Status alterado: ${updated.title}`,
      body: `${String(changes[0]!.from)} → ${String(changes[0]!.to)}`,
      link: `/tasks?open=${taskId}`,
      taskId,
      projectId: updated.projectId ?? undefined,
    });
  }

  return updated;
}

export async function setTaskArchived(ctx: AuthContext, taskId: string, archived: boolean) {
  const existing = await loadTaskOrThrow(ctx, taskId);
  const updated = await db.task.update({
    where: { id: taskId },
    data: { archivedAt: archived ? new Date() : null },
    include: TASK_INCLUDE,
  });
  await logActivity({
    workspaceId: ctx.workspace.id,
    actor: { id: ctx.user.id, name: ctx.user.name },
    action: archived ? "task.archived" : "task.restored",
    entityType: "task",
    entityId: taskId,
    entityName: existing.title,
  });
  return updated;
}

export async function deleteTaskPermanent(ctx: AuthContext, taskId: string) {
  const existing = await loadTaskOrThrow(ctx, taskId);
  await db.task.delete({ where: { id: taskId } });
  await logActivity({
    workspaceId: ctx.workspace.id,
    actor: { id: ctx.user.id, name: ctx.user.name },
    action: "task.deleted",
    entityType: "task",
    entityId: taskId,
    entityName: existing.title,
  });
}

export function requireFound<T>(value: T | null, message: string): T {
  if (value === null) throw notFound(message);
  return value;
}
