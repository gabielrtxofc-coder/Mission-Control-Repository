/**
 * Metadados de domínio: labels, cores e ícones de status/prioridade.
 * Mantidos centralmente para consistência entre dashboard, listas, kanban,
 * calendário e linha do tempo.
 */
import type { ProjectStatus, TaskPriority, TaskStatus } from "@prisma/client";

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"] as const;
export const TASK_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export const PROJECT_STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"] as const;

// Garante compatibilidade com os enums do Prisma
const _statusCheck: readonly TaskStatus[] = TASK_STATUSES;
const _priorityCheck: readonly TaskPriority[] = TASK_PRIORITIES;
const _projectCheck: readonly ProjectStatus[] = PROJECT_STATUSES;
void _statusCheck; void _priorityCheck; void _projectCheck;

export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; dot: string; badge: string; kanbanOrder: number }
> = {
  TODO: {
    label: "A fazer",
    dot: "bg-zinc-400",
    badge: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border-zinc-500/30",
    kanbanOrder: 0,
  },
  IN_PROGRESS: {
    label: "Em andamento",
    dot: "bg-sky-400",
    badge: "bg-sky-400/10 text-sky-700 dark:text-sky-300 border-sky-400/30",
    kanbanOrder: 1,
  },
  IN_REVIEW: {
    label: "Em revisão",
    dot: "bg-amber-400",
    badge: "bg-amber-400/10 text-amber-700 dark:text-amber-300 border-amber-400/30",
    kanbanOrder: 2,
  },
  DONE: {
    label: "Concluída",
    dot: "bg-accent",
    badge: "bg-accent/10 text-accent border-accent/30",
    kanbanOrder: 3,
  },
  BLOCKED: {
    label: "Bloqueada",
    dot: "bg-red-400",
    badge: "bg-red-400/10 text-red-600 dark:text-red-300 border-red-400/30",
    kanbanOrder: 4,
  },
};

export const TASK_PRIORITY_META: Record<TaskPriority, { label: string; badge: string; order: number }> = {
  LOW: {
    label: "Baixa",
    badge: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/25",
    order: 0,
  },
  NORMAL: {
    label: "Normal",
    badge: "bg-info-soft text-info border-info/30",
    order: 1,
  },
  HIGH: {
    label: "Alta",
    badge: "bg-warning-soft text-warning border-warning/30",
    order: 2,
  },
  URGENT: {
    label: "Urgente",
    badge: "bg-danger-soft text-danger border-danger/30",
    order: 3,
  },
};

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; dot: string; badge: string }> = {
  PLANNING: {
    label: "Planejamento",
    dot: "bg-violet-400",
    badge: "bg-violet-400/10 text-violet-700 dark:text-violet-300 border-violet-400/30",
  },
  ACTIVE: {
    label: "Ativo",
    dot: "bg-accent",
    badge: "bg-accent/10 text-accent border-accent/30",
  },
  ON_HOLD: {
    label: "Em espera",
    dot: "bg-amber-400",
    badge: "bg-amber-400/10 text-amber-700 dark:text-amber-300 border-amber-400/30",
  },
  COMPLETED: {
    label: "Concluído",
    dot: "bg-info",
    badge: "bg-info-soft text-info border-info/30",
  },
};

export const PROJECT_COLORS = [
  "#A3E635",
  "#38BDF8",
  "#F59E0B",
  "#F87171",
  "#A78BFA",
  "#34D399",
  "#F472B6",
  "#94A3B8",
  "#FACC15",
  "#22D3EE",
] as const;

export const AVATAR_COLORS = [
  "#A3E635",
  "#38BDF8",
  "#F59E0B",
  "#F87171",
  "#A78BFA",
  "#34D399",
  "#F472B6",
  "#FACC15",
] as const;

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_ATTACHMENT_MIME = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
] as const;

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  TASK_ASSIGNED: "Atribuição de tarefa",
  TASK_STATUS_CHANGED: "Mudança de status",
  TASK_COMMENT: "Novo comentário",
  TASK_DUE_SOON: "Prazo próximo",
  PROJECT_CREATED: "Novo projeto",
  PROJECT_UPDATED: "Projeto atualizado",
  MEMBER_ADDED: "Novo membro",
};
