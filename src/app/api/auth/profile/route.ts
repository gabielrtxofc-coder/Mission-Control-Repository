import { apiHandler, ok } from "@/lib/api";
import { profileUpdateSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";
import { userDTO } from "@/lib/serializers";

export const PATCH = apiHandler(async ({ ctx, body }) => {
  const data = await body(profileUpdateSchema);

  const currentPrefs = safeJsonParse<Record<string, unknown>>(ctx.user.prefs, {});
  const updated = await db.user.update({
    where: { id: ctx.user.id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.jobTitle !== undefined ? { jobTitle: data.jobTitle } : {}),
      ...(data.avatarColor !== undefined ? { avatarColor: data.avatarColor } : {}),
      ...(data.prefs !== undefined ? { prefs: { ...currentPrefs, ...data.prefs } } : {}),
    },
  });

  return ok({ user: { ...userDTO(updated), prefs: updated.prefs } });
});
