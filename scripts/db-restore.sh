#!/usr/bin/env bash
# =============================================================================
# Mission Control — restauração de backup do PostgreSQL
# Uso: DATABASE_URL="postgresql://..." ./scripts/db-restore.sh backups/arquivo.sql.gz
# ATENÇÃO: substitui o conteúdo atual do banco de destino.
# =============================================================================
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ Defina DATABASE_URL do banco de destino" >&2
  exit 1
fi

ARQUIVO="${1:-}"
if [[ -z "$ARQUIVO" || ! -f "$ARQUIVO" ]]; then
  echo "❌ Informe o arquivo de backup (ex.: backups/mission_control_20260101_120000.sql.gz)" >&2
  exit 1
fi

read -r -p "⚠️  Isso substitui os dados do banco de destino. Continuar? [s/N] " CONFIRMA
[[ "$CONFIRMA" =~ ^[Ss]$ ]] || { echo "Cancelado."; exit 0; }

echo "→ Restaurando $ARQUIVO ..."
if [[ "$ARQUIVO" == *.gz ]]; then
  gunzip -c "$ARQUIVO" | psql -v ON_ERROR_STOP=1 "$DATABASE_URL"
else
  psql -v ON_ERROR_STOP=1 "$DATABASE_URL" < "$ARQUIVO"
fi

echo "✅ Restauração concluída. Rode 'npx prisma migrate status' para conferir as migrations."
