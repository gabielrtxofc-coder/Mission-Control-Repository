/**
 * Autenticação e sessões — Mission Control V1.
 *
 * Modelo: sessões opacas. Um token aleatório de 256 bits é emitido no login e
 * armazenado apenas no cookie `mc_session` (httpOnly, SameSite=Lax, Secure em
 * produção). No banco persistimos somente o hash SHA-256 do token. O logout
 * revoga a sessão no banco e limpa o cookie.
 */
import type { Role, User, Workspace } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

import { SESSION_COOKIE } from "@/lib/auth/constants";
export { SESSION_COOKIE };
const SESSION_TTL_DAYS = 30;

export type SessionUser = User;

export type AuthContext = {
  user: SessionUser;
  workspace: Pick<Workspace, "id" | "name" | "slug" | "settings">;
  role: Role;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Cria a sessão no banco e devolve o token a ser gravado no cookie da resposta. */
export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ip?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
      ip: meta.ip ?? null,
    },
  });
  return { token, expiresAt };
}

/** Grava o cookie de sessão em um objeto de cookies (route handler ou server action). */
export function setSessionCookie(
  cookieStore: {
    set: (name: string, value: string, options: ReturnType<typeof sessionCookieOptions>) => void;
  },
  token: string,
) {
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_TTL_DAYS * 24 * 60 * 60));
}

export function clearSessionCookie(cookieStore: {
  set: (name: string, value: string, options: ReturnType<typeof sessionCookieOptions>) => void;
}) {
  cookieStore.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
}

/** Resolve o usuário autenticado a partir do cookie, ou null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  if (!session.user.isActive) return null;

  return session.user;
}

/**
 * Contexto completo: usuário + workspace ativo + papel.
 * Na V1 o workspace ativo é o primeiro membership do usuário (o modelo já
 * suporta múltiplos espaços).
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const membership = await db.workspaceMember.findFirst({
    where: { userId: user.id },
    orderBy: { joinedAt: "asc" },
    include: { workspace: true },
  });
  if (!membership) return null;

  return {
    user,
    workspace: {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      settings: membership.workspace.settings,
    },
    role: membership.role,
  };
}

/** Encerra a sessão atual (revoga no banco). */
export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;
  await db.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}

/** Remove sessões expiradas (pode ser chamado em tarefas de manutenção). */
export async function pruneExpiredSessions(): Promise<number> {
  const result = await db.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

/** Cliente IP aproximado a partir dos headers (proxy-aware). */
export function clientIp(req: { headers: Headers }): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip");
}
