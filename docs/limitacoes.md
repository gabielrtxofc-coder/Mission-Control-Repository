# Limitações e pendências conhecidas (V1)

Conforme o princípio de não fingir completude, segue o que **não** está pronto ou foi
delimitado nesta entrega.

## Limitações de escopo (deliberadas)

1. **Anexos/arquivos**: o modelo (`Attachment`) e o endpoint de upload com validação de
   extensão/tipo/tamanho e nome aleatório estão implementados para disco local
   (`UPLOADS_DIR`, padrão `public/uploads`) e ficam **desativados em produção gerenciada**
   (ex.: Vercel), onde o filesystem é efêmero. Para produção em nuvem, plugar um
   storage de objetos (S3/R2/Blob) — a UI e o modelo já suportam anexos.
2. **Multi-workspace por usuário**: o schema suporta (`WorkspaceMember` com
   `@@unique([workspaceId, userId])`), mas a UI assume um workspace único por usuário
   (caso de uso real da equipe). Trocar de workspace não é exposto.
3. **Convite de membros**: novos usuários são criados com **senha definida pelo
   administrador no momento da adição** (que pode trocá-la em "Configurações → Minha
   conta"). Não há e-mail de convite/magic link (sem integrações externas por requisito).
4. **Notificações por e-mail**: a preferência existe e persiste (`notifyEmail`), mas o
   disparo de e-mail não foi implementado (sem provedor externo por requisito) — as
   notificações in-app são completas.
5. **Reordenação manual de tarefas na lista**: o Kanban persiste `position`; a lista
   ordena por colunas (prazo, atualizada…), não por arrasto manual.
6. **Uploads em produção**: ver item 1.
7. **Restauração de itens arquivados em massa / lixeira**: arquivamento é por item e
   reversível; não há página de lixeira com expurgo automático.

## Diferenças de ambiente

- Os dados de demonstração (`npm run db:seed`) existem **apenas em desenvolvimento** —
  o fluxo de produção começa vazio com `setup:admin`.
- O bypass de rate limit (`AUTH_RATE_LIMIT_DISABLED=1`) é exclusivo de testes; não
  definir em produção.

## Riscos e melhorias futuras (backlog)

- Testes de carga/não funcionais (a V1 foi validada funcionalmente).
- Índices/text-search avançado para busca global (hoje `ILIKE` sobre título/descrição —
  suficiente para o volume de uma equipe pequena).
- Paginação em comentários/histórico (hoje limites de 20–200 com carregamento total
  nos painéis de projeto/tarefa — adequado ao volume atual).
- i18n: produto em português; não há alternância de idioma.
- 2FA/SSO, audit log exportável, webhooks: fora do escopo V1 (sem integrações externas).

## Bugs corrigidos durante o desenvolvimento (registro)

- `ApiError` sem try/catch em route handlers → 500 sem corpo (padronizado `jsonError`).
- Vitest + `NextResponse`: `json()`+`text()` quebra o corpo — ler `text()` uma vez.
- Formulários controlados com `useEffect` de reset competindo com digitação — reset
  durante o render.
- `assertMembersInWorkspace` sem deduplicação → 400 ao criar projeto quando o
  responsável também era membro.
- Validação de origem estrita por `req.url` bloqueava `127.0.0.1` vs `localhost` →
  comparação por `Host`/`X-Forwarded-Host`.
- Rate limit do login atrapalhava E2E → bypass isolado por variável de ambiente.
- Tarefa concluída exibia selo "atrasada" na lista/kanban → selo só para status
  não-concluídos (painel e projeto já tratavam).
- Título do calendário "Outubro De 2026" (`capitalize` no CSS) → capitalização só da
  primeira letra (`capitalizeFirst`).
- Tema claro prometido mas sem implementação → variante clara real via
  `data-theme="light"` + classe `dark` (tokens + variantes `dark:` nos selos),
  seletor em Configurações → Aparência e `prefs.theme` persistido.
- 429 espúrio no Vitest ao crescer a suíte (limite por IP acumulado no arquivo) →
  `resetRateLimits()` em `beforeEach` global de `tests/setup.ts`.
