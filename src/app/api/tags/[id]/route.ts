import { apiHandler, noContent } from "@/lib/api";
import { db } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { assertWorkspaceScope } from "@/lib/permissions";

export const DELETE = apiHandler<{ id: string }>(async ({ ctx, params }) => {
  const tag = await db.tag.findUnique({ where: { id: params.id } });
  if (!tag) throw notFound("Etiqueta não encontrada.");
  assertWorkspaceScope(ctx, tag, "Etiqueta não encontrada.");
  await db.tag.delete({ where: { id: tag.id } });
  return noContent();
});
