/**
 * Testes de projetos (fluxo 2): criação, edição, arquivar/restaurar.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  resetDb,
  createUser,
  createWorkspaceWithUser,
  addMember,
  callApi,
  login,
} from "./helpers";
import { POST as projectsPOST, GET as projectsGET } from "@/app/api/projects/route";
import {
  GET as projectGET,
  PATCH as projectPATCH,
} from "@/app/api/projects/[id]/route";
import { POST as archivePOST } from "@/app/api/projects/[id]/archive/route";
import { POST as restorePOST } from "@/app/api/projects/[id]/restore/route";

describe("Projetos", () => {
  let token: string;

  beforeAll(async () => {
    await resetDb();
  });

  beforeEach(async () => {
    await resetDb();
    const ana = await createWorkspaceWithUser("Ana", "ADMIN");
    token = await login(ana.user.email, "senha-teste-123");

    const bruno = await createUser("Bruno", "bruno@test.local");
    await addMember(ana.workspace.id, bruno.id, "MEMBER");
  });

  it("cria projeto com dados válidos", async () => {
    const { status, json } = await callApi(projectsPOST, "/api/projects", {
      method: "POST",
      token,
      body: {
        name: "Projeto Alpha",
        description: "Descrição do projeto",
        status: "ACTIVE",
        color: "#38BDF8",
        startDate: "2026-10-01",
        dueDate: "2026-12-01",
      },
    });
    expect(status).toBe(201);
    const project = (json as { project: { id: string; name: string; progress: number; memberIds: string[] } })
      .project;
    expect(project.name).toBe("Projeto Alpha");
    expect(project.progress).toBe(0);
    // criador entra como membro automaticamente
    expect(project.memberIds.length).toBeGreaterThan(0);
  });

  it("rejeita nome muito curto", async () => {
    const { status } = await callApi(projectsPOST, "/api/projects", {
      method: "POST",
      token,
      body: { name: "A" },
    });
    expect(status).toBe(400);
  });

  it("rejeita data de início posterior ao prazo", async () => {
    const { status, json } = await callApi(projectsPOST, "/api/projects", {
      method: "POST",
      token,
      body: { name: "Datas invertidas", startDate: "2026-12-01", dueDate: "2026-10-01" },
    });
    expect(status).toBe(400);
    expect((json as { error: { message: string } }).error.message).toContain("início");
  });

  it("edita projeto e persiste alterações", async () => {
    const created = await callApi(projectsPOST, "/api/projects", {
      method: "POST",
      token,
      body: { name: "Projeto Beta" },
    });
    const id = (created.json as { project: { id: string } }).project.id;

    const patched = await callApi(projectPATCH, `/api/projects/${id}`, {
      method: "PATCH",
      token,
      params: { id },
      body: { name: "Projeto Beta Editado", status: "COMPLETED" },
    });
    expect(patched.status).toBe(200);

    const reloaded = await callApi(projectGET, `/api/projects/${id}`, {
      token,
      params: { id },
    });
    const project = (reloaded.json as { project: { name: string; status: string } }).project;
    expect(project.name).toBe("Projeto Beta Editado");
    expect(project.status).toBe("COMPLETED");
  });

  it("arquiva e restaura projeto", async () => {
    const created = await callApi(projectsPOST, "/api/projects", {
      method: "POST",
      token,
      body: { name: "Projeto Arquivo" },
    });
    const id = (created.json as { project: { id: string } }).project.id;

    const archived = await callApi(archivePOST, `/api/projects/${id}/archive`, {
      method: "POST",
      token,
      params: { id },
    });
    expect((archived.json as { project: { archived: boolean } }).project.archived).toBe(true);

    // Não aparece na listagem padrão
    const list = await callApi(projectsGET, "/api/projects", { token });
    const ids = (list.json as { projects: { id: string }[] }).projects.map((p) => p.id);
    expect(ids).not.toContain(id);

    const restored = await callApi(restorePOST, `/api/projects/${id}/restore`, {
      method: "POST",
      token,
      params: { id },
    });
    expect((restored.json as { project: { archived: boolean } }).project.archived).toBe(false);
  });

  it("registra atividade na criação", async () => {
    await callApi(projectsPOST, "/api/projects", {
      method: "POST",
      token,
      body: { name: "Projeto Atividade" },
    });
    const { GET: activityGET } = await import("@/app/api/activity/route");
    const { json } = await callApi(activityGET, "/api/activity", { token });
    const actions = (json as { activity: { action: string }[] }).activity.map((a) => a.action);
    expect(actions).toContain("project.created");
  });
});
