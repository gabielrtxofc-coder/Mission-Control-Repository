import { apiHandler, ok } from "@/lib/api";
import { notificationReadSchema } from "@/lib/validators";
import { db } from "@/lib/db";

export const POST = apiHandler(async ({ ctx, body }) => {
  const data = await body(notificationReadSchema);
  const now = new Date();

  const result = await db.notification.updateMany({
    where: {
      userId: ctx.user.id,
      workspaceId: ctx.workspace.id,
      readAt: null,
      ...(data.all ? {} : { id: { in: data.ids ?? [] } }),
    },
    data: { readAt: now },
  });

  return ok({ updated: result.count });
});
