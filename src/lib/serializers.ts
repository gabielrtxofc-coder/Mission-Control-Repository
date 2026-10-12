/**
 * Serialização de entidades para DTOs JSON (datas como strings estáveis).
 */
import type {
  ActivityEvent,
  Comment,
  Notification,
  Project,
  Subtask,
  Tag,
  Task,
  User,
  Attachment,
} from "@prisma/client";
import { toISODate } from "@/lib/dates";

export type UserDTO = {
  id: string;
  name: string;
  email: string;
  jobTitle: string | null;
  avatarColor: string;
  isActive: boolean;
};

export type TaskDTO = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  projectName?: string | null;
  projectColor?: string | null;
  title: string;
  description: string;
  status: Task["status"];
  priority: Task["priority"];
  startDate: string | null;
  dueDate: string | null;
  position: number;
  creatorId: string;
  assigneeId: string | null;
  assignee?: UserDTO | null;
  creator?: UserDTO | null;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  subtaskCount?: number;
  doneSubtaskCount?: number;
  commentCount?: number;
  tags?: TagDTO[];
  subtasks?: SubtaskDTO[];
  comments?: CommentDTO[];
  attachments?: AttachmentDTO[];
};

export type ProjectDTO = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: Project["status"];
  color: string;
  ownerId: string;
  owner?: UserDTO | null;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  memberIds?: string[];
  members?: UserDTO[];
  taskCount?: number;
  doneTaskCount?: number;
  progress?: number;
};

export type SubtaskDTO = {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  position: number;
  createdAt: string;
  completedAt: string | null;
};

export type CommentDTO = {
  id: string;
  taskId: string;
  authorId: string;
  author: UserDTO;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type TagDTO = {
  id: string;
  name: string;
  color: string;
};

export type NotificationDTO = {
  id: string;
  type: Notification["type"];
  title: string;
  body: string | null;
  link: string | null;
  taskId: string | null;
  projectId: string | null;
  readAt: string | null;
  createdAt: string;
  actor: UserDTO | null;
};

export type ActivityDTO = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  actorName: string;
  actor: { id: string; name: string; avatarColor: string } | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AttachmentDTO = {
  id: string;
  taskId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploaderId: string;
  uploader?: UserDTO | null;
  createdAt: string;
};

export function userDTO(user: User | null | undefined): UserDTO | null {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    jobTitle: user.jobTitle,
    avatarColor: user.avatarColor,
    isActive: user.isActive,
  };
}

export function userLiteDTO(user: Pick<User, "id" | "name" | "email" | "jobTitle" | "avatarColor" | "isActive"> | null | undefined): UserDTO | null {
  return user ? (userDTO(user as User) as UserDTO) : null;
}

export function taskDTO(
  task: Task & {
    assignee?: User | null;
    creator?: User | null;
    project?: Pick<Project, "id" | "name" | "color"> | null;
    tags?: { tag: Tag }[];
    subtasks?: Subtask[];
    comments?: (Comment & { author: User })[];
    attachments?: (Attachment & { uploader: User })[];
    _count?: { comments: number; subtasks: number };
  },
): TaskDTO {
  const subtasks = task.subtasks;
  return {
    id: task.id,
    workspaceId: task.workspaceId,
    projectId: task.projectId,
    projectName: task.project?.name ?? null,
    projectColor: task.project?.color ?? null,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    startDate: toISODate(task.startDate),
    dueDate: toISODate(task.dueDate),
    position: task.position,
    creatorId: task.creatorId,
    assigneeId: task.assigneeId,
    assignee: userLiteDTO(task.assignee),
    creator: userLiteDTO(task.creator),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    archived: task.archivedAt !== null,
    ...(subtasks
      ? {
          subtasks: subtasks.map(subtaskDTO),
          subtaskCount: subtasks.length,
          doneSubtaskCount: subtasks.filter((s) => s.done).length,
        }
      : task._count
        ? { subtaskCount: task._count.subtasks, doneSubtaskCount: undefined }
        : {}),
    ...(task._count ? { commentCount: task._count.comments } : {}),
    ...(task.tags ? { tags: task.tags.map((t) => tagDTO(t.tag)) } : {}),
    ...(task.subtasks ? {} : {}),
    ...(task.comments ? { comments: task.comments.map(commentDTO) } : {}),
    ...(task.attachments ? { attachments: task.attachments.map(attachmentDTO) } : {}),
  };
}

export function projectDTO(
  project: Project & {
    owner?: User | null;
    members?: { user: User }[];
    _count?: { tasks: number };
    tasks?: { status: Task["status"] }[];
  },
): ProjectDTO {
  const total = project._count?.tasks ?? project.tasks?.length ?? 0;
  const done =
    project.tasks?.filter((t) => t.status === "DONE").length ??
    0;
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    name: project.name,
    description: project.description,
    status: project.status,
    color: project.color,
    ownerId: project.ownerId,
    owner: userLiteDTO(project.owner),
    startDate: toISODate(project.startDate),
    dueDate: toISODate(project.dueDate),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    archived: project.archivedAt !== null,
    ...(project.members
      ? {
          members: project.members.map((m) => userLiteDTO(m.user)!),
          memberIds: project.members.map((m) => m.user.id),
        }
      : {}),
    taskCount: total,
    doneTaskCount: done,
    progress: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

export function subtaskDTO(subtask: Subtask): SubtaskDTO {
  return {
    id: subtask.id,
    taskId: subtask.taskId,
    title: subtask.title,
    done: subtask.done,
    position: subtask.position,
    createdAt: subtask.createdAt.toISOString(),
    completedAt: subtask.completedAt ? subtask.completedAt.toISOString() : null,
  };
}

export function commentDTO(comment: Comment & { author: User }): CommentDTO {
  return {
    id: comment.id,
    taskId: comment.taskId,
    authorId: comment.authorId,
    author: userDTO(comment.author)!,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

export function tagDTO(tag: Tag): TagDTO {
  return { id: tag.id, name: tag.name, color: tag.color };
}

export function notificationDTO(
  notification: Notification & { actor?: User | null },
): NotificationDTO {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    taskId: notification.taskId,
    projectId: notification.projectId,
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    createdAt: notification.createdAt.toISOString(),
    actor: userLiteDTO(notification.actor),
  };
}

export function activityDTO(
  activity: ActivityEvent & { actor?: Pick<User, "id" | "name" | "avatarColor"> | null },
): ActivityDTO {
  return {
    id: activity.id,
    action: activity.action,
    entityType: activity.entityType,
    entityId: activity.entityId,
    entityName: activity.entityName,
    actorName: activity.actorName,
    actor: activity.actor ?? null,
    metadata: (activity.metadata ?? {}) as Record<string, unknown>,
    createdAt: activity.createdAt.toISOString(),
  };
}

export function attachmentDTO(
  attachment: Attachment & { uploader?: User | null },
): AttachmentDTO {
  return {
    id: attachment.id,
    taskId: attachment.taskId,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    uploaderId: attachment.uploaderId,
    uploader: userLiteDTO(attachment.uploader),
    createdAt: attachment.createdAt.toISOString(),
  };
}
