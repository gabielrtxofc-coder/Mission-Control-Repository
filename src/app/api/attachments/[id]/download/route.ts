import { apiHandler } from "@/lib/api";
import { db } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { assertWorkspaceScope } from "@/lib/permissions";
import { readUpload } from "@/lib/uploads";

/** Download autorizado: só membros do workspace do anexo. */
export const GET = apiHandler<{ id: string }>(async ({ ctx, params }) => {
  const attachment = await db.attachment.findUnique({ where: { id: params.id } });
  if (!attachment) throw notFound("Anexo não encontrado.");
  assertWorkspaceScope(ctx, attachment, "Anexo não encontrado.");

  const buffer = await readUpload(attachment.storageKey);

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(buffer.byteLength),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
