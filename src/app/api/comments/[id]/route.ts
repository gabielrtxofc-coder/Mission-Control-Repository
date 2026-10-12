import { apiHandler, ok, noContent } from "@/lib/api";
import { commentUpdateSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { forbidden, notFound } from "@/lib/errors";
import { assertWorkspaceScope } from "@/lib/permissions";
import { commentDTO } from "@/lib/serializers";

export const PATCH = apiHandler<{ id: string }>(async ({ ctx, params, body }) => {
  const comment = await db.comment.findUnique({
    where: { id: params.id },
    include: { task: true, author: true },
  });
  if (!comment) throw notFound("Comentário não encontrado.");
  assertWorkspaceScope(ctx, comment.task, "Comentário não encontrado.");

  // Só o autor pode editar
  if (comment.authorId !== ctx.user.id) {
    throw forbidden("Apenas o autor pode editar o comentário.");
  }

  const data = await body(commentUpdateSchema);
  const updated = await db.comment.update({
    where: { id: comment.id },
    data: { body: data.body },
    include: { author: true },
  });
  return ok({ comment: commentDTO(updated) });
});

export const DELETE = apiHandler<{ id: string }>(async ({ ctx, params }) => {
  const comment = await db.comment.findUnique({
    where: { id: params.id },
    include: { task: true },
  });
  if (!comment) throw notFound("Comentário não encontrado.");
  assertWorkspaceScope(ctx, comment.task, "Comentário não encontrado.");

  if (comment.authorId !== ctx.user.id && ctx.role !== "ADMIN") {
    throw forbidden("Apenas o autor ou um administrador pode excluir o comentário.");
  }

  await db.comment.delete({ where: { id: comment.id } });
  return noContent();
});
