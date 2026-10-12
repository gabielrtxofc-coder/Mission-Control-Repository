/**
 * Registro de atividade (auditoria). Imutável pela interface.
 * Ações seguem o padrão `entidade.ação` (ex.: task.status_changed).
 */
import { db } from "@/lib/db";

export type ActivityInput = {
  workspaceId: string;
  actor: { id: string; name: string };
  action: string;
  entityType: "task" | "project" | "comment" | "subtask" | "member" | "workspace" | "attachment";
  entityId: string;
  entityName: string;
  metadata?: Record<string, unknown>;
};

export async function logActivity(input: ActivityInput) {
  return db.activityEvent.create({
    data: {
      workspaceId: input.workspaceId,
      actorId: input.actor.id,
      actorName: input.actor.name,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityName: input.entityName,
      metadata: (input.metadata ?? {}) as object,
    },
  });
}

export async function listActivity(params: {
  workspaceId: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
}) {
  return db.activityEvent.findMany({
    where: {
      workspaceId: params.workspaceId,
      ...(params.entityType ? { entityType: params.entityType } : {}),
      ...(params.entityId ? { entityId: params.entityId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 20,
    include: {
      actor: { select: { id: true, name: true, avatarColor: true } },
    },
  });
}
