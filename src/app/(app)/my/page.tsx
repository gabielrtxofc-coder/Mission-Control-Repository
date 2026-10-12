import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  CalendarIcon,
  CheckCircle2,
  Clock,
  MessageSquare,
} from "lucide-react";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDaysISO, todayISO, formatDateBR, formatRelative, isOverdue } from "@/lib/dates";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MyTasksInteractive } from "@/components/my/my-tasks-interactive";
import { taskDTO } from "@/lib/serializers";
import { cn } from "@/lib/utils";

export const metadata = { title: "Minha área" };
export const dynamic = "force-dynamic";

export default async function MyAreaPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const today = todayISO();
  const in3days = addDaysISO(today, 3);
  const me = ctx.user.id;
  const base = { workspaceId: ctx.workspace.id, archivedAt: null } as const;

  const [overdue, todayTasks, upcoming, recentlyDone, myComments, assignedToMe] =
    await Promise.all([
      db.task.findMany({
        where: {
          ...base,
          assigneeId: me,
          status: { not: "DONE" },
          dueDate: { lt: new Date(`${today}T00:00:00.000Z`) },
        },
        include: includeTask(),
        orderBy: { dueDate: "asc" },
      }),
      db.task.findMany({
        where: {
          ...base,
          assigneeId: me,
          dueDate: new Date(`${today}T00:00:00.000Z`),
        },
        include: includeTask(),
        orderBy: { priority: "desc" },
      }),
      db.task.findMany({
        where: {
          ...base,
          assigneeId: me,
          status: { not: "DONE" },
          dueDate: { gt: new Date(`${today}T00:00:00.000Z`), lte: new Date(`${in3days}T00:00:00.000Z`) },
        },
        include: includeTask(),
        orderBy: { dueDate: "asc" },
      }),
      db.task.findMany({
        where: {
          ...base,
          assigneeId: me,
          status: "DONE",
        },
        include: includeTask(),
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      db.comment.findMany({
        where: {
          task: { ...base, assigneeId: me },
          authorId: { not: me },
        },
        include: {
          author: true,
          task: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.task.findMany({
        where: { ...base, assigneeId: me },
        include: includeTask(),
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text">Minha área</h1>
        <p className="mt-0.5 text-sm text-muted">
          Tudo que está atribuído a você, organizado por urgência.
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          icon={AlertTriangle}
          label="Vencidas"
          value={overdue.length}
          tone="danger"
          href="/tasks?assignee=me&overdue=true"
        />
        <SummaryCard
          icon={Clock}
          label="Para hoje"
          value={todayTasks.length}
          tone="warning"
          href={`/tasks?assignee=me&dueFrom=${today}&dueTo=${today}`}
        />
        <SummaryCard
          icon={CalendarClock}
          label="Próximos prazos"
          value={upcoming.length}
          tone="info"
          href={`/tasks?assignee=me&dueFrom=${today}&dueTo=${in3days}`}
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Concluídas recentemente"
          value={recentlyDone.length}
          tone="accent"
          href="/tasks?assignee=me&status=DONE"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Listas principais */}
        <div className="space-y-6 lg:col-span-2">
          <TaskSection
            title="Vencidas"
            icon={AlertTriangle}
            tasks={overdue}
            emptyText="Nada vencido. Bom trabalho!"
            today={today}
            highlight="danger"
          />
          <TaskSection
            title="Para hoje"
            icon={Clock}
            tasks={todayTasks}
            emptyText="Nenhuma tarefa com prazo para hoje."
            today={today}
            highlight="warning"
          />
          <TaskSection
            title="Próximos prazos"
            icon={CalendarClock}
            tasks={upcoming}
            emptyText="Nenhum prazo nos próximos 3 dias."
            today={today}
          />

          {/* Todas as atribuídas (interativas) */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-text">Todas as minhas tarefas</h2>
            <MyTasksInteractive tasks={assignedToMe.map(taskDTO)} />
          </div>
        </div>

        {/* Lateral */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted" aria-hidden />
                Atualizações e comentários
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myComments.length === 0 ? (
                <p className="text-sm text-muted">
                  Nenhum comentário novo nas suas tarefas.
                </p>
              ) : (
                <ul className="space-y-4">
                  {myComments.map((comment) => (
                    <li key={comment.id}>
                      <Link
                        href={`/tasks?open=${comment.task.id}`}
                        className="block rounded-md px-2 py-1.5 -mx-2 hover:bg-surface-2"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={comment.author.name}
                            color={comment.author.avatarColor}
                            size="xs"
                          />
                          <span className="text-xs font-medium text-text">
                            {comment.author.name}
                          </span>
                          <span className="text-[10px] text-muted">
                            {formatRelative(comment.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted">
                          {comment.body}
                        </p>
                        <p className="mt-1 truncate text-[10px] text-accent">
                          em “{comment.task.title}”
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted" aria-hidden />
                Concluídas recentemente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentlyDone.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma tarefa concluída ainda.</p>
              ) : (
                <ul className="space-y-2.5">
                  {recentlyDone.map((task) => (
                    <li key={task.id}>
                      <Link
                        href={`/tasks?open=${task.id}`}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 hover:bg-surface-2"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-sm text-muted line-through decoration-muted/50">
                          {task.title}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted">
                          {formatRelative(task.updatedAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function includeTask() {
  return {
    project: { select: { id: true, name: true, color: true } },
    assignee: true,
    creator: true,
    tags: { include: { tag: true } },
    _count: { select: { comments: true, subtasks: true } },
  } as const;
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: "danger" | "warning" | "info" | "accent";
  href: string;
}) {
  const tones = {
    danger: "text-danger",
    warning: "text-warning",
    info: "text-info",
    accent: "text-accent",
  } as const;
  return (
    <Link
      href={href}
      className="surface-panel flex items-center gap-4 p-4 transition-colors hover:border-border-strong"
    >
      <div className={cn("rounded-full bg-surface-2 p-2.5", tones[tone])}>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div>
        <p className="text-2xl font-semibold text-text">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </Link>
  );
}

function TaskSection({
  title,
  icon: Icon,
  tasks,
  emptyText,
  today,
  highlight,
}: {
  title: string;
  icon: React.ElementType;
  tasks: {
    id: string;
    title: string;
    status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "BLOCKED";
    priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    dueDate: Date | null;
  }[];
  emptyText: string;
  today: string;
  highlight?: "danger" | "warning";
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
        <Icon
          className={cn(
            "h-4 w-4",
            highlight === "danger" ? "text-danger" : highlight === "warning" ? "text-warning" : "text-muted",
          )}
          aria-hidden
        />
        {title}
        <span className="ml-1 text-xs font-normal text-muted">({tasks.length})</span>
      </h2>
      {tasks.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
          {emptyText}
        </p>
      ) : (
        <ul className="surface-panel divide-y divide-border/60">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                href={`/tasks?open=${task.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/70"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{task.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                  </div>
                </div>
                {task.dueDate && (
                  <span
                    className={cn(
                      "flex items-center gap-1 text-xs",
                      isOverdue(task.dueDate.toISOString().slice(0, 10), today)
                        ? "text-danger"
                        : "text-muted",
                    )}
                  >
                    <CalendarIcon className="h-3 w-3" aria-hidden />
                    {formatDateBR(task.dueDate.toISOString().slice(0, 10))}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
