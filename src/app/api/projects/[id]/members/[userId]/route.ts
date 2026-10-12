import { apiHandler, ok } from "@/lib/api";
import { removeProjectMember } from "@/lib/services/project-service";

export const DELETE = apiHandler<{ id: string; userId: string }>(async ({ ctx, params }) => {
  await removeProjectMember(ctx, params.id, params.userId);
  return ok({ ok: true });
});
