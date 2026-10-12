import { apiHandler, ok, created } from "@/lib/api";
import { taskCreateSchema, taskQuerySchema } from "@/lib/validators";
import { createTask } from "@/lib/services/task-service";
import { listTasks } from "@/lib/services/task-queries";
import { taskDTO } from "@/lib/serializers";

export const GET = apiHandler(async ({ ctx, query }) => {
  const q = query(taskQuerySchema);
  const { tasks, total } = await listTasks(ctx.workspace.id, q);
  return ok({ tasks, total });
});

export const POST = apiHandler(async ({ ctx, body }) => {
  const data = await body(taskCreateSchema);
  const task = await createTask(ctx, data);
  return created({ task: taskDTO(task) });
});
