import { apiHandler, ok } from "@/lib/api";
import { searchQuerySchema } from "@/lib/validators";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/** Busca global: projetos e tarefas do workspace atual. */
export const GET = apiHandler(async ({ ctx, query }) => {
  const q = query(searchQuerySchema);

  const taskWhere: Prisma.TaskWhereInput = {
    workspaceId: ctx.workspace.id,
    archivedAt: null,
    OR: [
      { title: { contains: q.q, mode: "insensitive" } },
      { description: { contains: q.q, mode: "insensitive" } },
    ],
  };
  const projectWhere: Prisma.ProjectWhereInput = {
    workspaceId: ctx.workspace.id,
    archivedAt: null,
    OR: [
      { name: { contains: q.q, mode: "insensitive" } },
      { description: { contains: q.q, mode: "insensitive" } },
    ],
  };

  const [projects, tasks] = await Promise.all([
    db.project.findMany({
      where: projectWhere,
      select: { id: true, name: true, color: true, status: true },
      orderBy: { updatedAt: "desc" },
      take: q.limit,
    }),
    db.task.findMany({
      where: taskWhere,
      select: {
        id: true,
        title: true,
        status: true,
        project: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: q.limit,
    }),
  ]);

  return ok({
    projects,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      projectName: t.project?.name ?? null,
    })),
  });
});
