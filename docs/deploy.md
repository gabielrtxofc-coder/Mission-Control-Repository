# Deploy

## Arquitetura de produção

- **App**: Vercel (recomendado) ou qualquer host Node 20+ (Railway, Fly.io, VPS).
- **Banco**: PostgreSQL gerenciado — **Neon**, **Railway**, Supabase Postgres, RDS…
  (o app usa apenas `DATABASE_URL`; nenhuma extensão específica é exigida).
- **Região**: escolha a mesma região do banco e do app para latência mínima.

> Nenhuma credencial de hospedagem foi configurada nesta entrega (não foi fornecida e
> não se inventa). Tudo está preparado para plugar o `DATABASE_URL` real e subir.

## Passos (Vercel + Neon, exemplo)

1. **Banco**: crie um projeto Postgres (Neon/Railway) e copie a connection string
   (`postgresql://user:pass@host/db?sslmode=require`).
2. **Variáveis de ambiente** (painel da Vercel):

   | Variável | Obrigatória | Valor |
   |---|---|---|
   | `DATABASE_URL` | sim | connection string do Postgres |
   | `NEXT_PUBLIC_APP_URL` | sim | URL pública final (ex.: `https://mission-control.vercel.app`) |
   | `NEXT_PUBLIC_APP_NAME` | não | nome exibido (padrão "Mission Control") |
   | `SESSION_MAX_DAYS` | não | duração da sessão (padrão 14) |
   | `UPLOADS_DIR` | não | ver "Anexos" em limitações |
   | `AUTH_RATE_LIMIT_DISABLED` | **não usar em produção** | somente testes |

3. **Deploy**: importe o repositório; build command padrão (`next build`);
   o `@prisma/client` gera no `postinstall` automaticamente.
4. **Migrations**: após o primeiro deploy (ou no CI antes dele):
   ```bash
   DATABASE_URL="..." npx prisma migrate deploy
   ```
   Na Vercel, uma opção comum é rodar `migrate deploy` num build step ou via
   `vercel deploy --prebuilt` em pipeline com um job dedicado.
5. **Primeiro administrador** (uma vez, com `vercel ssh`/job ou local apontando para o
   banco de produção):
   ```bash
   DATABASE_URL="..." ADMIN_EMAIL=voce@empresa.com npm run setup:admin
   ```
   A senha é gerada e impressa uma única vez — guarde-a.
6. **Smoke em produção**:
   ```bash
   BASE_URL="https://seu-app.vercel.app" ./scripts/smoke-test.sh
   ```

## Checklist de segurança pós-deploy

- [ ] `NODE_ENV=production` (o cookie de sessão ganha flag `Secure` automaticamente)
- [ ] `NEXT_PUBLIC_APP_URL` = domínio final (validação de origem/CSRF)
- [ ] Banco acessível apenas pelo app (firewall/IP allowlist da Vercel/Neon)
- [ ] SSL obrigatório na connection string (`sslmode=require`)
- [ ] `setup:admin` executado com e-mail real; nenhum usuário demo no banco
- [ ] (Opcional) desativar `npm run db:seed` em qualquer pipeline de produção
- [ ] Backups automáticos do provedor do banco **ativados** (e `db-backup.sh` agendado
      para backup independente, se desejado)

## Outros hosts (Railway/Fly/VPS)

- Build: `npm ci && npm run build`; Start: `npm run start`; porta `PORT` (Next a usa
  por padrão).
- Rode `npx prisma migrate deploy` no start (entrypoint) ou como job de release.
- Em VPS, sirva atrás de proxy com TLS (Caddy/Nginx) e configure
  `NEXT_PUBLIC_APP_URL` com o domínio.

## Variáveis de ambiente (resumo)

`.env.example` documenta placeholders. **Nenhum segredo deve entrar no repositório.**
