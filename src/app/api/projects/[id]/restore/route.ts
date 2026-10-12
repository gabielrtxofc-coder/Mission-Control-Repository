import { apiHandler, ok } from "@/lib/api";
import { setProjectArchived } from "@/lib/services/project-service";
import { projectDTO } from "@/lib/serializers";

export const POST = apiHandler<{ id: string }>(async ({ ctx, params }) => {
  const project = await setProjectArchived(ctx, params.id, false);
  return ok({ project: projectDTO(project) });
});
