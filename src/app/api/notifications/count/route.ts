import { apiHandler, ok } from "@/lib/api";
import { unreadCount } from "@/lib/notify";

export const GET = apiHandler(async ({ ctx }) => {
  const count = await unreadCount(ctx.user.id, ctx.workspace.id);
  return ok({ count });
});
