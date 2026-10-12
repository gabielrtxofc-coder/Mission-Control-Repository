# Arquitetura

## Visão geral

Aplicação **Next.js 15 (App Router)** monolítica, renderizada no servidor (RSC) para as
páginas, com rotas de API REST em `src/app/api/*` e interatividade via componentes de
cliente React 19. Banco **PostgreSQL** acessado exclusivamente via **Prisma**.

```
Navegador (React 19, Tailwind)
   │  fetch / form actions
   ▼
Next.js App Router
   ├── src/middleware.ts        redireciona / e /app/* sem cookie mc_session
   ├── Páginas (RSC)            leitura inicial de dados (server components)
   ├── Componentes client       kanban, formulários, painéis, filtros…
   └── /api/* (route handlers)  JSON REST, validação Zod, autorização
          │
          ▼
     src/lib/api.ts             apiHandler: sessão, papel, CSRF, erros padronizados
     src/lib/services/*         regras: notificações + atividades
          │
          ▼
     Prisma Client ──► PostgreSQL
```

## Camadas

1. **Middleware (edge)** — apenas redirecionamento de UI baseado no cookie de sessão;
   nunca decide autorização (o cookie pode ser inspecionado, não validado, no edge).
2. **Páginas RSC** — chamam `getCurrentUser()`/`getWorkspaceContext()` e consultam o
   banco no servidor; enviam os dados iniciais aos componentes de cliente.
3. **Route handlers (`/api/*`)** — toda mutação e leitura dinâmica passa por
   `apiHandler`, que: parseia/valida corpo e query com Zod, resolve o usuário pela
   sessão, exige papel quando necessário (`adminOnly`), aplica `checkOrigin` (CSRF),
   captura `ApiError`/`ZodError` e responde JSON de erro padronizado:
   `{"error":{"code":"…","message":"…","details"?}}`.
4. **Serviços** — `notification-service` (criação de notificações por tipo, com
   deduplicação de "prazos próximos") e `activity-service` (eventos imutáveis).
   Handlers de API orquestram validação + Prisma + serviços.

## Autorização (sempre no servidor)

- **Sessão**: cookie `mc_session` com token de 32 bytes (hex 64). O banco guarda
  `tokenHash` (SHA-256 do token) — um vazamento do banco não expõe sessões.
- **Workspace**: cada requisição autenticada resolve `WorkspaceMember` do usuário;
  consultas filtram por `workspaceId` e validações de existência usam
  `assertWorkspaceScope` (404 para itens de outro workspace — sem vazamento).
- **Papéis**: `ADMIN` e `MEMBER`. `adminOnly: true` em rotas administrativas
  (membros, workspace, preferências globais). Membros comuns operam projetos/tarefas.
- **Middleware** complementa com redirecionamento de conveniência (`/` → `/dashboard`
  ou `/login`; `/login` → `/dashboard` se já autenticado).

## Formato de respostas de API

- Sucesso: `{ "…payload": … }` (ex.: `{ "tasks": [...] }`, `{ "task": {...} }`)
- Erro: `{ "error": { "code": "bad_request|unauthorized|forbidden|not_found|conflict|rate_limited|payload_too_large|internal", "message": "…", "details"?: [...] } }`
- Códigos HTTP: 400/401/403/404/409/413/429/500 conforme o caso.

## Validação

- Esquemas Zod em `src/lib/validations.ts`, usados **no cliente** (formulários) e
  **no servidor** (route handlers) — o mesmo contrato, mensagens em português.
- Datas aceitas como `YYYY-MM-DD` (inputs) e `ISO` (APIs de comentário) com
  sanitização (`toDateOnly`).

## Front-end

- **Design system**: `src/components/ui/*` (botões, inputs, selects, dialogs, tabelas,
  toasts, skeletons…) sobre Radix UI + Tailwind, tema escuro por CSS variables com
  variante clara (`data-theme="light"`).
- **Estado**: estado local por módulo (React 19), recarga por `router.refresh()`/
  `window.location.reload()` após mutações — previsibilidade acima de otimismo; o
  Kanban usa atualização otimista com rollback em erro.
- **Drag & drop**: HTML5 pointer events próprio (`task-kanban.tsx`), sem biblioteca
  externa; ao soltar, persiste `PATCH /api/tasks/:id/move` (status + posição).
- **Profundidade**: estado importante vive na URL (`?task=`, `?status=…`, `?view=`,
  `?open=`) — compartilhar/recarregar não perde contexto.

## Dados e integridade

- Soft delete de tarefas/projetos (`archivedAt`); **atividades e notificações nunca
  são editadas pela interface** (imutabilidade de histórico).
- Índices compostos para os acessos quentes (listagens por workspace+status, prazos,
  notificações não lidas) — ver `docs/entidades.md`.
- Transações em operações com múltiplos escritos (criação de tarefa + atividade +
  notificações; movimentação kanban; alteração de membros).
- Migrações versionadas em `prisma/migrations` — qualquer mudança de schema passa por
  `prisma migrate dev`/`migrate deploy` (ver `docs/migrations.md`).

## Notificações e atividades

- `notification-service.notify(...)`: cria notificações para os usuários-alvo com
  deduplicação (ex.: "prazo próximo" no máximo 1 por tarefa/usuário).
- `activity-service.record(...)`: evento `{workspaceId, entityType, entityId, action,
  actorId, metadata}` — gravado no mesmo fluxo da mudança.
- Próximos prazos: calculados a cada carga do dashboard (notificações de
  `dueSoon` para tarefas que vencem em até 3 dias, deduplicadas).

## Observabilidade e operação

- Logs estruturados simples no servidor (`console.error` com contexto).
- `scripts/smoke-test.sh` valida os 33 fluxos críticos via HTTP contra um ambiente
  real (produção/staging).
- Backup/restauração via `pg_dump`/`psql` (scripts prontos).
