"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Activity as ActivityIcon,
  Archive,
  CalendarIcon,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_PRIORITY_META,
  TASK_STATUS_META,
} from "@/lib/constants";
import { formatDateBR, formatDateTimeBR, formatRelative, isOverdue, todayISO } from "@/lib/dates";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge, PriorityBadge, StatusBadge, TagChip } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/skeleton";
import { api, ClientApiError } from "@/lib/client-api";
import { formatBytes, cn } from "@/lib/utils";
import type { ActivityDTO, AttachmentDTO, CommentDTO, SubtaskDTO, TaskDTO, UserDTO } from "@/lib/serializers";

type TaskDetail = TaskDTO & {
  subtasks: SubtaskDTO[];
  comments: CommentDTO[];
  attachments: AttachmentDTO[];
};

export function TaskPanel({
  taskId,
  onClose,
  onSaved,
  onEdit,
}: {
  taskId: string | null;
  onClose: () => void;
  onSaved: (task: TaskDTO) => void;
  onEdit?: () => void;
}) {
  const [task, setTask] = React.useState<TaskDetail | null>(null);
  const [activity, setActivity] = React.useState<ActivityDTO[]>([]);
  const [members, setMembers] = React.useState<UserDTO[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [comment, setComment] = React.useState("");
  const [newSubtask, setNewSubtask] = React.useState("");
  const [savingComment, setSavingComment] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  React.useEffect(() => {
    if (!taskId) {
      setTask(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [detail, membersRes] = await Promise.all([
          api.get<{ task: TaskDetail; activity: ActivityDTO[] }>(`/api/tasks/${taskId}`),
          api.get<{ members: UserDTO[] }>("/api/members").catch(() => ({ members: [] })),
        ]);
        if (cancelled) return;
        setTask(detail.task);
        setActivity(detail.activity);
        setMembers(membersRes.members ?? []);
      } catch {
        if (!cancelled) {
          toast.error("Não foi possível carregar a tarefa.");
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function patchTask(patch: Partial<TaskDTO>) {
    if (!task) return;
    const prev = task;
    setTask({ ...task, ...patch });
    try {
      const res = await api.patch<{ task: TaskDTO }>(`/api/tasks/${task.id}`, patch);
      setTask((cur) => (cur ? { ...cur, ...res.task } : cur));
      onSaved(res.task);
    } catch (error) {
      setTask(prev);
      toast.error(error instanceof ClientApiError ? error.message : "Não foi possível salvar.");
    }
  }

  async function addSubtask() {
    if (!task || !newSubtask.trim()) return;
    try {
      const res = await api.post<{ subtask: SubtaskDTO }>(`/api/tasks/${task.id}/subtasks`, {
        title: newSubtask.trim(),
      });
      setTask({
        ...task,
        subtasks: [...task.subtasks, res.subtask],
        subtaskCount: (task.subtaskCount ?? 0) + 1,
      });
      setNewSubtask("");
    } catch {
      toast.error("Não foi possível adicionar a subtarefa.");
    }
  }

  async function toggleSubtask(subtask: SubtaskDTO) {
    if (!task) return;
    try {
      const res = await api.patch<{ subtask: SubtaskDTO }>(`/api/subtasks/${subtask.id}`, {
        done: !subtask.done,
      });
      setTask({
        ...task,
        subtasks: task.subtasks.map((s) => (s.id === subtask.id ? res.subtask : s)),
      });
    } catch {
      toast.error("Não foi possível atualizar a subtarefa.");
    }
  }

  async function removeSubtask(subtask: SubtaskDTO) {
    if (!task) return;
    try {
      await api.delete(`/api/subtasks/${subtask.id}`);
      setTask({
        ...task,
        subtasks: task.subtasks.filter((s) => s.id !== subtask.id),
      });
    } catch {
      toast.error("Não foi possível remover a subtarefa.");
    }
  }

  async function addComment() {
    if (!task || !comment.trim()) return;
    setSavingComment(true);
    try {
      const res = await api.post<{ comment: CommentDTO }>(`/api/tasks/${task.id}/comments`, {
        body: comment.trim(),
      });
      setTask({ ...task, comments: [...task.comments, res.comment] });
      setComment("");
    } catch {
      toast.error("Não foi possível publicar o comentário.");
    } finally {
      setSavingComment(false);
    }
  }

  async function removeComment(c: CommentDTO) {
    if (!task) return;
    try {
      await api.delete(`/api/comments/${c.id}`);
      setTask({ ...task, comments: task.comments.filter((x) => x.id !== c.id) });
    } catch {
      toast.error("Não foi possível remover o comentário.");
    }
  }

  async function uploadFile(file: File) {
    if (!task) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.upload<{ attachment: AttachmentDTO }>(
        `/api/tasks/${task.id}/attachments`,
        form,
      );
      setTask({ ...task, attachments: [res.attachment, ...task.attachments] });
      toast.success("Anexo enviado.");
    } catch (error) {
      toast.error(
        error instanceof ClientApiError ? error.message : "Não foi possível enviar o anexo.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function removeAttachment(a: AttachmentDTO) {
    if (!task) return;
    try {
      await api.delete(`/api/attachments/${a.id}`);
      setTask({ ...task, attachments: task.attachments.filter((x) => x.id !== a.id) });
    } catch {
      toast.error("Não foi possível remover o anexo.");
    }
  }

  const open = taskId !== null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent title={task?.title ?? "Detalhes da tarefa"} className="max-w-2xl">
        {loading || !task ? (
          <div className="flex h-full items-center justify-center">
            <Spinner label="Carregando tarefa…" />
          </div>
        ) : (
          <TaskPanelBody
            task={task}
            activity={activity}
            members={members}
            comment={comment}
            setComment={setComment}
            newSubtask={newSubtask}
            setNewSubtask={setNewSubtask}
            savingComment={savingComment}
            uploading={uploading}
            onPatch={patchTask}
            onAddSubtask={addSubtask}
            onToggleSubtask={toggleSubtask}
            onRemoveSubtask={removeSubtask}
            onAddComment={addComment}
            onRemoveComment={removeComment}
            onUpload={uploadFile}
            onRemoveAttachment={removeAttachment}
            onArchive={() => {
              void api.post(`/api/tasks/${task.id}/archive`).then(() => {
                toast.success("Tarefa arquivada.");
                onSaved({ ...task, archived: true });
                onClose();
              });
            }}
            onEdit={onEdit}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function TaskPanelBody({
  task,
  activity,
  members,
  comment,
  setComment,
  newSubtask,
  setNewSubtask,
  savingComment,
  uploading,
  onPatch,
  onAddSubtask,
  onToggleSubtask,
  onRemoveSubtask,
  onAddComment,
  onRemoveComment,
  onUpload,
  onRemoveAttachment,
  onArchive,
  onEdit,
}: {
  task: TaskDetail;
  activity: ActivityDTO[];
  members: UserDTO[];
  comment: string;
  setComment: (v: string) => void;
  newSubtask: string;
  setNewSubtask: (v: string) => void;
  savingComment: boolean;
  uploading: boolean;
  onPatch: (patch: Partial<TaskDTO>) => void;
  onAddSubtask: () => void;
  onToggleSubtask: (s: SubtaskDTO) => void;
  onRemoveSubtask: (s: SubtaskDTO) => void;
  onAddComment: () => void;
  onRemoveComment: (c: CommentDTO) => void;
  onUpload: (file: File) => void;
  onRemoveAttachment: (a: AttachmentDTO) => void;
  onArchive: () => void;
  onEdit?: () => void;
}) {
  const today = todayISO();
  const done = task.subtasks.filter((s) => s.done).length;

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2 scrollbar-thin">
        {/* Título e status */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2
              className={cn(
                "text-lg font-semibold leading-snug text-text",
                task.status === "DONE" && "text-muted",
              )}
            >
              {task.title}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {task.dueDate && isOverdue(task.dueDate, today) && task.status !== "DONE" && (
              <Badge className="border-danger/40 bg-danger-soft text-danger">Atrasada</Badge>
            )}
            {task.archived && <Badge>Arquivada</Badge>}
          </div>

          {/* Campos editáveis */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="panel-status">Status</Label>
              <Select
                id="panel-status"
                value={task.status}
                onChange={(e) => onPatch({ status: e.target.value as TaskStatus })}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TASK_STATUS_META[s].label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="panel-priority">Prioridade</Label>
              <Select
                id="panel-priority"
                value={task.priority}
                onChange={(e) => onPatch({ priority: e.target.value as TaskPriority })}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {TASK_PRIORITY_META[p].label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="panel-assignee">Responsável</Label>
              <Select
                id="panel-assignee"
                value={task.assigneeId ?? ""}
                onChange={(e) => onPatch({ assigneeId: e.target.value || null })}
              >
                <option value="">Não atribuída</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="panel-start">Data de início</Label>
              <Input
                id="panel-start"
                type="date"
                value={task.startDate ?? ""}
                onChange={(e) => onPatch({ startDate: e.target.value || null })}
              />
            </div>
            <div>
              <Label htmlFor="panel-due">Prazo</Label>
              <Input
                id="panel-due"
                type="date"
                value={task.dueDate ?? ""}
                onChange={(e) => onPatch({ dueDate: e.target.value || null })}
              />
            </div>
            <div>
              <Label>Projeto</Label>
              <p className="flex h-9 items-center gap-2 rounded-md border border-transparent px-1 text-sm text-text">
                {task.projectColor && (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: task.projectColor }}
                    aria-hidden
                  />
                )}
                {task.projectName ?? "Sem projeto"}
              </p>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="panel-description">Descrição</Label>
            <Textarea
              id="panel-description"
              defaultValue={task.description}
              placeholder="Adicione contexto, critérios de aceite…"
              rows={5}
              onBlur={(e) => {
                if (e.target.value !== task.description) {
                  onPatch({ description: e.target.value });
                }
              }}
            />
          </div>

          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map((tag) => (
                <TagChip key={tag.id} name={tag.name} color={tag.color} />
              ))}
            </div>
          )}
        </div>

        <Separator className="my-6" />

        {/* Subtarefas */}
        <section aria-label="Subtarefas">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">
              Subtarefas
              {task.subtasks.length > 0 && (
                <span className="ml-2 text-xs font-normal text-muted">
                  {done}/{task.subtasks.length} concluídas
                </span>
              )}
            </h3>
          </div>
          <ul className="space-y-1">
            {task.subtasks.map((sub) => (
              <li
                key={sub.id}
                className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-surface-2"
              >
                <Checkbox
                  checked={sub.done}
                  onCheckedChange={() => onToggleSubtask(sub)}
                  aria-label={`Marcar ${sub.title}`}
                />
                <span
                  className={cn(
                    "flex-1 text-sm",
                    sub.done ? "text-muted line-through" : "text-text",
                  )}
                >
                  {sub.title}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveSubtask(sub)}
                  className="opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  aria-label={`Remover ${sub.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center gap-2">
            <Input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              placeholder="Nova subtarefa…"
              className="h-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddSubtask();
                }
              }}
            />
            <Button variant="secondary" size="sm" onClick={onAddSubtask} disabled={!newSubtask.trim()}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Adicionar
            </Button>
          </div>
        </section>

        <Separator className="my-6" />

        {/* Anexos */}
        <section aria-label="Anexos">
          <h3 className="mb-3 text-sm font-semibold text-text">Anexos</h3>
          {task.attachments.length > 0 && (
            <ul className="mb-3 space-y-1.5">
              {task.attachments.map((a) => (
                <li
                  key={a.id}
                  className="group flex items-center gap-2.5 rounded-md border border-border bg-surface-2 px-3 py-2"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text">{a.fileName}</p>
                    <p className="text-[10px] text-muted">
                      {formatBytes(a.sizeBytes)} · {a.uploader?.name ?? "—"}
                    </p>
                  </div>
                  <a
                    href={`/api/attachments/${a.id}/download`}
                    className="rounded-md p-1.5 text-muted hover:bg-surface-3 hover:text-text"
                    aria-label={`Baixar ${a.fileName}`}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(a)}
                    className="rounded-md p-1.5 text-muted opacity-0 hover:bg-surface-3 hover:text-danger group-hover:opacity-100"
                    aria-label={`Remover ${a.fileName}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label
            className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted transition-colors hover:border-border-strong hover:text-text"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) onUpload(file);
            }}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Paperclip className="h-4 w-4" aria-hidden />
            )}
            {uploading ? "Enviando…" : "Anexar arquivo (até 10 MB)"}
            <input
              type="file"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = "";
              }}
            />
          </label>
        </section>

        <Separator className="my-6" />

        {/* Comentários */}
        <section aria-label="Comentários">
          <h3 className="mb-3 text-sm font-semibold text-text">
            Comentários
            {task.comments.length > 0 && (
              <span className="ml-2 text-xs font-normal text-muted">{task.comments.length}</span>
            )}
          </h3>
          <ul className="space-y-4">
            {task.comments.map((c) => (
              <li key={c.id} className="group flex gap-3">
                <Avatar name={c.author.name} color={c.author.avatarColor} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-text">{c.author.name}</span>
                    <span className="text-[10px] text-muted" title={formatDateTimeBR(c.createdAt)}>
                      {formatRelative(c.createdAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveComment(c)}
                      className="ml-auto text-muted opacity-0 hover:text-danger group-hover:opacity-100"
                      aria-label="Remover comentário"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                    {c.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escreva um comentário…"
              rows={2}
              className="min-h-[60px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  onAddComment();
                }
              }}
            />
            <Button
              variant="primary"
              size="icon"
              onClick={onAddComment}
              loading={savingComment}
              disabled={!comment.trim()}
              aria-label="Enviar comentário"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </section>

        <Separator className="my-6" />

        {/* Histórico */}
        <section aria-label="Histórico">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
            <ActivityIcon className="h-4 w-4 text-muted" aria-hidden />
            Histórico de alterações
          </h3>
          {activity.length === 0 ? (
            <p className="text-sm text-muted">Sem alterações registradas.</p>
          ) : (
            <ul className="space-y-2.5">
              {activity.map((event) => (
                <li key={event.id} className="flex items-start gap-2.5">
                  <Avatar name={event.actorName} color={event.actor?.avatarColor} size="xs" className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-relaxed text-muted">
                      <span className="font-medium text-text">{event.actorName}</span>{" "}
                      {describeEvent(event)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted/70">
                      {formatDateTimeBR(event.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Rodapé com ações */}
      <div className="flex items-center justify-between border-t border-border px-6 py-4">
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button variant="secondary" size="sm" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Editar
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onArchive} className="text-muted">
            <Archive className="h-3.5 w-3.5" aria-hidden />
            Arquivar tarefa
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <CalendarIcon className="h-3.5 w-3.5" aria-hidden />
          Criada em {formatDateBR(task.createdAt.slice(0, 10))}
          <span className="mx-1">·</span>
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          {done}/{task.subtasks.length || 0}
        </div>
      </div>
    </>
  );
}

function describeEvent(event: ActivityDTO): string {
  const changes = (event.metadata as { changes?: { field: string; from: unknown; to: unknown }[] })
    ?.changes;
  const fieldLabels: Record<string, string> = {
    status: "status",
    priority: "prioridade",
    assigneeId: "responsável",
    dueDate: "prazo",
    startDate: "início",
    title: "título",
    description: "descrição",
    projectId: "projeto",
  };
  if (event.action === "task.created") return "criou esta tarefa";
  if (event.action === "comment.created") return "comentou";
  if (event.action === "subtask.created") return "adicionou uma subtarefa";
  if (event.action === "subtask.completed") return "concluiu uma subtarefa";
  if (event.action === "subtask.reopened") return "reabriu uma subtarefa";
  if (event.action === "subtask.deleted") return "removeu uma subtarefa";
  if (event.action === "attachment.uploaded") return "enviou um anexo";
  if (event.action === "attachment.deleted") return "removeu um anexo";
  if (event.action === "task.archived") return "arquivou esta tarefa";
  if (event.action === "task.restored") return "restaurou esta tarefa";
  if (changes && changes.length > 0) {
    return `alterou ${changes
      .map((c) => `${fieldLabels[c.field] ?? c.field}: ${String(c.from ?? "—")} → ${String(c.to ?? "—")}`)
      .join(" · ")}`;
  }
  return "atualizou esta tarefa";
}
