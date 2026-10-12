/**
 * Setup global dos testes: mock de `next/headers` (cookies) para poder
 * chamar os route handlers fora do runtime do Next.
 */
import { vi, beforeEach } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";

export const cookieJar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined,
    getAll: () => [...cookieJar.entries()].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  }),
  headers: async () => new Headers(),
  draftMode: async () => ({ isEnabled: false, enable: () => {}, disable: () => {} }),
}));

beforeEach(() => {
  cookieJar.clear();
  // O rate limit é por IP em memória; sem reset, o acúmulo de logins
  // entre testes do mesmo arquivo geraria 429 espúrios.
  resetRateLimits();
});
