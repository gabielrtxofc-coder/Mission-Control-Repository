# Migrations

## Onde ficam

- `prisma/schema.prisma` — fonte de verdade do modelo.
- `prisma/migrations/` — migrations versionadas em SQL (geradas pelo Prisma),
  aplicadas na ordem cronológica; cada uma registrada em `_prisma_migrations`
  com checksum.

## Fluxo de trabalho

```bash
# Desenvolvimento — cria migration a partir da diferença schema ↔ banco
npx prisma migrate dev --name descricao_da_mudanca

# Produção / CI — aplica migrations pendentes (sem prompt)
npm run db:migrate        # = prisma migrate deploy

# Estado atual
npx prisma migrate status

# Cliente Prisma após mudanças
npx prisma generate
```

## Regras adotadas

1. **Nunca** editar uma migration já aplicada em outros ambientes — criar uma nova.
2. Toda mudança de modelo passa por `migrate dev` (não editar o banco à mão).
3. Seeds (`prisma/seed.ts`) são idempotentes e **apenas para desenvolvimento**.
4. Em produção, `migrate deploy` roda no processo de deploy (build/start), nunca
   `migrate dev`/`db push`.

## Migrations desta entrega

| Migration | Conteúdo |
|---|---|
| `20261006174429_init` | Schema completo inicial: workspace, usuários, sessões, membros, projetos, tarefas, subtarefas, comentários, anexos, etiquetas, notificações, atividades, enums e índices |

## Migração entre ambientes (banco existente)

```bash
# 1. Backup do banco de origem
DATABASE_URL="postgresql://..." ./scripts/db-backup.sh backup.sql.gz

# 2. Criar banco de destino e aplicar migrations
DATABASE_URL="postgresql://novo..." npm run db:migrate

# 3. Restaurar os dados
DATABASE_URL="postgresql://novo..." ./scripts/db-restore.sh backup.sql.gz

# 4. Conferir
DATABASE_URL="postgresql://novo..." npx prisma migrate status
```

`pg_dump` usa `--clean --if-exists` para que a restauração funcione também sobre um
banco que já tenha o schema.
