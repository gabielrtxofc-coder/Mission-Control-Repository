# Mission Control

Software web de **gestão de projetos, tarefas e operações** para equipes pequenas —
pensado para o dia a dia de uma startup com poucos membros. Interface premium em tema
escuro (preto/grafite + verde-limão neon), desktop excelente e mobile funcional.

> V1 funcional, testada e pronta para implantação. Não é um protótipo: todos os
> módulos abaixo persistem dados reais em **PostgreSQL** e foram verificados por
> testes automatizados (unitários, integração, smoke e E2E).

---

## Funcionalidades concluídas (V1)

| Módulo | O que entrega |
|---|---|
| **A. Autenticação e equipe** | Login com senha (bcrypt), sessões seguras com token + hash SHA-256, cookie `HttpOnly`/`SameSite`/`Secure` em produção, logout, perfil com troca de senha, membros do espaço (convidar por e-mail com papéis admin/membro, editar papel, remover, transferir propriedade), checagem de origem (CSRF) e rate limit, **proteção de rotas no servidor + middleware** |
| **B. Dashboard** | Dados reais do banco: projetos ativos, minhas tarefas, em andamento, concluídas, atrasadas, prazos dos próximos 7 dias, distribuição por status e prioridade, progresso médio dos projetos, atividade recente do espaço, ações rápidas e **todos os indicadores são navegáveis** (clicou, filtrou) |
| **C. Projetos** | Criar/editar/excluir, cor de identificação, responsável, status, datas, descrição, membros do projeto (com validação de pertencimento ao espaço), progresso calculado das tarefas, arquivar/restaurar, **página de detalhes** com tarefas e atividade do projeto |
| **D. Tarefas** | Título, descrição, projeto, responsável, criador, status (A fazer / Em andamento / Em revisão / Concluída / Bloqueada), prioridade (Baixa/Normal/Alta/Urgente), datas de início e prazo, etiquetas (do espaço), subtarefas com conclusão, comentários em linha do tempo, **histórico imutável** de mudanças, upload de anexos (ver limitações) |
| **E. Visualizações** | **Lista** (ordenação por colunas, edição eficiente inline de status/prioridade/responsável), **Kanban** com drag-and-drop HTML5 **salvando no servidor** (posição/ordem persistida), **Calendário** navegável por mês com tarefas por dia, **Linha do tempo** com barras em posições/durações reais derivadas das datas |
| **F. Painel da tarefa** | Painel lateral (sheet) com edição completa, subtarefas, comentários, histórico de atividades e seleção de tags; **profundidade via URL** (`/tasks?task=<id>` — recarregar reabre o painel) |
| **G. Busca e filtros** | Busca global por título/descrição no cabeçalho; filtros por status, prioridade, responsável, projeto, prazo (de/até); ordenação; **indicador de filtros ativos**; limpar filtros; contagem de resultados |
| **H. Minha área** | Minhas tarefas por estado: a fazer, em andamento, revisão, bloqueadas, vencidas, prazos de hoje e próximos 7 dias, concluídas recentes, comentários recentes |
| **I. Notificações** | Persistidas no banco: atribuição, mudanças em tarefas, comentários/respostas e prazos próximos; painel rápido no topo (não lidas, marcar como lida, navegação); página completa com filtro "Não lidas" e "Marcar todas como lidas" |
| **J. Atividade e histórico** | Eventos imutáveis criados por mudança de status, prioridade, responsável, projeto, prazo, arquivamento; visíveis no dashboard, no projeto e no painel da tarefa; **não há como editar/apagar pela interface** |
| **K. Configurações** | Perfil, preferências (tema, sidebar, densidade de datas, notificações por e-mail) persistidas, membros, permissões (papéis), dados e nome do espaço de trabalho |
| **L. Dados** | **Exportação CSV** de tarefas (UTF-8 com BOM, aplica filtros atuais), scripts de **backup/restauração** (`scripts/db-backup.sh`, `scripts/db-restore.sh`) e documentação de migração |

Extras de plataforma: **prefers-reduced-motion**, **tema claro completo** (alternável em
Configurações → Aparência, persistido por usuário), responsividade mobile (sidebar em
drawer), toasts acessíveis, estados de carregamento (skeletons), estados vazios com CTA
e tratamento de erros.

---

## Stack real

- **Next.js 15.5.27** (App Router) + **React 19.3** + **TypeScript 5.9 (strict)**
- **Tailwind CSS 3.4** + componentes estilo shadcn (Radix UI: dialog, select, popover,
  dropdown, tooltip, tabs, switch, checkbox, avatar, label, separator)
- **PostgreSQL** (qualquer hospedagem: Neon, Railway, Supabase Postgres, RDS…)
- **Prisma 6.19** com migrations versionadas (`prisma/migrations`)
- **Zod** (validação compartilhada cliente/servidor), **bcryptjs**, **date-fns**, **sonner**
- **Vitest** (unit/integração) + **Playwright** (E2E) + smoke via curl
- Sem qualquer componente de IA no produto; sem integrações externas; sem cobrança.

