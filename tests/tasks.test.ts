/**
 * Testes de tarefas (fluxos 3, 4, 5, 6): criação, edição, status,
 * persistência, movimentação no kanban, subtarefas e comentários.
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
import {
  GET as taskGET,
  PATCH as taskPATCH,
  DELETE as taskDELETE,
} from "@/app/api/tasks/[id]/route";
import { POST as movePOST } from "@/app/api/tasks/[id]/move/route";
import { POST as restorePOST } from "@/app/api/tasks/[id]/restore/route";
import { POST as subtaskPOST } from "@/app/api/tasks/[id]/subtasks/route";
import { PATCH as subtaskPATCH } from "@/app/api/subtasks/[id]/route";
import {
  POST as commentPOST,
  GET as commentGET,
} from "@/app/api/tasks/[id]/comments/route";

describe("Tarefas", () => {
  let token: string;
  let brunoId: string;
  let projectId: string;

  beforeAll(async () => {
    await resetDb();
  });

  beforeEach(async () => {
    await resetDb();
    const ana = await createWorkspaceWithUser("Ana", "ADMIN");
    token = await login(ana.user.email, "senha-teste-123");

    const bruno = await createUser("Bruno", "bruno@test.local");
    brunoId = bruno.id;
    await addMember(ana.workspace.id, bruno.id, "MEMBER");

    const { json } = await callApi(
      (await import("@/app/api/projects/route")).POST,
      "/api/projects",
      { method: "POST", token, body: { name: "Projeto das Tarefas" } },
    );
    projectId = (json as { project: { id: string } }).project.id;
  });

  it("cria tarefa vinculada ao projeto", async () => {
    const { status, json } = await callApi(tasksPOST, "/api/tasks", {
      method: "POST",
      token,
      body: {
        title: "Implementar login",
        description: "Com validação no servidor",
        projectId,
        status: "TODO",
        priority: "HIGH",
        startDate: "2026-10-10",
        dueDate: "2026-10-20",
        assigneeId: brunoId,
      },
    });
    expect(status).toBe(201);
    const task = (json as { task: { id: string; projectName: string; assignee: { name: string }; dueDate: string } }).task;
    expect(task.projectName).toBe("Projeto das Tarefas");
    expect(task.assignee!.name).toBe("Bruno");
    expect(task.dueDate).toBe("2026-10-20");
  });

  it("altera status e prioridade; mudanças persistem após reload", async () => {
    const created = await callApi(tasksPOST, "/api/tasks", {
      method: "POST",
      token,
      body: { title: "Tarefa editável", projectId },
    });
    const id = (created.json as { task: { id: string } }).task.id;

    await callApi(taskPATCH, `/api/tasks/${id}`, {
      method: "PATCH",
      token,
      params: { id },
      body: { status: "IN_REVIEW", priority: "URGENT" },
    });

    // "Reload": nova requisição GET
    const reloaded = await callApi(taskGET, `/api/tasks/${id}`, {
      token,
      params: { id },
    });
    const task = (reloaded.json as { task: { status: string; priority: string } }).task;
    expect(task.status).toBe("IN_REVIEW");
    expect(task.priority).toBe("URGENT");
  });

  it("movimenta tarefa no kanban (move) e persiste posição", async () => {
    const created = await callApi(tasksPOST, "/api/tasks", {
      method: "POST",
      token,
      body: { title: "Tarefa kanban", projectId },
    });
    const id = (created.json as { task: { id: string } }).task.id;

    const moved = await callApi(movePOST, `/api/tasks/${id}/move`, {
      method: "POST",
      token,
      params: { id },
      body: { status: "IN_PROGRESS", position: 5500 },
    });
    expect(moved.status).toBe(200);

    const inDb = await db.task.findUnique({ where: { id } });
    expect(inDb!.status).toBe("IN_PROGRESS");
    expect(inDb!.position).toBe(5500);
  });

  it("gera notificação ao atribuir tarefa", async () => {
    await callApi(tasksPOST, "/api/tasks", {
      method: "POST",
      token,
      body: { title: "Tarefa notificadora", assigneeId: brunoId },
    });

    const notifications = await db.notification.findMany({
      where: { userId: brunoId, type: "TASK_ASSIGNED" },
    });
    expect(notifications.length).toBe(1);
    expect(notifications[0]!.title).toContain("Tarefa notificadora");
    expect(notifications[0]!.link).toContain("/tasks?open=");
  });

  it("subtarefas: criar, concluir e refletir contadores", async () => {
    const created = await callApi(tasksPOST, "/api/tasks", {
      method: "POST",
      token,
      body: { title: "Tarefa com checklist" },
    });
    const id = (created.json as { task: { id: string } }).task.id;

    const sub = await callApi(subtaskPOST, `/api/tasks/${id}/subtasks`, {
      method: "POST",
      token,
      params: { id },
      body: { title: "Revisar critérios" },
    });
    expect(sub.status).toBe(201);
    const subtaskId = (sub.json as { subtask: { id: string } }).subtask.id;

    await callApi(subtaskPATCH, `/api/subtasks/${subtaskId}`, {
      method: "PATCH",
      token,
      params: { id: subtaskId },
      body: { done: true },
    });

    const detail = await callApi(taskGET, `/api/tasks/${id}`, { token, params: { id } });
    const task = (detail.json as { task: { subtasks: { done: boolean }[]; doneSubtaskCount: number } }).task;
    expect(task.subtasks[0]!.done).toBe(true);
    expect(task.doneSubtaskCount).toBe(1);
  });

  it("comentários: criação em ordem cronológica e autor correto", async () => {
    const created = await callApi(tasksPOST, "/api/tasks", {
      method: "POST",
      token,
      body: { title: "Tarefa comentada" },
    });
    const id = (created.json as { task: { id: string } }).task.id;

    await callApi(commentPOST, `/api/tasks/${id}/comments`, {
      method: "POST",
      token,
      params: { id },
      body: { body: "Primeiro comentário" },
    });
    await callApi(commentPOST, `/api/tasks/${id}/comments`, {
      method: "POST",
      token,
      params: { id },
      body: { body: "Segundo comentário" },
    });

    const { json } = await callApi(commentGET, `/api/tasks/${id}/comments`, {
      token,
      params: { id },
    });
    const comments = (json as { comments: { body: string; author: { name: string } }[] }).comments;
    expect(comments.map((c) => c.body)).toEqual([
      "Primeiro comentário",
      "Segundo comentário",
    ]);
    expect(comments[0]!.author.name).toBe("Ana");
  });

  it("arquiva e restaura tarefa", async () => {
    const created = await callApi(tasksPOST, "/api/tasks", {
      method: "POST",
      token,
      body: { title: "Tarefa arquivável" },
    });
    const id = (created.json as { task: { id: string } }).task.id;

    const archived = await callApi(taskDELETE, `/api/tasks/${id}`, {
      method: "DELETE",
      token,
      params: { id },
    });
    expect((archived.json as { task: { archived: boolean } }).task.archived).toBe(true);

    const restored = await callApi(restorePOST, `/api/tasks/${id}/restore`, {
      method: "POST",
      token,
      params: { id },
    });
    expect((restored.json as { task: { archived: boolean } }).task.archived).toBe(false);
  });

  it("rejeita tarefa com projeto de outro workspace", async () => {
    const outsider = await createWorkspaceWithUser("Outro", "ADMIN");
    const otherProject = await db.project.create({
      data: {
        workspaceId: outsider.workspace.id,
        name: "Projeto alheio",
        ownerId: outsider.user.id,
      },
    });

    const { status } = await callApi(tasksPOST, "/api/tasks", {
      method: "POST",
      token,
      body: { title: "Tarefa invasora", projectId: otherProject.id },
    });
    expect(status).toBe(404);
  });
});
