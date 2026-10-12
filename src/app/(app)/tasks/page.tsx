import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { listTasks } from "@/lib/services/task-queries";
import { addDaysISO, todayISO } from "@/lib/dates";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import {
  TasksWorkspace,
  type TaskView,
  type OptionsData,
} from "@/components/tasks/tasks-workspace";
import type { TaskFilterState } from "@/components/tasks/task-filters";
import { sweepDueSoon } from "@/lib/notify";

export const metadata = { title: "Tarefas" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const sp = await searchParams;

  const today = todayISO();
  const initialView = (first(sp.view) as TaskView) || "table";
  const openId = first(sp.open) ?? null;

  const filters: TaskFilterState = {
    search: first(sp.q) ?? "",
    status: (first(sp.status) ?? "")
      .split(",")
      .filter(Boolean) as TaskStatus[],
    priority: (first(sp.priority) ?? "")
      .split(",")
      .filter(Boolean) as TaskPriority[],
    assigneeId:
      first(sp.assignee) === "me" ? ctx.user.id : (first(sp.assignee) ?? ""),
    projectId: first(sp.project) ?? "",
    dueFrom: first(sp.dueFrom) ?? "",
    dueTo: first(sp.dueTo) ?? "",
    includeArchived: first(sp.archived) === "1",
  };

  // Atalhos de filtro vindos do dashboard
  if (first(sp.overdue) === "true") {
    filters.dueTo = addDaysISO(today, -1);
  }
  if (first(sp.dueSoon) === "true" || first(sp.dueSoon) === "1") {
    filters.dueFrom = today;
    filters.dueTo = addDaysISO(today, 3);
  }

  await sweepDueSoon(ctx.workspace.id, ctx.user.id).catch(() => {});

  const [tasksRes, members, projects, tags] = await Promise.all([
    listTasks(ctx.workspace.id, {
      ...filters,
      sort: "updatedAt",
      dir: "desc",
      limit: 300,
    }),
    db.workspaceMember.findMany({
      where: { workspaceId: ctx.workspace.id, user: { isActive: true } },
      include: { user: true },
      orderBy: { joinedAt: "asc" },
    }),
    db.project.findMany({
      where: { workspaceId: ctx.workspace.id, archivedAt: null },
      select: { id: true, name: true, color: true, status: true },
      orderBy: { name: "asc" },
    }),
    db.tag.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { name: "asc" },
    }),
  ]);

  const options: OptionsData = {
    members: members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      jobTitle: m.user.jobTitle,
      avatarColor: m.user.avatarColor,
      isActive: m.user.isActive,
    })),
    projects,
    tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
  };

  return (
    <TasksWorkspace
      initialTasks={tasksRes.tasks}
      options={options}
      initialFilters={filters}
      initialView={initialView}
      initialOpenId={openId}
      currentUserId={ctx.user.id}
    />
  );
}
