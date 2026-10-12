import { apiHandler, ok } from "@/lib/api";
import { setTaskArchived } from "@/lib/services/task-service";
import { taskDTO } from "@/lib/serializers";

export const POST = apiHandler<{ id: string }>(async ({ ctx, params }) => {
  const task = await setTaskArchived(ctx, params.id, true);
  return ok({ task: taskDTO(task) });
});
