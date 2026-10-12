import { apiHandler, created } from "@/lib/api";
import { subtaskCreateSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { loadTaskOrThrow } from "@/lib/services/task-service";
import { logActivity } from "@/lib/activity";
import { subtaskDTO } from "@/lib/serializers";

export const POST = apiHandler<{ id: string }>(async ({ ctx, params, body }) => {
  const task = await loadTaskOrThrow(ctx, params.id);
  const data = await body(subtaskCreateSchema);

  const last = await db.subtask.findFirst({
    where: { taskId: task.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const subtask = await db.subtask.create({
    data: {
      taskId: task.id,
      title: data.title,
      position: (last?.position ?? 0) + 1000,
    },
  });

  await logActivity({
    workspaceId: ctx.workspace.id,
    actor: { id: ctx.user.id, name: ctx.user.name },
    action: "subtask.created",
    entityType: "task",
    entityId: task.id,
    entityName: task.title,
    metadata: { subtaskTitle: data.title },
  });

  return created({ subtask: subtaskDTO(subtask) });
});
