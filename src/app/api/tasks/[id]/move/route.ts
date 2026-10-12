import { apiHandler, ok } from "@/lib/api";
import { taskMoveSchema } from "@/lib/validators";
import { moveTask } from "@/lib/services/task-service";
import { taskDTO } from "@/lib/serializers";

export const POST = apiHandler<{ id: string }>(async ({ ctx, params, body }) => {
  const data = await body(taskMoveSchema);
  const task = await moveTask(ctx, params.id, data);
  return ok({ task: taskDTO(task) });
});
