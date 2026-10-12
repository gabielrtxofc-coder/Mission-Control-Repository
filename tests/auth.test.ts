/**
 * Testes de autenticação e sessão (fluxo 1 da missão).
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  resetDb,
  createUser,
  createWorkspace,
  addMember,
  callApi,
  login,
  db,
} from "./helpers";
import { GET as sessionGET } from "@/app/api/auth/session/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { POST as logoutPOST } from "@/app/api/auth/logout/route";
import { GET as tasksGET } from "@/app/api/tasks/route";

describe("Autenticação", () => {
  beforeAll(async () => {
    await resetDb();
  });

  beforeEach(async () => {
    await resetDb();
    const user = await createUser("Ana Teste", "ana@test.local", "senha-forte-123");
    const ws = await createWorkspace();
    await addMember(ws.id, user.id, "ADMIN");
  });

  it("rejeita login com senha incorreta", async () => {
    const { status, json } = await callApi(loginPOST, "/api/auth/login", {
      method: "POST",
      body: { email: "ana@test.local", password: "errada" },
    });
    expect(status).toBe(401);
    expect((json as { error: { code: string } }).error.code).toBe("unauthorized");
  });

  it("rejeita login de e-mail inexistente sem revelar isso", async () => {
    const { status, json } = await callApi(loginPOST, "/api/auth/login", {
      method: "POST",
      body: { email: "naoexiste@test.local", password: "qualquer" },
    });
    expect(status).toBe(401);
    expect((json as { error: { message: string } }).error.message).toContain("E-mail ou senha");
  });

  it("aceita login válido e cria sessão persistida", async () => {
    const token = await login("ana@test.local", "senha-forte-123");
    expect(token).toBeTruthy();

    const session = await db.session.findFirst({
      where: { user: { email: "ana@test.local" } },
    });
    expect(session).not.toBeNull();
    // Nunca armazenamos o token puro
    expect(session!.tokenHash).not.toBe(token);
    expect(session!.tokenHash).toHaveLength(64);
  });

  it("sessão válida devolve o usuário no /api/auth/session", async () => {
    const token = await login("ana@test.local", "senha-forte-123");
    const { status, json } = await callApi(sessionGET, "/api/auth/session", { token });
    expect(status).toBe(200);
    expect((json as { user: { email: string } }).user.email).toBe("ana@test.local");
    expect((json as { role: string }).role).toBe("ADMIN");
  });

  it("sem sessão, rotas privadas retornam 401", async () => {
    const { status } = await callApi(tasksGET, "/api/tasks");
    expect(status).toBe(401);
    const session = await callApi(sessionGET, "/api/auth/session");
    expect(session.status).toBe(401);
  });

  it("token inválido é rejeitado", async () => {
    const { status } = await callApi(tasksGET, "/api/tasks", {
      token: "token-completamente-invalido",
    });
    expect(status).toBe(401);
  });

  it("logout revoga a sessão", async () => {
    const token = await login("ana@test.local", "senha-forte-123");
    await callApi(logoutPOST, "/api/auth/logout", { method: "POST", token });
    const { status } = await callApi(tasksGET, "/api/tasks", { token });
    expect(status).toBe(401);
  });

  it("usuário desativado não consegue usar sessão existente", async () => {
    const token = await login("ana@test.local", "senha-forte-123");
    await db.user.update({
      where: { email: "ana@test.local" },
      data: { isActive: false },
    });
    const { status } = await callApi(sessionGET, "/api/auth/session", { token });
    expect(status).toBe(401);
  });
});
