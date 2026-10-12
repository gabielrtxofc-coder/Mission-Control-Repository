/**
 * Testes de notificações (fluxo 9) e filtros/busca (fluxo 7).
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
import { POST as tasksPOST, GET as tasksGET } from "@/app/api/tasks/route";
import { PATCH as taskPATCH } from "@/app/api/tasks/[id]/route";
import { POST as commentPOST } from "@/app/api/tasks/[id]/comments/route";
import { GET as notificationsGET } from "@/app/api/notifications/route";
import { POST as readPOST } from "@/app/api/notifications/read/route";
import { GET as countGET } from "@/app/api/notifications/count/route";
import { GET as searchGET } from "@/app/api/search/route";
import { GET as exportGET } from "@/app/api/tasks/export/route";
import { sweepDueSoon } from "@/lib/notify";

describe("Notificações", () => {
  let anaToken: string;
  let anaId: string;
  let brunoToken: string;
  let brunoId: string;
  let wsId: string;

  beforeAll(async () => {
    await resetDb();
  });

  beforeEach(async () => {
    await resetDb();
    const ana = await createWorkspaceWithUser("Ana", "ADMIN");
    anaId = ana.user.id;
    wsId = ana.workspace.id;
    anaToken = await login(ana.user.email, "senha-teste-123");

    const bruno = await createUser("Bruno", "bruno@test.local");
    brunoId = bruno.id;
    await addMember(wsId, brunoId, "MEMBER");
    brunoToken = await login("bruno@test.local", "senha-teste-123");
  });

  it("atribuição gera notificação para o assignee (não para quem atribui)", async () => {
    await callApi(tasksPOST, "/api/tasks", {
      method: "POST",
      token: anaToken,
      body: { title: "Notificar Bruno", assigneeId: brunoId },
    });

    const { json } = await callApi(notificationsGET, "/api/notifications", {
      token: brunoToken,
    });
    const items = (json as { notifications: { type: string; title: string; readAt: string | null }[] }).notifications;
    expect(items.length).toBe(1);
    expect(items[0]!.type).toBe("TASK_ASSIGNED");
    expect(items[0]!.readAt).toBeNull();
  });

  it("comentário em tarefa gera notificação para envolvidos", async () => {
    const created = await callApi(tasksPOST, "/api/tasks", {
      method: "POST",
      token: anaToken,
      body: { title: "Tarefa comentada", assigneeId: brunoId },
    });
    const id = (created.json as { task: { id: string } }).task.id;

    // Bruno comenta → Ana (criadora) deve ser notificada
    await callApi(commentPOST, `/api/tasks/${id}/comments`, {
      method: "POST",
      token: brunoToken,
      params: { id },
      body: { body: "Pegando esta tarefa" },
    });

    const anaNotifications = await db.notification.findMany({
      where: { userId: anaId, type: "TASK_COMMENT" },
    });
    expect(anaNotifications.length).toBe(1);
  });

  it("contagem de não lidas e marcação como lida", async () => {
    await callApi(tasksPOST, "/api/tasks", {
      method: "POST",
      token: anaToken,
      body: { title: "Tarefa count", assigneeId: brunoId },
    });

    const count = await callApi(countGET, "/api/notifications/count", { token: brunoToken });
    expect((count.json as { count: number }).count).toBe(1);

    const read = await callApi(readPOST, "/api/notifications/read", {
      method: "POST",
      token: brunoToken,
      body: { all: true },
    });
    expect((read.json as { updated: number }).updated).toBe(1);

    const count2 = await callApi(countGET, "/api/notifications/count", { token: brunoToken });
    expect((count2.json as { count: number }).count).toBe(0);
  });

  it("mudança relevante em tarefa atribuída gera notificação", async () => {
    const created = await callApi(tasksPOST, "/api/tasks", {
      method: "POST",
      token: anaToken,
      body: { title: "Tarefa com mudança", assigneeId: brunoId },
    });
    const id = (created.json as { task: { id: string } }).task.id;

    await callApi(taskPATCH, `/api/tasks/${id}`, {
      method: "PATCH",
      token: anaToken,
      params: { id },
      body: { status: "BLOCKED", priority: "URGENT" },
    });

    const items = await db.notification.findMany({
      where: { userId: brunoId, type: "TASK_STATUS_CHANGED" },
    });
    expect(items.length).toBe(1);
    expect(items[0]!.body).toContain("status");
  });

  it("sweep de prazos cria no máximo uma notificação por tarefa", async () => {
    const created = await callApi(tasksPOST, "/api/tasks", {
      method: "POST",
      token: anaToken,
      body: {
        title: "Tarefa com prazo próximo",
        assigneeId: brunoId,
        dueDate: new Date().toISOString().slice(0, 10),
      },
    });
    const id = (created.json as { task: { id: string } }).task.id;

    await sweepDueSoon(wsId, anaId);
    await sweepDueSoon(wsId, anaId); // segunda execução não duplica

    const items = await db.notification.findMany({
      where: { taskId: id, type: "TASK_DUE_SOON" },
    });
    expect(items.length).toBe(1);
  });
});

describe("Filtros, busca e exportação", () => {
  let token: string;
  let projectId: string;

  beforeAll(async () => {
    await resetDb();
  });

  beforeEach(async () => {
    await resetDb();
    const ana = await createWorkspaceWithUser("Ana", "ADMIN");
    token = await login(ana.user.email, "senha-teste-123");
    const { json } = await callApi(
      (await import("@/app/api/projects/route")).POST,
      "/api/projects",
      { method: "POST", token, body: { name: "Projeto Filtros" } },
    );
    projectId = (json as { project: { id: string } }).project.id;

    // Cenário de dados
    await callApi(tasksPOST, "/api/tasks", {
      method: "POST",
      token,
      body: {
        title: "Alpha documentação",
        status: "TODO",
        priority: "LOW",
        projectId,
        dueDate: "2026-11-01",
      },
    });
    await callApi(tasksPOST, "/api/tasks", {
      method: "POST",
      token,
      body: {
        title: "Beta implementação",
        status: "IN_PROGRESS",
        priority: "URGENT",
        projectId,
        dueDate: "2026-11-15",
      },
    });
    await callApi(tasksPOST, "/api/tasks", {
      method: "POST",
      token,
      body: {
        title: "Gamma revisão",
        status: "DONE",
        priority: "NORMAL",
        dueDate: "2026-10-01",
      },
    });
  });

  it("filtra por status", async () => {
    const { json } = await callApi(tasksGET, "/api/tasks?status=IN_PROGRESS", { token });
    const tasks = (json as { tasks: { title: string }[] }).tasks;
    expect(tasks.map((t) => t.title)).toEqual(["Beta implementação"]);
  });

  it("filtra por prioridade", async () => {
    const { json } = await callApi(tasksGET, "/api/tasks?priority=URGENT,LOW", { token });
    const titles = (json as { tasks: { title: string }[] }).tasks.map((t) => t.title);
    expect(titles.sort()).toEqual(["Alpha documentação", "Beta implementação"]);
  });

  it("filtra por projeto", async () => {
    const { json } = await callApi(tasksGET, `/api/tasks?projectId=${projectId}`, { token });
    const tasks = (json as { tasks: { title: string }[] }).tasks;
    expect(tasks.length).toBe(2);
  });

  it("filtra por intervalo de prazo", async () => {
    const { json } = await callApi(
      tasksGET,
      "/api/tasks?dueFrom=2026-11-01&dueTo=2026-11-30",
      { token },
    );
    const titles = (json as { tasks: { title: string }[] }).tasks.map((t) => t.title);
    expect(titles.sort()).toEqual(["Alpha documentação", "Beta implementação"]);
  });

  it("busca por texto encontra tarefas", async () => {
    const { json } = await callApi(searchGET, "/api/search?q=implementação", { token });
    const tasks = (json as { tasks: { title: string }[] }).tasks;
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0]!.title).toContain("Beta");
  });

  it("busca encontra projetos", async () => {
    const { json } = await callApi(searchGET, "/api/search?q=Filtros", { token });
    const projects = (json as { projects: { name: string }[] }).projects;
    expect(projects.some((p) => p.name === "Projeto Filtros")).toBe(true);
  });

  it("exporta CSV com cabeçalho e linhas", async () => {
    const { text } = await callApi(exportGET, "/api/tasks/export", { token });
    expect(text).toContain("Título");
    expect(text).toContain("Alpha documentação");
    expect(text).toContain("Beta implementação");
  });
});
