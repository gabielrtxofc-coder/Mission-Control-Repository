import { z } from "zod";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import {
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  PROJECT_COLORS,
  AVATAR_COLORS,
} from "@/lib/constants";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use AAAA-MM-DD)")
  .or(z.null())
  .or(z.literal(""));

export const idSchema = z.string().min(1);

// ── Auth ──────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido").toLowerCase(),
  password: z.string().min(1, "Informe a senha"),
});

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(2, "Nome muito curto").max(80).optional(),
    jobTitle: z.string().trim().max(80).optional().nullable(),
    avatarColor: z.enum(AVATAR_COLORS).optional(),
    prefs: z
      .object({
        sidebarCollapsed: z.boolean().optional(),
        density: z.enum(["comfortable", "compact"]).optional(),
        defaultTaskView: z.enum(["table", "kanban", "calendar", "timeline"]).optional(),
        theme: z.enum(["dark", "light"]).optional(),
      })
      .optional(),
  })
  .strict();

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: z.string().min(8, "A nova senha precisa de pelo menos 8 caracteres").max(128),
  })
  .strict();

// ── Workspace ─────────────────────────────────────────────────────────

export const workspaceUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
  })
  .strict();

// ── Members ───────────────────────────────────────────────────────────

export const memberCreateSchema = z
  .object({
    email: z.string().email("E-mail inválido").toLowerCase(),
    name: z.string().trim().min(2, "Nome muito curto").max(80),
    password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres").max(128).optional(),
    role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
    jobTitle: z.string().trim().max(80).optional().nullable(),
  })
  .strict();

export const memberUpdateSchema = z
  .object({
    role: z.enum(["ADMIN", "MEMBER"]).optional(),
    isActive: z.boolean().optional(),
    name: z.string().trim().min(2).max(80).optional(),
    jobTitle: z.string().trim().max(80).optional().nullable(),
  })
  .strict();

// ── Projects ──────────────────────────────────────────────────────────

export const projectCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Nome muito curto").max(120),
    description: z.string().trim().max(5000).default(""),
    status: z.enum(PROJECT_STATUSES).default("PLANNING"),
    color: z.enum(PROJECT_COLORS).default("#A3E635"),
    startDate: isoDate.optional(),
    dueDate: isoDate.optional(),
    ownerId: idSchema.optional(),
    memberIds: z.array(idSchema).max(50).optional(),
  })
  .strict();

export const projectUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(5000).optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
    color: z.enum(PROJECT_COLORS).optional(),
    startDate: isoDate.optional(),
    dueDate: isoDate.optional(),
    ownerId: idSchema.optional(),
    memberIds: z.array(idSchema).max(50).optional(),
  })
  .strict();

export const projectQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  includeArchived: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => v === true || v === "true"),
  sort: z.enum(["name", "createdAt", "dueDate", "status", "updatedAt"]).default("updatedAt"),
  dir: z.enum(["asc", "desc"]).default("desc"),
});

// ── Tasks ─────────────────────────────────────────────────────────────

export const taskCreateSchema = z
  .object({
    title: z.string().trim().min(2, "Título muito curto").max(200),
    description: z.string().trim().max(10000).default(""),
    projectId: idSchema.nullable().optional(),
    status: z.enum(TASK_STATUSES).default("TODO"),
    priority: z.enum(TASK_PRIORITIES).default("NORMAL"),
    startDate: isoDate.optional(),
    dueDate: isoDate.optional(),
    assigneeId: idSchema.nullable().optional(),
    tagIds: z.array(idSchema).max(20).optional(),
  })
  .strict();

export const taskUpdateSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(10000).optional(),
    projectId: idSchema.nullable().optional(),
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    startDate: isoDate.optional(),
    dueDate: isoDate.optional(),
    assigneeId: idSchema.nullable().optional(),
    tagIds: z.array(idSchema).max(20).optional(),
  })
  .strict();

export const taskMoveSchema = z
  .object({
    status: z.enum(TASK_STATUSES).optional(),
    position: z.number().finite().optional(),
  })
  .strict();

export const taskQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z
    .string()
    .optional()
    .transform((v) =>
      v ? (v.split(",").map((s) => s.trim()).filter(Boolean) as TaskStatus[]) : undefined,
    ),
  priority: z
    .string()
    .optional()
    .transform((v) =>
      v ? (v.split(",").map((s) => s.trim()).filter(Boolean) as TaskPriority[]) : undefined,
    ),
  assigneeId: z.string().max(64).optional(),
  projectId: z.string().max(64).optional(),
  dueFrom: isoDate.optional(),
  dueTo: isoDate.optional(),
  includeArchived: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => v === true || v === "true"),
  sort: z
    .enum(["dueDate", "title", "priority", "status", "createdAt", "updatedAt", "position"])
    .default("updatedAt"),
  dir: z.enum(["asc", "desc"]).default("desc"),
  limit: z.coerce.number().int().min(1).max(500).default(200),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Subtasks ──────────────────────────────────────────────────────────

export const subtaskCreateSchema = z
  .object({
    title: z.string().trim().min(1, "Informe o título").max(300),
  })
  .strict();

export const subtaskUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    done: z.boolean().optional(),
  })
  .strict();

// ── Comments ──────────────────────────────────────────────────────────

export const commentCreateSchema = z
  .object({
    body: z.string().trim().min(1, "Escreva um comentário").max(5000),
  })
  .strict();

export const commentUpdateSchema = z
  .object({
    body: z.string().trim().min(1).max(5000),
  })
  .strict();

// ── Tags ──────────────────────────────────────────────────────────────

export const tagCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(40),
    color: z.enum(PROJECT_COLORS).default("#A3E635"),
  })
  .strict();

// ── Notifications ─────────────────────────────────────────────────────

export const notificationReadSchema = z
  .object({
    ids: z.array(idSchema).max(200).optional(),
    all: z.boolean().optional(),
  })
  .strict()
  .refine((v) => (v.ids && v.ids.length > 0) || v.all === true, {
    message: "Informe ids ou all=true",
  });

export const notificationQuerySchema = z.object({
  unreadOnly: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => v === true || v === "true"),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Search ────────────────────────────────────────────────────────────

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "Digite algo para buscar").max(120),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

// ── Activity ──────────────────────────────────────────────────────────

export const activityQuerySchema = z.object({
  entityType: z.enum(["task", "project", "comment", "subtask", "member", "workspace", "attachment"]).optional(),
  entityId: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const normalizeDate = (value: string | null | undefined): string | null => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};
