# Mission Control V1 — Decisões Técnicas

Registro de decisões de arquitetura (Fase 1). Atualizado durante a implementação.

## Stack efetiva

| Camada | Escolha | Versão | Justificativa |
|---|---|---|---|
| Framework | Next.js (App Router) | 15.5 | Requisito da missão; linha estável madura (16.x é muito recente para assumir risco) |
| UI | React | 19.3 | Compatível com Next 15 |
| Linguagem | TypeScript | 5.9 (strict) | Compatibilidade comum ecossistema |
| Estilo | Tailwind CSS | 3.4 | Tokens CSS variáveis + tema escuro; evita risco da migração v4 |
| Componentes | Primitivos Radix UI + kit próprio (`src/components/ui`) | — | Equivalente shadcn/ui, identidade visual própria, acessibilidade |
| Banco | PostgreSQL | 17 (local) | Requisito; sem Supabase; via `DATABASE_URL` |
| ORM | Prisma | 6.19 | Migrations versionadas, tipagem, parametrização |
| Validação | Zod | 3.25 | Cliente + servidor (APIs e forms) |
| Senhas | bcryptjs (cost 12) | — | Hash bcrypt, implementação pura-JS (sem toolchain nativa) |
| Sessão | Sessões opacas próprias (token aleatório 256-bit, SHA-256 no banco, cookie httpOnly) | — | Abaixo |
| Datas | date-fns 4 + datas date-only (YYYY-MM-DD) | — | Evita bugs de fuso em prazos |
| Testes | Vitest 3 (unit/integração) + Playwright 1.64 (E2E) | — | Integração roda contra PostgreSQL real de teste |
| Ícones | lucide-react | — | Consistência |
| Toasts | sonner | — | Leve e acessível |

## Decisões estruturais

1. **Autenticação própria em módulo único (`src/lib/auth`)**: tokens opacos aleatórios
   (`crypto.randomBytes`), somente o hash SHA-256 é persistido; cookie `mc_session`
   httpOnly + SameSite=Lax + Secure em produção; expiração e revogação por sessão;
   logout destroi a sessão. Motivo: requisitos de sessão segura atendidos de forma
   auditável, sem dependência em beta/lib externa de auth. Rotas privadas protegidas
   por middleware (UX) + verificação de sessão no servidor (autorização real) em
   todas as rotas de leitura/escrita.
2. **Primeiro administrador**: script `npm run setup:admin` (variáveis
   `ADMIN_EMAIL`, `ADMIN_PASSWORD` ou senha gerada impressa uma única vez).
   Nenhuma credencial padrão em produção.
3. **Multi-espaço no modelo, um espaço ativo na V1**: tabelas `Workspace`,
   `WorkspaceMember` com papel `ADMIN`/`MEMBER`. Toda query é filtrada pelo
   workspace do usuário autenticado; acesso cruzado é negado no servidor.
4. **Escopo de permissão V1** (colaboração-first, dois fundadores):
   - Membro do workspace: ver/editar projetos e tarefas do workspace, comentar,
     editar o próprio perfil.
   - ADMIN: tudo acima + gerenciar membros, configurações do espaço, desativar usuários.
   - Dados de outro workspace: sempre negado. Autorização sempre validada no servidor.
   - Histórico de atividade: imutável pela interface.
5. **Responsável único por tarefa** (`assigneeId`): simplifica notificações,
   dashboard e UI. Evoluir para N:N depois é trivial (tabela de associação).
6. **Status/prioridades fixos como enums** (A fazer, Em andamento, Em revisão,
   Concluída, Bloqueada / Baixa, Normal, Alta, Urgente): customização de status
   ficou fora da V1 por segurança de consistência das visualizações.
7. **Datas como date-only** (`@db.Date`, lidas como `YYYY-MM-DD`): prazos e
   calendários sem ambiguidade de fuso; "hoje" calculado em `APP_TIMEZONE`
   (default `America/Sao_Paulo`).
8. **Anexos** implementados com driver de armazenamento local (`var/uploads/`)
   servidos por rota autorizada (stream + verificação de membership), limite 10 MB,
   allowlist de MIME. Em produção serverless (Vercel) é necessário blob storage
   (S3/R2/Vercel Blob) — documentado em LIMITACOES.md.
9. **Kanban drag-and-drop próprio** (pointer events), sem dependência externa:
   controle total, testável, posição persistida (`position` float).
10. **Migrations Prisma versionadas** em `prisma/migrations`; seed de demonstração
    exclusivo de desenvolvimento (`npm run db:seed`); backup documentado com
    `scripts/db-backup.sh` (pg_dump) e restauração.
11. **Rate limiting em memória** para login e mutações sensíveis (janela deslizante).
    Suficiente para instância única; em escala usar Redis (documentado).
12. **Testes**: integração executam contra `mission_control_test` (PostgreSQL real),
    com limpeza entre testes; E2E Playwright cobrem os fluxos de aceitação.

## Regras de negócio principais

- Tarefas e projetos são **arquivados** (soft delete, `archivedAt`), nunca
  excluídos fisicamente pela interface.
- Toda mutação relevante registra `ActivityEvent` e gera `Notification` para os
  destinatários certos (atribuição, mudança em tarefa atribuída, comentário em
  tarefa envolvida, prazo próximo ≤48h — com deduplicação).
- Regras de "prazo próximo" e "atrasadas" recalculadas em consultas (sempre
  consistentes com o banco); notificações de prazo são materializadas no máximo
  uma vez por tarefa/prazo.
