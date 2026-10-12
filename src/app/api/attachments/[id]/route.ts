import { apiHandler, noContent } from "@/lib/api";
import { db } from "@/lib/db";
import { forbidden, notFound } from "@/lib/errors";
import { assertWorkspaceScope } from "@/lib/permissions";
import { removeUpload } from "@/lib/uploads";
import { logActivity } from "@/lib/activity";

export const DELETE = apiHandler<{ id: string }>(async ({ ctx, params }) => {
  const attachment = await db.attachment.findUnique({
    where: { id: params.id },
    include: { task: true },
  });
  if (!attachment) throw notFound("Anexo não encontrado.");
  assertWorkspaceScope(ctx, attachment, "Anexo não encontrado.");

  // Autor pode excluir o próprio anexo; admin pode excluir qualquer um.
  if (attachment.uploaderId !== ctx.user.id && ctx.role !== "ADMIN") {
    throw forbidden("Apenas o autor ou um administrador pode excluir o anexo.");
  }

  await db.attachment.delete({ where: { id: attachment.id } });
  await removeUpload(attachment.storageKey);

  await logActivity({
    workspaceId: ctx.workspace.id,
    actor: { id: ctx.user.id, name: ctx.user.name },
    action: "attachment.deleted",
    entityType: "task",
    entityId: attachment.taskId,
    entityName: attachment.task.title,
    metadata: { fileName: attachment.fileName },
  });

  return noContent();
});
