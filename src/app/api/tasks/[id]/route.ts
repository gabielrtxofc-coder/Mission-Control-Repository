import { z } from "zod";
import { apiHandler, ok } from "@/lib/api";
import { taskUpdateSchema } from "@/lib/validators";
import {
  loadTaskOrThrow,
  updateTask,
  setTaskArchived,
} from "@/lib/services/task-service";
import { taskDTO, activityDTO } from "@/lib/serializers";
import { listActivity } from "@/lib/activity";

const deleteQuerySchema = z.object({
  restore: z.enum(["true", "false"]).optional(),
});

export const GET = apiHandler<{ id: string }>(async ({ ctx, params }) => {
  const task = await loadTaskOrThrow(ctx, params.id);
  const activity = await listActivity({
    workspaceId: ctx.workspace.id,
    entityType: "task",
    entityId: task.id,
    limit: 30,
  });
  return ok({ task: taskDTO(task), activity: activity.map(activityDTO) });
});

export const PATCH = apiHandler<{ id: string }>(async ({ ctx, params, body }) => {
  const data = await body(taskUpdateSchema);
  const task = await updateTask(ctx, params.id, data);
  return ok({ task: taskDTO(task) });
});

/**
 * DELETE ?restore=true restaura; caso contrário arquiva (soft delete).
 * A exclusão permanente não é exposta na interface — usar scripts de manutenção.
 */
export const DELETE = apiHandler<{ id: string }>(async ({ ctx, params, query }) => {
  const q = query(deleteQuerySchema);
  const task = await setTaskArchived(ctx, params.id, q.restore !== "true");
  return ok({ task: taskDTO(task) });
});
