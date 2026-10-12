/**
 * Consultas de tarefas com filtros compartilhados por todas as
 * visualizações (lista, kanban, calendário, linha do tempo, exportação).
 */
import type { Prisma, TaskPriority, TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { fromDateISO } from "@/lib/dates";
import { taskDTO, type TaskDTO } from "@/lib/serializers";

export type TaskFilters = {
  search?: string;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigneeId?: string;
  projectId?: string;
  dueFrom?: string | null;
  dueTo?: string | null;
  includeArchived?: boolean;
  sort?: "dueDate" | "title" | "priority" | "status" | "createdAt" | "updatedAt" | "position";
  dir?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

export function buildTaskWhere(workspaceId: string, filters: TaskFilters): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {
    workspaceId,
    ...(filters.includeArchived ? {} : { archivedAt: null }),
    ...(filters.status && filters.status.length > 0 ? { status: { in: filters.status } } : {}),
    ...(filters.priority && filters.priority.length > 0 ? { priority: { in: filters.priority } } : {}),
    ...(filters.assigneeId === "__none__"
      ? { assigneeId: null }
      : filters.assigneeId
        ? { assigneeId: filters.assigneeId }
        : {}),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.dueFrom || filters.dueTo
      ? {
          dueDate: {
            ...(filters.dueFrom ? { gte: fromDateISO(filters.dueFrom)! } : {}),
            ...(filters.dueTo ? { lte: fromDateISO(filters.dueTo)! } : {}),
          },
        }
      : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
            { project: { name: { contains: filters.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  return where;
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  URGENT: 3,
};

const STATUS_ORDER: Record<TaskStatus, number> = {
  TODO: 0,
  IN_PROGRESS: 1,
  IN_REVIEW: 2,
  BLOCKED: 3,
  DONE: 4,
};

export async function listTasks(
  workspaceId: string,
  filters: TaskFilters = {},
): Promise<{ tasks: TaskDTO[]; total: number }> {
  const where = buildTaskWhere(workspaceId, filters);
  const [rows, total] = await Promise.all([
    db.task.findMany({
      where,
      include: {
        assignee: true,
        creator: true,
        project: { select: { id: true, name: true, color: true } },
        tags: { include: { tag: true } },
        _count: { select: { comments: true, subtasks: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: filters.limit ?? 200,
      skip: filters.offset ?? 0,
    }),
    db.task.count({ where }),
  ]);

  // Ordenação em memória para prioridade/status (enum order do banco não é o visual)
  const sort = filters.sort ?? "updatedAt";
  const dir = filters.dir === "asc" ? 1 : -1;
  const sorted = [...rows].sort((a, b) => {
    let result = 0;
    if (sort === "priority") result = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    else if (sort === "status") result = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    else if (sort === "title") result = a.title.localeCompare(b.title, "pt-BR");
    else if (sort === "dueDate") {
      const ad = a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
      const bd = b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
      result = ad === bd ? 0 : ad < bd ? -1 : 1;
    } else if (sort === "position") result = a.position - b.position;
    else if (sort === "createdAt") result = a.createdAt.getTime() - b.createdAt.getTime();
    else result = a.updatedAt.getTime() - b.updatedAt.getTime();
    return result * dir;
  });

  return { tasks: sorted.map(taskDTO), total };
}

export function tasksToCSV(tasks: TaskDTO[]): string {
  const headers = [
    "ID",
    "Título",
    "Descrição",
    "Projeto",
    "Status",
    "Prioridade",
    "Responsável",
    "E-mail do responsável",
    "Criador",
    "Início",
    "Prazo",
    "Criada em",
    "Atualizada em",
    "Arquivada",
  ];
  const escape = (value: unknown): string => {
    const str = value === null || value === undefined ? "" : String(value);
    return /[",\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const statusLabels: Record<string, string> = {
    TODO: "A fazer",
    IN_PROGRESS: "Em andamento",
    IN_REVIEW: "Em revisão",
    DONE: "Concluída",
    BLOCKED: "Bloqueada",
  };
  const priorityLabels: Record<string, string> = {
    LOW: "Baixa",
    NORMAL: "Normal",
    HIGH: "Alta",
    URGENT: "Urgente",
  };
  const lines = [headers.join(",")];
  for (const task of tasks) {
    lines.push(
      [
        task.id,
        task.title,
        task.description,
        task.projectName ?? "",
        statusLabels[task.status] ?? task.status,
        priorityLabels[task.priority] ?? task.priority,
        task.assignee?.name ?? "",
        task.assignee?.email ?? "",
        task.creator?.name ?? "",
        task.startDate ?? "",
        task.dueDate ?? "",
        task.createdAt,
        task.updatedAt,
        task.archived ? "sim" : "não",
      ]
        .map(escape)
        .join(","),
    );
  }
  return lines.join("\n");
}
