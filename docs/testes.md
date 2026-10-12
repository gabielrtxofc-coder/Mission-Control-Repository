# Testes

Quatro camadas, todas executadas nesta entrega e reproduzíveis:

## 1. Unit + integração (Vitest) — 45 testes

```bash
# pré-requisito: PostgreSQL local e TEST_DATABASE_URL no .env
# (padrão: postgresql://mission_control:mission_control_dev@127.0.0.1:5432/mission_control_test)
npm run test
```

- `tests/global-setup.ts` aplica `prisma migrate deploy` no **banco de teste** antes da
  execução; cada teste zera as tabelas (`resetDb`) — isolamento real.
- Caminhos:
  - `tests/unit/*.test.ts` — validações, rate limit, CSV, formatação, autorização.
  - `tests/integration/*.test.ts` — rotas de API completas contra Postgres real
    (login/sessão/CSRF, projetos, tarefas, kanban move, comentários/subtarefas,
    notificações, permissões, filtros/busca, export CSV).
- O rate limit permanece **ativo** nos testes (sem bypass): o isolamento vem de
  `resetRateLimits()` executado em `beforeEach` global (`tests/setup.ts`), evitando
  429 espúrios pelo acúmulo de logins do mesmo IP entre testes.
- Inclui persistência de `prefs.theme` no perfil (aceita `dark`/`light`, rejeita
  inválidos).

## 2. Smoke (curl) — 33 verificações

```bash
# com o servidor de produção rodando em localhost:3000
npm run smoke
```

- `scripts/smoke-test.sh` percorre os fluxos críticos via HTTP puro: sessão/cookie,
  CSRF, CRUD de projetos/tarefas, subtarefas, comentários, filtros, CSV, notificações,
  permissões (403 para não-admin em rota admin), arquivamento, páginas.
- Uso recomendado em staging antes de cada release.

## 3. E2E (Playwright) — 13 testes

```bash
npx playwright install chromium   # primeira vez
npm run test:e2e
```

- `tests/e2e/mission-control.spec.ts` executa em navegador real (chromium, locale
  pt-BR) contra o **servidor de produção** (`npm run start`) subido pelo próprio
  Playwright (`playwright.config.ts` → `webServer`), com `AUTH_RATE_LIMIT_DISABLED=1`
  no ambiente do servidor (somente para o teste).
- Cobre: redirecionamento de rotas, login inválido/válido, criação de projeto e tarefa
  pela interface, persistência após reload, painel da tarefa (subtarefa + comentário),
  kanban com drag-and-drop persistido no servidor, filtros/busca, calendário/linha do
  tempo, minha área e notificações (marcar como lida), busca global e alternância de
  tema claro/escuro com persistência após reload.
- Artefatos de falha em `test-results/` (screenshot, trace, contexto):
  `npx playwright show-trace test-results/<teste>/trace.zip`.

## 4. Estáticos

```bash
npm run typecheck   # tsc --noEmit (strict) — 0 erros
npm run lint        # ESLint 9 (flat config) — 0 erros/avisos
npm run build       # build de produção do Next.js
```

## Matriz de fluxos cobertos (requisito: ≥11)

1. ✅ Auth (login válido/inválido, sessão, logout, CSRF, rate limit)
2. ✅ Projeto (criar/editar/arquivar/excluir + membros + validações)
3. ✅ Tarefa (criar/editar/consultar/arquivar)
4. ✅ Status e prioridade (alterações persistidas; histórico)
5. ✅ Persistência (recarregamento E2E; banco real em todos os níveis)
6. ✅ Kanban (drag-and-drop + posição + persistência servidor)
7. ✅ Filtros e busca (status/prioridade/responsável/prazo/projeto + global)
8. ✅ Comentários e subtarefas (inclui permissões e histórico)
9. ✅ Notificações (atribuição, comentários, prazos; não lidas; marcar lidas)
10. ✅ Permissões (admin × membro; 403 em rotas administrativas)
11. ✅ Erros e estados vazios (mensagens de erro, conflict, 404, 404 workspace)
12. ✅ Extras: CSV, minha área, calendário, linha do tempo, configurações, preferências
