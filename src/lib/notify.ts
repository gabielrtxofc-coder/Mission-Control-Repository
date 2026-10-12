/**
 * Central de notificações — criação e leitura de eventos para destinatários.
 * As notificações são persistentes, no banco, associadas ao usuário e workspace.
 */
import type { NotificationType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { todayISO, fromDateISO, addDaysISO } from "@/lib/dates";

export type NotifyInput = {
  workspaceId: string;
  recipients: string[];
  actorId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  taskId?: string;
  projectId?: string;
};

export async function notify(input: NotifyInput) {
  const recipients = [...new Set(input.recipients)].filter((id) => id !== input.actorId);
  if (recipients.length === 0) return [];

  return db.notification.createMany({
    data: recipients.map((userId) => ({
      workspaceId: input.workspaceId,
      userId,
      actorId: input.actorId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      taskId: input.taskId ?? null,
      projectId: input.projectId ?? null,
    })),
  });
}

/**
 * Materializa notificações de prazo próximo/atrasado (máx. 1 por tarefa).
 * Executada de forma oportunista ao carregar o dashboard/central.
 */
export async function sweepDueSoon(workspaceId: string, actorId: string) {
  const today = todayISO();
  const horizon = addDaysISO(today, 2);
  const tasks = await db.task.findMany({
    where: {
      workspaceId,
      archivedAt: null,
      status: { not: "DONE" },
      dueDate: {
        not: null,
        lte: fromDateISO(horizon)!,
      },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      assigneeId: true,
      creatorId: true,
      projectId: true,
    },
    take: 100,
  });

  for (const task of tasks) {
    const existing = await db.notification.findFirst({
      where: { taskId: task.id, type: "TASK_DUE_SOON" },
      select: { id: true },
    });
    if (existing) continue;

    const due = task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null;
    const overdue = due !== null && due < today;
    const recipients = [task.assigneeId, task.creatorId].filter((id): id is string => Boolean(id));
    await notify({
      workspaceId,
      recipients,
      actorId,
      type: "TASK_DUE_SOON",
      title: overdue ? `Tarefa atrasada: ${task.title}` : `Prazo próximo: ${task.title}`,
      body: overdue
        ? `O prazo era ${due}. Priorize ou reagende a tarefa.`
        : `O prazo é ${due}.`,
      link: `/tasks?open=${task.id}`,
      taskId: task.id,
      projectId: task.projectId ?? undefined,
    });
  }
}

export async function unreadCount(userId: string, workspaceId: string) {
  return db.notification.count({
    where: { userId, workspaceId, readAt: null },
  });
}

export function notificationWhere(userId: string, workspaceId: string): Prisma.NotificationWhereInput {
  return { userId, workspaceId };
}
