import { apiHandler, ok, noContent } from "@/lib/api";
import { subtaskUpdateSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { assertWorkspaceScope } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { subtaskDTO } from "@/lib/serializers";
import type { AuthContext } from "@/lib/auth";

async function loadSubtask(ctx: AuthContext, id: string) {
  const subtask = await db.subtask.findUnique({
    where: { id },
    include: { task: true },
  });
  if (!subtask) throw notFound("Subtarefa não encontrada.");
  assertWorkspaceScope(ctx, subtask.task, "Subtarefa não encontrada.");
  return subtask;
}

export const PATCH = apiHandler<{ id: string }>(async ({ ctx, params, body }) => {
  const subtask = await loadSubtask(ctx, params.id);
  const data = await body(subtaskUpdateSchema);

  const updated = await db.subtask.update({
    where: { id: subtask.id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.done !== undefined
        ? { done: data.done, completedAt: data.done ? new Date() : null }
        : {}),
    },
  });

  if (data.done !== undefined && data.done !== subtask.done) {
    await logActivity({
      workspaceId: ctx.workspace.id,
      actor: { id: ctx.user.id, name: ctx.user.name },
      action: data.done ? "subtask.completed" : "subtask.reopened",
      entityType: "task",
      entityId: subtask.taskId,
      entityName: subtask.task.title,
      metadata: { subtaskTitle: updated.title },
    });
  }

  return ok({ subtask: subtaskDTO(updated) });
});

export const DELETE = apiHandler<{ id: string }>(async ({ ctx, params }) => {
  const subtask = await loadSubtask(ctx, params.id);
  await db.subtask.delete({ where: { id: subtask.id } });
  await logActivity({
    workspaceId: ctx.workspace.id,
    actor: { id: ctx.user.id, name: ctx.user.name },
    action: "subtask.deleted",
    entityType: "task",
    entityId: subtask.taskId,
    entityName: subtask.task.title,
    metadata: { subtaskTitle: subtask.title },
  });
  return noContent();
});
