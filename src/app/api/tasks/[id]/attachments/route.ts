import { apiHandler, created } from "@/lib/api";
import { db } from "@/lib/db";
import { badRequest, payloadTooLarge } from "@/lib/errors";
import { loadTaskOrThrow } from "@/lib/services/task-service";
import { logActivity } from "@/lib/activity";
import { attachmentDTO } from "@/lib/serializers";
import { saveUpload } from "@/lib/uploads";
import { ALLOWED_ATTACHMENT_MIME, MAX_ATTACHMENT_SIZE } from "@/lib/constants";

export const POST = apiHandler<{ id: string }>(async ({ ctx, params, req }) => {
  const task = await loadTaskOrThrow(ctx, params.id);

  const form = await req.formData().catch(() => {
    throw badRequest("Envie o arquivo como multipart/form-data.");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("Nenhum arquivo enviado.");

  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw payloadTooLarge("O arquivo excede o limite de 10 MB.");
  }
  if (!(ALLOWED_ATTACHMENT_MIME as readonly string[]).includes(file.type)) {
    throw badRequest("Tipo de arquivo não permitido.");
  }

  const stored = await saveUpload(ctx.workspace.id, file);

  const attachment = await db.attachment.create({
    data: {
      workspaceId: ctx.workspace.id,
      taskId: task.id,
      uploaderId: ctx.user.id,
      fileName: stored.fileName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      storageKey: stored.storageKey,
    },
    include: { uploader: true },
  });

  await logActivity({
    workspaceId: ctx.workspace.id,
    actor: { id: ctx.user.id, name: ctx.user.name },
    action: "attachment.uploaded",
    entityType: "task",
    entityId: task.id,
    entityName: task.title,
    metadata: { fileName: stored.fileName, sizeBytes: stored.sizeBytes },
  });

  return created({ attachment: attachmentDTO(attachment) });
});
