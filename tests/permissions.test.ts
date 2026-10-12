/**
 * Testes de permissões (fluxo 10) e isolamento entre usuários/workspaces.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  resetDb,
  createUser,
  createWorkspaceWithUser,
  addMember,
  callApi,
  login,
  db,
} from "./helpers";
import { POST as tasksPOST } from "@/app/api/tasks/route";
import { GET as taskGET, PATCH as taskPATCH } from "@/app/api/tasks/[id]/route";
import { POST as membersPOST, GET as membersGET } from "@/app/api/members/route";
import { PATCH as memberPATCH, DELETE as memberDELETE } from "@/app/api/members/[id]/route";
import { POST as commentPOST } from "@/app/api/tasks/[id]/comments/route";
import { PATCH as commentPATCH } from "@/app/api/comments/[id]/route";
import { PATCH as profilePATCH } from "@/app/api/auth/profile/route";
import { PATCH as workspacePATCH } from "@/app/api/workspace/route";

describe("Permissões", () => {
  let adminToken: string;
  let memberToken: string;
  let adminId: string;
  let memberId: string;
  let wsId: string;

  beforeAll(async () => {
    await resetDb();
  });

  beforeEach(async () => {
    await resetDb();
    const admin = await createWorkspaceWithUser("Admin", "ADMIN");
    adminId = admin.user.id;
    wsId = admin.workspace.id;
    adminToken = await login(admin.user.email, "senha-teste-123");

    const member = await createUser("Member", "member@test.local");
    memberId = member.id;
    await addMember(wsId, memberId, "MEMBER");
    memberToken = await login("member@test.local", "senha-teste-123");
  });

  it("membro comum não cria membros (403)", async () => {
    const { status } = await callApi(membersPOST, "/api/members", {
      method: "POST",
      token: memberToken,
      body: { email: "novo@test.local", name: "Novo" },
    });
    expect(status).toBe(403);
  });

  it("membro comum não altera papéis (403)", async () => {
    const { status } = await callApi(memberPATCH, `/api/members/${adminId}`, {
      method: "PATCH",
      token: memberToken,
      params: { id: adminId },
      body: { role: "MEMBER" },
    });
    expect(status).toBe(403);
  });

  it("membro comum não altera configurações do workspace (403)", async () => {
    const { status } = await callApi(workspacePATCH, "/api/workspace", {
      method: "PATCH",
      token: memberToken,
      body: { name: "Hackeado" },
    });
    expect(status).toBe(403);
  });

  it("admin não remove a si mesmo", async () => {
    const { status, json } = await callApi(memberDELETE, `/api/members/${adminId}`, {
      method: "DELETE",
      token: adminToken,
      params: { id: adminId },
    });
    expect(status).toBe(400);
    expect((json as { error: { message: string } }).error.message).toContain("si mesmo");
  });

  it("workspace exige pelo menos um admin ao rebaixar", async () => {
    const { status, json } = await callApi(memberPATCH, `/api/members/${adminId}`, {
      method: "PATCH",
      token: adminToken,
      params: { id: adminId },
      body: { role: "MEMBER" },
    });
    expect(status).toBe(400);
    expect((json as { error: { message: string } }).error.message).toContain("administrador");
  });

  it("usuário não edita perfil de outro usuário", async () => {
    // Não existe endpoint para editar perfil alheio; o de perfil edita sempre
    // o próprio usuário. Garantimos isso observando o efeito no próprio perfil.
    const { status } = await callApi(profilePATCH, "/api/auth/profile", {
      method: "PATCH",
      token: memberToken,
      body: { name: "Nome Alterado" },
    });
    expect(status).toBe(200);
    const other = await db.user.findUnique({ where: { id: adminId } });
    expect(other!.name).toBe("Admin");
  });

  it("dados de outro workspace são inacessíveis (404)", async () => {
    const outsider = await createWorkspaceWithUser("Forasteiro", "ADMIN");
    const foreignTask = await db.task.create({
      data: {
        workspaceId: outsider.workspace.id,
        title: "Tarefa secreta",
        creatorId: outsider.user.id,
      },
    });

    // Membro do workspace A não lê tarefa do workspace B
    const read = await callApi(taskGET, `/api/tasks/${foreignTask.id}`, {
      token: memberToken,
      params: { id: foreignTask.id },
    });
    expect(read.status).toBe(404);

    // Nem edita
    const edit = await callApi(taskPATCH, `/api/tasks/${foreignTask.id}`, {
      method: "PATCH",
      token: adminToken,
      params: { id: foreignTask.id },
      body: { title: "Roubar tarefa" },
    });
    expect(edit.status).toBe(404);

    // O registro permanece intacto
    const intact = await db.task.findUnique({ where: { id: foreignTask.id } });
    expect(intact!.title).toBe("Tarefa secreta");
  });

  it("comentário só é editado pelo autor", async () => {
    const created = await callApi(tasksPOST, "/api/tasks", {
      method: "POST",
      token: adminToken,
      body: { title: "Tarefa de comentários" },
    });
    const taskId = (created.json as { task: { id: string } }).task.id;

    const comment = await callApi(commentPOST, `/api/tasks/${taskId}/comments`, {
      method: "POST",
      token: memberToken,
      params: { id: taskId },
      body: { body: "Comentário do membro" },
    });
    const commentId = (comment.json as { comment: { id: string } }).comment.id;

    // Admin tenta editar comentário do membro → 403
    const edit = await callApi(commentPATCH, `/api/comments/${commentId}`, {
      method: "PATCH",
      token: adminToken,
      params: { id: commentId },
      body: { body: "Texto hackeado" },
    });
    expect(edit.status).toBe(403);

    // Autor edita → 200
    const ownEdit = await callApi(commentPATCH, `/api/comments/${commentId}`, {
      method: "PATCH",
      token: memberToken,
      params: { id: commentId },
      body: { body: "Texto corrigido" },
    });
    expect(ownEdit.status).toBe(200);
  });

  it("validação de entrada é aplicada no servidor", async () => {
    const { status } = await callApi(tasksPOST, "/api/tasks", {
      method: "POST",
      token: adminToken,
      body: { title: "X", priority: "IMPOSSIVEL" },
    });
    expect(status).toBe(400);
  });

  it("listagens não vazam usuários de outros workspaces", async () => {
    await createWorkspaceWithUser("Intruso", "MEMBER");
    const { json } = await callApi(membersGET, "/api/members", { token: adminToken });
    const emails = (json as { members: { email: string }[] }).members.map((m) => m.email);
    expect(emails.some((e) => e.includes("intruso"))).toBe(false);
    expect(emails.length).toBe(2);
  });

  it("preferência de tema persiste no perfil e rejeita valor inválido", async () => {
    const { status, json } = await callApi(profilePATCH, "/api/auth/profile", {
      method: "PATCH",
      token: memberToken,
      body: { prefs: { theme: "light" } },
    });
    expect(status).toBe(200);
    expect((json as { user: { prefs: Record<string, unknown> } }).user.prefs.theme).toBe("light");

    const invalid = await callApi(profilePATCH, "/api/auth/profile", {
      method: "PATCH",
      token: memberToken,
      body: { prefs: { theme: "neon" } },
    });
    expect(invalid.status).toBe(400);
  });
});
