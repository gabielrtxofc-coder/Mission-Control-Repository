import { apiHandler, ok } from "@/lib/api";
import { notificationQuerySchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { notificationDTO } from "@/lib/serializers";

export const GET = apiHandler(async ({ ctx, query }) => {
  const q = query(notificationQuerySchema);

  const where = {
    userId: ctx.user.id,
    workspaceId: ctx.workspace.id,
    ...(q.unreadOnly ? { readAt: null } : {}),
  };

  const [notifications, total, unread] = await Promise.all([
    db.notification.findMany({
      where,
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: q.limit,
      skip: q.offset,
    }),
    db.notification.count({ where }),
    db.notification.count({
      where: { userId: ctx.user.id, workspaceId: ctx.workspace.id, readAt: null },
    }),
  ]);

  return ok({
    notifications: notifications.map(notificationDTO),
    total,
    unread,
  });
});
