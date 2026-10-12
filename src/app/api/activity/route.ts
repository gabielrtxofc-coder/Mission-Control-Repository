import { apiHandler, ok } from "@/lib/api";
import { activityQuerySchema } from "@/lib/validators";
import { listActivity } from "@/lib/activity";
import { activityDTO } from "@/lib/serializers";

export const GET = apiHandler(async ({ ctx, query }) => {
  const q = query(activityQuerySchema);
  const items = await listActivity({
    workspaceId: ctx.workspace.id,
    entityType: q.entityType,
    entityId: q.entityId,
    limit: q.limit,
  });
  return ok({ activity: items.map(activityDTO) });
});
