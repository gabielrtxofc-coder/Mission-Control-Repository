#!/usr/bin/env bash
# =============================================================================
# Mission Control — backup do PostgreSQL
# Uso: DATABASE_URL="postgresql://..." ./scripts/db-backup.sh [arquivo]
# =============================================================================
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ Defina DATABASE_URL (ex.: postgresql://user:pass@host:5432/mission_control)" >&2
  exit 1
fi

DESTINO="${1:-backups/mission_control_$(date +%Y%m%d_%H%M%S).sql.gz}"
mkdir -p "$(dirname "$DESTINO")"

echo "→ Gerando backup em $DESTINO ..."
pg_dump --no-owner --no-privileges --clean --if-exists "$DATABASE_URL" | gzip > "$DESTINO"

echo "✅ Backup concluído: $DESTINO ($(du -h "$DESTINO" | cut -f1))"
echo "   Restaure com: ./scripts/db-restore.sh $DESTINO"
