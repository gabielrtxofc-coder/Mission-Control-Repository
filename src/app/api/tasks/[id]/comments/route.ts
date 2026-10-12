import { apiHandler, ok, created } from "@/lib/api";
import { commentCreateSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { loadTaskOrThrow } from "@/lib/services/task-service";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { commentDTO } from "@/lib/serializers";

export const GET = apiHandler<{ id: string }>(async ({ ctx, params }) => {
  const task = await loadTaskOrThrow(ctx, params.id);
  const comments = await db.comment.findMany({
    where: { taskId: task.id },
    include: { author: true },
    orderBy: { createdAt: "asc" },
  });
  return ok({ comments: comments.map(commentDTO) });
});

export const POST = apiHandler<{ id: string }>(async ({ ctx, params, body }) => {
  const task = await loadTaskOrThrow(ctx, params.id);
  const data = await body(commentCreateSchema);

  const comment = await db.comment.create({
    data: {
      taskId: task.id,
      authorId: ctx.user.id,
      body: data.body,
    },
    include: { author: true },
  });

  await logActivity({
    workspaceId: ctx.workspace.id,
    actor: { id: ctx.user.id, name: ctx.user.name },
    action: "comment.created",
    entityType: "task",
    entityId: task.id,
    entityName: task.title,
    metadata: { commentId: comment.id },
  });

  // Notifica envolvidos na tarefa (responsável, criador, participantes de comentários)
  const participants = await db.comment.findMany({
    where: { taskId: task.id },
    select: { authorId: true },
    distinct: ["authorId"],
  });
  await notify({
    workspaceId: ctx.workspace.id,
    recipients: [
      ...new Set([
        task.assigneeId,
        task.creatorId,
        ...participants.map((p) => p.authorId),
      ].filter((id): id is string => Boolean(id))),
    ],
    actorId: ctx.user.id,
    type: "TASK_COMMENT",
    title: `Novo comentário em: ${task.title}`,
    body: data.body.slice(0, 140),
    link: `/tasks?open=${task.id}`,
    taskId: task.id,
    projectId: task.projectId ?? undefined,
  });

  return created({ comment: commentDTO(comment) });
});
