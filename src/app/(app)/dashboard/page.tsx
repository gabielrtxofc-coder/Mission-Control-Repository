import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  ListTodo,
  Timer,
  Activity as ActivityIcon,
} from "lucide-react";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayISO, fromDateISO, addDaysISO, formatRelative, formatDateBR } from "@/lib/dates";
import { TASK_PRIORITY_META, TASK_STATUS_META, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { StatCard } from "@/components/dashboard/stat-cards";
import { BarDistribution, DonutChart } from "@/components/dashboard/charts";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { sweepDueSoon } from "@/lib/notify";
import { QuickActions } from "@/components/dashboard/quick-actions";

export const metadata = { title: "Visão geral" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = (await getAuthContext())!;
  const today = todayISO();
  const in3days = addDaysISO(today, 3);
  const ws = ctx.workspace.id;
  const me = ctx.user.id;

  // Materializa notificações de prazo (oportuno)
  await sweepDueSoon(ws, me).catch(() => {});

  const baseWhere = { workspaceId: ws, archivedAt: null } as const;

  const [
    activeProjects,
    myOpenTasks,
    inProgress,
    doneTotal,
    overdue,
    dueSoon,
    statusCounts,
    priorityCounts,
    recentActivity,
    projectProgress,
    upcoming,
  ] = await Promise.all([
    db.project.count({ where: { ...baseWhere, status: { in: ["PLANNING", "ACTIVE", "ON_HOLD"] } } }),
    db.task.count({
      where: { ...baseWhere, assigneeId: me, status: { not: "DONE" } },
    }),
    db.task.count({ where: { ...baseWhere, status: "IN_PROGRESS" } }),
    db.task.count({ where: { ...baseWhere, status: "DONE" } }),
    db.task.count({
      where: {
        ...baseWhere,
        status: { not: "DONE" },
        dueDate: { lt: fromDateISO(today)! },
      },
    }),
    db.task.count({
      where: {
        ...baseWhere,
        status: { not: "DONE" },
        dueDate: { gte: fromDateISO(today)!, lte: fromDateISO(in3days)! },
      },
    }),
    db.task.groupBy({ by: ["status"], where: baseWhere, _count: true }),
    db.task.groupBy({ by: ["priority"], where: baseWhere, _count: true }),
    db.activityEvent.findMany({
      where: { workspaceId: ws },
      include: { actor: { select: { id: true, name: true, avatarColor: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.project.findMany({
      where: { ...baseWhere },
      include: {
        _count: { select: { tasks: { where: { archivedAt: null } } } },
        tasks: { where: { archivedAt: null }, select: { status: true } },
        owner: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    db.task.findMany({
      where: {
        ...baseWhere,
        dueDate: { not: null },
        status: { not: "DONE" },
      },
      include: { project: { select: { name: true, color: true } }, assignee: true },
      orderBy: { dueDate: "asc" },
      take: 6,
    }),
  ]);

  const statusChart = TASK_STATUSES.map((s) => ({
    label: TASK_STATUS_META[s].label,
    value: statusCounts.find((c) => c.status === s)?._count ?? 0,
    color:
      s === "DONE"
        ? "#A3E635"
        : s === "IN_PROGRESS"
          ? "#38BDF8"
          : s === "IN_REVIEW"
            ? "#FBBF24"
            : s === "BLOCKED"
              ? "#F87171"
              : "#8B94A3",
  }));

  const priorityChart = TASK_PRIORITIES.map((p) => ({
    label: TASK_PRIORITY_META[p].label,
    value: priorityCounts.find((c) => c.priority === p)?._count ?? 0,
    color:
      p === "URGENT"
        ? "#F87171"
        : p === "HIGH"
          ? "#FBBF24"
          : p === "NORMAL"
            ? "#38BDF8"
            : "#8B94A3",
  }));

  const totalTasks = statusChart.reduce((a, b) => a + b.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text">
            Olá, {ctx.user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Aqui está o que está acontecendo no {ctx.workspace.name}.
          </p>
        </div>
        <QuickActions />
      </div>

      {/* Indicadores principais */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Projetos ativos"
          value={activeProjects}
          icon={FolderKanban}
          href="/projects"
          tone="info"
        />
        <StatCard
          label="Minhas tarefas"
          value={myOpenTasks}
          icon={ListTodo}
          href="/tasks?assignee=me"
          tone="accent"
          hint="Atribuídas a você e não concluídas"
        />
        <StatCard
          label="Em andamento"
          value={inProgress}
          icon={Timer}
          href="/tasks?status=IN_PROGRESS"
          tone="info"
        />
        <StatCard
          label="Concluídas"
          value={doneTotal}
          icon={CheckCircle2}
          href="/tasks?status=DONE"
          tone="accent"
        />
        <StatCard
          label="Atrasadas"
          value={overdue}
          icon={AlertTriangle}
          href="/tasks?overdue=true"
          tone="danger"
        />
        <StatCard
          label="Prazos próximos"
          value={dueSoon}
          icon={CalendarClock}
          href="/tasks?dueSoon=true"
          tone="warning"
          hint="Próximos 3 dias"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Distribuições */}
        <div className="surface-panel p-5">
          <h2 className="mb-4 text-sm font-semibold text-text">Tarefas por status</h2>
          <DonutChart
            items={statusChart}
            centerLabel="tarefas"
            centerValue={totalTasks}
          />
        </div>
        <div className="surface-panel p-5">
          <h2 className="mb-4 text-sm font-semibold text-text">Tarefas por prioridade</h2>
          <BarDistribution items={priorityChart} />
        </div>

        {/* Prazos próximos */}
        <div className="surface-panel flex flex-col p-5">
          <h2 className="mb-4 text-sm font-semibold text-text">Próximos prazos</h2>
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Nenhum prazo no radar"
              description="Tarefas com prazo aparecem aqui em ordem cronológica."
              className="border-0 py-6"
            />
          ) : (
            <ul className="space-y-3">
              {upcoming.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/tasks?open=${task.id}`}
                    className="group flex items-center gap-3 rounded-md px-2 py-1.5 -mx-2 hover:bg-surface-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm text-text group-hover:text-accent">
                        {task.title}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {task.project?.name ?? "Sem projeto"}
                        {task.assignee ? ` · ${task.assignee.name}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted">
                      {formatDateBR(task.dueDate!.toISOString().slice(0, 10))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Progresso dos projetos */}
        <div className="surface-panel p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Progresso dos projetos</h2>
            <Link href="/projects" className="text-xs font-medium text-accent hover:underline">
              Ver todos
            </Link>
          </div>
          {projectProgress.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="Nenhum projeto ainda"
              description="Crie o primeiro projeto para organizar o trabalho da equipe."
              className="border-0 py-8"
            />
          ) : (
            <ul className="space-y-4">
              {projectProgress.map((project) => {
                const total = project._count.tasks;
                const done = project.tasks.filter((t) => t.status === "DONE").length;
                const percent = total === 0 ? 0 : Math.round((done / total) * 100);
                return (
                  <li key={project.id}>
                    <Link
                      href={`/projects/${project.id}`}
                      className="group block rounded-md px-2 py-2 -mx-2 hover:bg-surface-2"
                    >
                      <div className="mb-2 flex items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: project.color }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-text group-hover:text-accent">
                          {project.name}
                        </span>
                        <span className="text-xs text-muted">
                          {done}/{total} tarefas
                        </span>
                        <span className="w-10 text-right text-xs font-medium text-text">
                          {percent}%
                        </span>
                      </div>
                      <Progress value={percent} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Atividade recente */}
        <div className="surface-panel p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text">
            <ActivityIcon className="h-4 w-4 text-muted" aria-hidden />
            Atividade recente
          </h2>
          {recentActivity.length === 0 ? (
            <EmptyState
              icon={ActivityIcon}
              title="Sem atividade ainda"
              description="As ações da equipe aparecerão aqui."
              className="border-0 py-8"
            />
          ) : (
            <ul className="space-y-3">
              {recentActivity.map((event) => (
                <li key={event.id} className="flex items-start gap-2.5">
                  <Avatar
                    name={event.actorName}
                    color={event.actor?.avatarColor}
                    size="xs"
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-relaxed text-muted">
                      <span className="font-medium text-text">{event.actorName}</span>{" "}
                      {describeActivity(event.action, event.entityName)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted/70">
                      {formatRelative(event.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function describeActivity(action: string, entityName: string): string {
  const map: Record<string, string> = {
    "task.created": `criou a tarefa “${entityName}”`,
    "task.status_changed": `alterou o status de “${entityName}”`,
    "task.updated": `atualizou “${entityName}”`,
    "task.assigneeId_changed": `reatribuiu “${entityName}”`,
    "task.dueDate_changed": `alterou o prazo de “${entityName}”`,
    "task.priority_changed": `alterou a prioridade de “${entityName}”`,
    "task.archived": `arquivou “${entityName}”`,
    "task.restored": `restaurou “${entityName}”`,
    "project.created": `criou o projeto “${entityName}”`,
    "project.updated": `atualizou o projeto “${entityName}”`,
    "project.archived": `arquivou o projeto “${entityName}”`,
    "project.restored": `restaurou o projeto “${entityName}”`,
    "comment.created": `comentou em “${entityName}”`,
    "member.added": `adicionou ${entityName} à equipe`,
    "member.removed": `removeu ${entityName} da equipe`,
    "attachment.uploaded": `anexou um arquivo em “${entityName}”`,
    "subtask.completed": `concluiu um item em “${entityName}”`,
    "workspace.updated": `atualizou as configurações do espaço`,
  };
  return map[action] ?? `realizou uma ação em “${entityName}”`;
}