---

## Início rápido

```bash
# 1. Pré-requisitos: Node.js 20+ e um PostgreSQL 14+ (ex.: local, Neon, Railway)

# 2. Dependências e variáveis
npm install
cp .env.example .env
# edite .env: defina DATABASE_URL, NEXT_PUBLIC_APP_URL e NEXT_PUBLIC_APP_NAME

# 3. Banco (cria e aplica as migrations versionadas)
npm run db:migrate

# 4. (Opcional) dados de demonstração — somente em desenvolvimento
npm run db:seed
# credenciais demo: ana@demo.local / demo12345  ·  bruno@demo.local / demo12345

# 5. Primeiro administrador real (sem senha padrão)
npm run setup:admin -- --email voce@suaempresa.com --nome "Seu Nome"
# a senha é gerada e impressa UMA vez no terminal (use ADMIN_EMAIL=.../ADMIN_NAME=...)

# 6. Suba o servidor
npm run dev   # desenvolvimento
npm run build && npm run start   # produção
```

### Scripts úteis

| Script | Função |
|---|---|
| `npm run dev` / `build` / `start` | Desenvolvimento / build / servidor de produção |
| `npm run typecheck` | `tsc --noEmit` (TypeScript strict) |
| `npm run lint` | ESLint (flat config) |
| `npm run test` / `test:watch` | Vitest (unit + integração em Postgres de teste) |
| `npm run test:e2e` | Playwright (13 testes E2E em navegador real) |
| `npm run db:migrate` / `db:studio` / `db:seed` | Migrations / Prisma Studio / seed demo |
| `npm run setup:admin` | Cria o primeiro administrador com senha gerada |
| `npm run smoke` | 33 verificações via curl contra o servidor em produção |
| `./scripts/db-backup.sh` | Backup do banco (pg_dump + gzip, com `--clean`) |
| `./scripts/db-restore.sh` | Restauração interativa de backup |

---

## Segurança

- Senhas com **bcrypt** (fator 12); nunca em texto puro; **nenhum segredo no repositório**
  (o `.env.example` traz apenas placeholders).
- Sessões com token aleatório de 256 bits; no banco fica apenas o **hash SHA-256** do
  token; expiração por inatividade absoluta (`SESSION_MAX_DAYS`) e rotação no login.
- Cookie `mc_session`: `HttpOnly`, `SameSite=Lax`, `Secure` quando `NODE_ENV=production`,
  `Path=/`, `Max-Age` calculado.
- **Autorização sempre no servidor**: cada rota valida sessão + papel (membro/admin) +
  escopo do workspace (linhas de outro workspace nunca são alcançáveis).
- **Rate limit** no login (20/5 min por IP, 10/5 min por e-mail — variável
  `AUTH_RATE_LIMIT_DISABLED=1` existe **somente para testes automatizados**).
- **Checagem de origem** (CSRF) em todas as mutações: compara `Origin` com `Host`/
  `X-Forwarded-Host` e `NEXT_PUBLIC_APP_URL` — junto com `SameSite`, bloqueia CSRF.
- Validação Zod em cliente e servidor; SQL sempre via Prisma (sem injeção).
- Uploads: extensões/tipos permitidos, nome aleatório, raiz fixa em `public/uploads`
  (desativado em produção gerenciada por design — ver limitações).

---

## Estrutura do repositório

```
prisma/schema.prisma        # modelo de dados + enums
prisma/migrations/          # migrations versionadas (SQL)
src/app/                    # páginas (App Router) e rotas de API (/api/*)
src/components/             # UI (ui/, dashboard/, projects/, tasks/, my/…)
src/lib/                    # auth, api helpers, rate limit, validações, CSV, formatação
src/lib/services/           # regras de negócio (notifications, activity)
src/middleware.ts           # redireciona rotas privadas sem sessão
tests/                      # Vitest (unit + integração em Postgres)
tests/e2e/                  # Playwright
scripts/                    # smoke-test, backup/restore, setup-admin
docs/                       # arquitetura, entidades, migrations, testes, deploy…
```

Documentação detalhada em [`docs/`](./docs/):

- [Arquitetura](./docs/arquitetura.md) · [Entidades](./docs/entidades.md) ·
  [Migrations](./docs/migrations.md) · [Testes](./docs/testes.md) ·
  [Deploy](./docs/deploy.md) · [Limitações](./docs/limitacoes.md)

---

## Resultados de qualidade (executados nesta entrega)

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` (strict) | ✅ 0 erros |
| `npx eslint .` | ✅ 0 erros/avisos |
| `npx vitest run` | ✅ **45/45** (unit + integração em Postgres real) |
| `bash scripts/smoke-test.sh` | ✅ **33/33** (fluxos via API em produção) |
| `npx playwright test` | ✅ **13/13** (navegador real: auth, projetos, tarefas, kanban, filtros, calendário, minha área, notificações, busca, tema) |
| `npm run build` | ✅ build de produção Next.js |
