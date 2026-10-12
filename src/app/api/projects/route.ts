import { apiHandler, ok, created } from "@/lib/api";
import { projectCreateSchema, projectQuerySchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { createProject } from "@/lib/services/project-service";
import { projectDTO } from "@/lib/serializers";
import type { Prisma } from "@prisma/client";

export const GET = apiHandler(async ({ ctx, query }) => {
  const q = query(projectQuerySchema);

  const where: Prisma.ProjectWhereInput = {
    workspaceId: ctx.workspace.id,
    ...(q.includeArchived ? {} : { archivedAt: null }),
    ...(q.status ? { status: q.status } : {}),
    ...(q.search
      ? {
          OR: [
            { name: { contains: q.search, mode: "insensitive" } },
            { description: { contains: q.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const dir = q.dir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.ProjectOrderByWithRelationInput =
    q.sort === "name"
      ? { name: dir }
      : q.sort === "dueDate"
        ? { dueDate: q.dir === "asc" ? "asc" : "desc" }
        : q.sort === "status"
          ? { status: dir }
          : q.sort === "createdAt"
            ? { createdAt: dir }
            : { updatedAt: dir };

  const projects = await db.project.findMany({
    where,
    include: {
      owner: true,
      members: { include: { user: true } },
      _count: { select: { tasks: { where: { archivedAt: null } } } },
    },
    orderBy,
  });

  // Progresso real: tarefas concluídas / total (não arquivadas)
  const ids = projects.map((p) => p.id);
  const statusCounts = await db.task.groupBy({
    by: ["projectId", "status"],
    where: { projectId: { in: ids }, archivedAt: null },
    _count: true,
  });

  const dto = projects.map((project) => {
    const rows = statusCounts.filter((s) => s.projectId === project.id);
    const total = rows.reduce((acc, r) => acc + r._count, 0);
    const done = rows.filter((r) => r.status === "DONE").reduce((acc, r) => acc + r._count, 0);
    return {
      ...projectDTO(project),
      taskCount: total,
      doneTaskCount: done,
      progress: total === 0 ? 0 : Math.round((done / total) * 100),
    };
  });

  return ok({ projects: dto });
});

export const POST = apiHandler(async ({ ctx, body }) => {
  const data = await body(projectCreateSchema);
  const project = await createProject(ctx, data);
  return created({ project: projectDTO(project) });
});
