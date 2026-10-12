/**
 * Helpers de teste: factories de dados, chamadas de API e contexto de auth.
 */
import { NextRequest } from "next/server";
import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { cookieJar } from "./setup";

export const db = new PrismaClient();

export async function resetDb() {
  // Ordem respeita FKs
  await db.$executeRawUnsafe(`DELETE FROM "Notification"`);
  await db.$executeRawUnsafe(`DELETE FROM "ActivityEvent"`);
  await db.$executeRawUnsafe(`DELETE FROM "Comment"`);
  await db.$executeRawUnsafe(`DELETE FROM "Subtask"`);
  await db.$executeRawUnsafe(`DELETE FROM "Attachment"`);
  await db.$executeRawUnsafe(`DELETE FROM "TaskTag"`);
  await db.$executeRawUnsafe(`DELETE FROM "Tag"`);
  await db.$executeRawUnsafe(`DELETE FROM "Task"`);
  await db.$executeRawUnsafe(`DELETE FROM "ProjectMember"`);
  await db.$executeRawUnsafe(`DELETE FROM "Project"`);
  await db.$executeRawUnsafe(`DELETE FROM "Session"`);
  await db.$executeRawUnsafe(`DELETE FROM "WorkspaceMember"`);
  await db.$executeRawUnsafe(`DELETE FROM "Workspace"`);
  await db.$executeRawUnsafe(`DELETE FROM "User"`);
}

export async function createUser(
  name: string,
  email = `${name.toLowerCase()}-${randomBytes(3).toString("hex")}@test.local`,
  password = "senha-teste-123",
) {
  return db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
}

export async function createWorkspace(name = "Workspace Teste") {
  return db.workspace.create({
    data: { name, slug: `ws-test-${randomBytes(4).toString("hex")}` },
  });
}

export async function addMember(workspaceId: string, userId: string, role: Role = "MEMBER") {
  return db.workspaceMember.create({
    data: { workspaceId, userId, role },
  });
}

export async function createWorkspaceWithUser(name: string, role: Role = "ADMIN") {
  const user = await createUser(name);
  const workspace = await createWorkspace(`WS ${name}`);
  await addMember(workspace.id, user.id, role);
  return { user, workspace };
}

/** Contexto de autenticação direto (sem HTTP) para testar serviços. */
export function authCtx(user: { id: string; name: string; email: string }, workspaceId: string, role: Role = "ADMIN") {
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: "",
      jobTitle: null,
      avatarColor: "#A3E635",
      prefs: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    workspace: {
      id: workspaceId,
      name: "Test",
      slug: "test",
      settings: {},
    },
    role,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string;
  params?: Record<string, string>;
  search?: string;
};

/** Chama um route handler Next diretamente, com cookies controláveis. */
export async function callApi(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<any>,
  url: string,
  options: ApiOptions = {},
) {
  const { method = "GET", body, token, params = {}, search = "" } = options;
  if (token) {
    cookieJar.set("mc_session", token);
  }
  const req = new NextRequest(`http://localhost:3000${url}${search}`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: {
      "Content-Type": "application/json",
    },
  });
  const res = await handler(req, { params: Promise.resolve(params) });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text, res };
}

export async function login(email: string, password: string): Promise<string> {
  const { POST } = await import("@/app/api/auth/login/route");
  const { status, json, res } = await callApi(POST, "/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (status !== 200) {
    throw new Error(`Login falhou (${status}): ${JSON.stringify(json)}`);
  }
  // Extrai o token do cookie setado na resposta
  const cookie = res.cookies.get("mc_session");
  if (cookie?.value) {
    cookieJar.set("mc_session", cookie.value);
    return cookie.value;
  }
  const token = cookieJar.get("mc_session");
  if (!token) throw new Error("Login não definiu cookie de sessão.");
  return token;
}
