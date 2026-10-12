/**
 * Rate limiting em memória (janela deslizante). Adequado para instância única.
 * Em produção com múltiplas instâncias, substituir por Redis (Upstash etc.).
 * Defina AUTH_RATE_LIMIT_DISABLED=1 para desativar (apenas em testes E2E).
 */

type Window = number[];

const store = new Map<string, Window>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  if (process.env.AUTH_RATE_LIMIT_DISABLED === "1") return true;
  const now = Date.now();
  const window = store.get(key) ?? [];
  const recent = window.filter((ts) => now - ts < windowMs);
  if (recent.length >= limit) {
    store.set(key, recent);
    return false;
  }
  recent.push(now);
  store.set(key, recent);
  // limpeza periódica simples para não crescer sem limite
  if (store.size > 5000) {
    for (const [k, v] of store) {
      if (v.every((ts) => now - ts >= windowMs)) store.delete(k);
    }
  }
  return true;
}

export function resetRateLimits() {
  store.clear();
}
