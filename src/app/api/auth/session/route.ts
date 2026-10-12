import { apiHandler, ok } from "@/lib/api";
import { userDTO } from "@/lib/serializers";

export const GET = apiHandler(async ({ ctx }) => {
  return ok({
    user: {
      ...userDTO(ctx.user),
      prefs: ctx.user.prefs,
    },
    workspace: ctx.workspace,
    role: ctx.role,
  });
});
