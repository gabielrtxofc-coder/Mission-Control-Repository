import { apiHandler, ok } from "@/lib/api";
import { workspaceUpdateSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { canManageWorkspace } from "@/lib/permissions";
import { forbidden } from "@/lib/errors";
import { logActivity } from "@/lib/activity";

export const GET = apiHandler(async ({ ctx }) => {
  return ok({ workspace: ctx.workspace, role: ctx.role });
});

export const PATCH = apiHandler(async ({ ctx, body }) => {
  if (!canManageWorkspace(ctx.role)) {
    throw forbidden("Apenas administradores podem alterar as configurações do workspace.");
  }
  const data = await body(workspaceUpdateSchema);

  const updated = await db.workspace.update({
    where: { id: ctx.workspace.id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
    },
  });

  await logActivity({
    workspaceId: ctx.workspace.id,
    actor: { id: ctx.user.id, name: ctx.user.name },
    action: "workspace.updated",
    entityType: "workspace",
    entityId: updated.id,
    entityName: updated.name,
  });

  return ok({
    workspace: {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      settings: updated.settings,
    },
  });
});
