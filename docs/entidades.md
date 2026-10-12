# Entidades (modelo de dados)

Banco: **PostgreSQL**. ORM: **Prisma** (`prisma/schema.prisma`). IDs: CUID. Timestamps:
`createdAt`/`updatedAt` em todas as entidades relevantes.

## Workspace & usuários

```
Workspace
  id, name, slug (único), createdAt, updatedAt
  └─1──n WorkspaceMember
           userId → User, role: ADMIN | MEMBER, joinedAt
           @@unique([workspaceId, userId])

User
  id, email (único), name, passwordHash, avatarColor,
  theme: DARK | LIGHT, sidebarCollapsed: bool, dateDensity: COMPACT | COMFORTABLE,
  notifyEmail: bool, createdAt, updatedAt

Session
  id, userId → User, tokenHash (único, SHA-256 do token),
  userAgent?, ip?, createdAt, expiresAt
  índice: expiresAt (limpeza), userId
```

- Um usuário pertence a um workspace via `WorkspaceMember` (modelo V1 de workspace
  único por usuário; o schema já usa `@@unique([workspaceId, userId])` pronto para
  multi-workspace futuro).
- `passwordHash`: bcrypt. `tokenHash`: SHA-256 — o token puro só existe no cookie.

## Projetos

```
Project
  id, workspaceId → Workspace, name, description?,
  status: PLANNING | ACTIVE | ON_HOLD | DONE | CANCELED,
  color, ownerId → User, startDate?, endDate?, archivedAt?, progress (int 0–100)
  └─1──n ProjectMember   projectId, userId  @@unique([projectId, userId])

Tag
  id, workspaceId, name, color   @@unique([workspaceId, name])
```

- `progress` é mantido por cálculo (tarefas concluídas / total) nas mutações de tarefa.

## Tarefas

```
Task
  id, workspaceId, projectId? → Project, title, description,
  status: TODO | IN_PROGRESS | IN_REVIEW | DONE | BLOCKED,
  priority: LOW | NORMAL | HIGH | URGENT,
  assigneeId? → User, creatorId → User,
  startDate?, dueDate?, position (float p/ ordenação kanban),
  archivedAt?, createdAt, updatedAt
  ├─1──n Subtask     title, completed, completedAt?
  ├─1──n Comment     authorId, body, createdAt
  ├─1──n Attachment  filename, originalName, mimeType, size, uploaderId
  └─m──n TaskTag     taskId + tagId
```

## Notificações & atividades

```
Notification
  id, workspaceId, userId (destinatário), actorId? (quem causou),
  type: TASK_ASSIGNED | TASK_STATUS | TASK_PRIORITY | TASK_DUE_SOON
        | TASK_COMMENT | TASK_COMMENT_REPLY | PROJECT_ASSIGNED | SYSTEM,
  title, body?, taskId?, projectId?, readAt?, createdAt

ActivityEvent
  id, workspaceId, entityType: PROJECT | TASK, entityId,
  action: created | updated | status_changed | priority_changed
          | assignee_changed | project_changed | due_changed
          | archived | restored | member_added | member_removed,
  actorId, metadata (JSON), createdAt
```

- `ActivityEvent` é **imutável** pela aplicação (sem rota de update/delete).
- Índices principais:
  - `Task(workspaceId, archivedAt, status)`, `Task(workspaceId, assigneeId, archivedAt)`,
    `Task(projectId, archivedAt)`, `Task(dueDate)`
  - `Notification(userId, readAt, createdAt)`, `Notification(taskId)`
  - `ActivityEvent(workspaceId, createdAt)`, `ActivityEvent(entityType, entityId, createdAt)`
  - `Session(expiresAt)`, `Session(userId)`
  - `Project(workspaceId, archivedAt)`, `Project(workspaceId, status)`

## Regras de integridade

- Exclusão de projeto com tarefas é bloqueada (409) — sugere arquivar.
- Usuário com tarefas não concluídas não pode ser removido (409).
- Tarefas arquivadas ficam fora das listas padrão (`archivedAt: null`); arquivamento é
  reversível (restaurar).
- `onDelete`: `Cascade` para Session/Comment/Subtask/Attachment/TaskTag/
  ProjectMember/Notification do usuário; `SetNull` para campos opcionais
  (assignee, actor, projectId…).
