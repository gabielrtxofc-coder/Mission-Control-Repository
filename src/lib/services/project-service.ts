/**
 * Serviço de projetos — criação, atualização, arquivamento e membros.
 */
import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth";
import type { ProjectStatus } from "@prisma/client";
import { badRequest, conflict, notFound } from "@/lib/errors";
import { assertWorkspaceScope } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { fromDateISO, normalize } from "@/lib/services/helpers";

export type ProjectCreateInput = {
  name: string;
  description?: string;
  status?: ProjectStatus;
  color?: string;
  startDate?: string | null;
  dueDate?: string | null;
  ownerId?: string;
  memberIds?: string[];
};

export type ProjectUpdateInput = Partial<ProjectCreateInput>;

const PROJECT_INCLUDE = {
  owner: true,
  members: { include: { user: true } },
  _count: { select: { tasks: { where: { archivedAt: null } } } },
} as const;

export async function loadProjectOrThrow(ctx: AuthContext, projectId: string) {
  const project = await db.project.findUnique({ where: { id: projectId }, include: PROJECT_INCLUDE });
  return assertWorkspaceScope(ctx, project, "Projeto não encontrado.");
}

async function assertMembersInWorkspace(ctx: AuthContext, userIds: string[]) {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return;
  const count = await db.workspaceMember.count({
    where: { workspaceId: ctx.workspace.id, userId: { in: unique }, user: { isActive: true } },
  });
  if (count !== unique.length) {
    throw badRequest("Um ou mais membros não pertencem a este espaço de trabalho.");
  }
}

export async function createProject(ctx: AuthContext, input: ProjectCreateInput) {
  const ownerId = input.ownerId ?? ctx.user.id;
  await assertMembersInWorkspace(ctx, [ownerId, ...(input.memberIds ?? [])]);
  if (input.startDate && input.dueDate && input.startDate > input.dueDate) {
    throw badRequest("A data de início não pode ser posterior ao prazo final.");
  }

  const project = await db.project.create({
    data: {
      workspaceId: ctx.workspace.id,
      name: input.name,
      description: input.description ?? "",
      status: input.status ?? "PLANNING",
      color: input.color ?? "#A3E635",
      ownerId,
      startDate: fromDateISO(normalize(input.startDate)),
      dueDate: fromDateISO(normalize(input.dueDate)),
      members: {
        create: [...new Set([ownerId, ...(input.memberIds ?? [])])].map((userId) => ({ userId })),
      },
    },
    include: PROJECT_INCLUDE,
  });

  await logActivity({
    workspaceId: ctx.workspace.id,
    actor: { id: ctx.user.id, name: ctx.user.name },
    action: "project.created",
    entityType: "project",
    entityId: project.id,
    entityName: project.name,
    metadata: { status: project.status },
  });

  await notify({
    workspaceId: ctx.workspace.id,
    recipients: project.members.map((m) => m.userId),
    actorId: ctx.user.id,
    type: "PROJECT_CREATED",
    title: `Novo projeto: ${project.name}`,
    link: `/projects/${project.id}`,
    projectId: project.id,
  });

  return project;
}

export async function updateProject(ctx: AuthContext, projectId: string, input: ProjectUpdateInput) {
  const existing = await loadProjectOrThrow(ctx, projectId);
  const memberIds =
    input.memberIds !== undefined
      ? [...new Set([input.ownerId ?? existing.ownerId, ...input.memberIds])]
      : input.ownerId !== undefined
        ? [...new Set([input.ownerId, ...existing.members.map((m) => m.userId)])]
        : undefined;

  if (memberIds) await assertMembersInWorkspace(ctx, memberIds);
  if (input.ownerId) await assertMembersInWorkspace(ctx, [input.ownerId]);

  const startDate =
    input.startDate !== undefined
      ? normalize(input.startDate)
      : normalize(existing.startDate ? existing.startDate.toISOString().slice(0, 10) : null);
  const dueDate =
    input.dueDate !== undefined
      ? normalize(input.dueDate)
      : normalize(existing.dueDate ? existing.dueDate.toISOString().slice(0, 10) : null);
  if (startDate && dueDate && startDate > dueDate) {
    throw badRequest("A data de início não pode ser posterior ao prazo final.");
  }

  const updated = await db.project.update({
    where: { id: projectId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.ownerId !== undefined ? { ownerId: input.ownerId } : {}),
      startDate: fromDateISO(startDate),
      dueDate: fromDateISO(dueDate),
      ...(memberIds
        ? {
            members: {
              deleteMany: { userId: { notIn: memberIds } },
              upsert: memberIds.map((userId) => ({
                where: { projectId_userId: { projectId, userId } },
                create: { userId },
                update: {},
              })),
            },
          }
        : {}),
    },
    include: PROJECT_INCLUDE,
  });

  await logActivity({
    workspaceId: ctx.workspace.id,
    actor: { id: ctx.user.id, name: ctx.user.name },
    action: "project.updated",
    entityType: "project",
    entityId: projectId,
    entityName: updated.name,
    metadata: {
      changes: Object.keys(input).filter((k) => (input as Record<string, unknown>)[k] !== undefined),
    },
  });

  return updated;
}

export async function setProjectArchived(ctx: AuthContext, projectId: string, archived: boolean) {
  const existing = await loadProjectOrThrow(ctx, projectId);
  if (!archived && existing.archivedAt === null) throw conflict("O projeto não está arquivado.");
  const updated = await db.project.update({
    where: { id: projectId },
    data: { archivedAt: archived ? new Date() : null },
    include: PROJECT_INCLUDE,
  });
  await logActivity({
    workspaceId: ctx.workspace.id,
    actor: { id: ctx.user.id, name: ctx.user.name },
    action: archived ? "project.archived" : "project.restored",
    entityType: "project",
    entityId: projectId,
    entityName: existing.name,
  });
  return updated;
}

export async function addProjectMember(ctx: AuthContext, projectId: string, userId: string) {
  await loadProjectOrThrow(ctx, projectId);
  await assertMembersInWorkspace(ctx, [userId]);
  const existing = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (existing) throw conflict("Este usuário já é membro do projeto.");

  const member = await db.projectMember.create({
    data: { projectId, userId },
    include: { user: true },
  });
  await logActivity({
    workspaceId: ctx.workspace.id,
    actor: { id: ctx.user.id, name: ctx.user.name },
    action: "project.member_added",
    entityType: "project",
    entityId: projectId,
    entityName: member.user.name,
    metadata: { userId },
  });
  return member;
}

export async function removeProjectMember(ctx: AuthContext, projectId: string, userId: string) {
  const project = await loadProjectOrThrow(ctx, projectId);
  if (project.ownerId === userId) {
    throw badRequest("O responsável pelo projeto não pode ser removido. Transfira a propriedade antes.");
  }
  const deleted = await db.projectMember.deleteMany({ where: { projectId, userId } });
  if (deleted.count === 0) throw notFound("Membro não encontrado no projeto.");
  await logActivity({
    workspaceId: ctx.workspace.id,
    actor: { id: ctx.user.id, name: ctx.user.name },
    action: "project.member_removed",
    entityType: "project",
    entityId: projectId,
    entityName: project.name,
    metadata: { userId },
  });
}
