import { z } from "zod";
import { apiHandler, ok } from "@/lib/api";
import { projectUpdateSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import {
  loadProjectOrThrow,
  updateProject,
  setProjectArchived,
} from "@/lib/services/project-service";
import { projectDTO, taskDTO, activityDTO } from "@/lib/serializers";
import { listActivity } from "@/lib/activity";

const deleteQuerySchema = z.object({
  restore: z.enum(["true", "false"]).optional(),
});

export const GET = apiHandler<{ id: string }>(async ({ ctx, params }) => {
  const project = await loadProjectOrThrow(ctx, params.id);

  const [tasks, activity] = await Promise.all([
    db.task.findMany({
      where: { projectId: project.id, archivedAt: null },
      include: {
        assignee: true,
        creator: true,
        project: { select: { id: true, name: true, color: true } },
        tags: { include: { tag: true } },
        _count: { select: { comments: true, subtasks: true } },
      },
      orderBy: [{ position: "asc" }],
    }),
    listActivity({
      workspaceId: ctx.workspace.id,
      entityType: "project",
      entityId: project.id,
      limit: 15,
    }),
  ]);

  return ok({
    project: projectDTO(project),
    tasks: tasks.map(taskDTO),
    activity: activity.map(activityDTO),
  });
});

export const PATCH = apiHandler<{ id: string }>(async ({ ctx, params, body }) => {
  const data = await body(projectUpdateSchema);
  const project = await updateProject(ctx, params.id, data);
  return ok({ project: projectDTO(project) });
});

/** DELETE ?restore=true restaura; sem o parâmetro, arquiva (soft delete). */
export const DELETE = apiHandler<{ id: string }>(async ({ ctx, params, query }) => {
  const q = query(deleteQuerySchema);
  const archived = q.restore !== "true";
  const project = await setProjectArchived(ctx, params.id, archived);
  return ok({ project: projectDTO(project) });
});
