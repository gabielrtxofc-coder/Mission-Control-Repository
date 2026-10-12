/**
 * Seed de demonstração — SOMENTE para desenvolvimento.
 * Uso: npm run db:seed
 *
 * Cria um workspace com dois fundadores, projetos, tarefas em vários status,
 * subtarefas, comentários, etiquetas e notificações para validar a UI.
 */
import { loadEnv } from "../scripts/env";
loadEnv();

import { PrismaClient, type TaskStatus, type TaskPriority } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  console.log("→ Limpando dados de desenvolvimento…");
  // Ordem respeita as FKs
  await db.notification.deleteMany({});
  await db.activityEvent.deleteMany({});
  await db.comment.deleteMany({});
  await db.subtask.deleteMany({});
  await db.attachment.deleteMany({});
  await db.taskTag.deleteMany({});
  await db.tag.deleteMany({});
  await db.task.deleteMany({});
  await db.projectMember.deleteMany({});
  await db.project.deleteMany({});
  await db.session.deleteMany({});
  await db.workspaceMember.deleteMany({});
  await db.workspace.deleteMany({});
  await db.user.deleteMany({});

  console.log("→ Criando usuários…");
  const passwordHash = await bcrypt.hash("demo12345", 12);

  const ana = await db.user.create({
    data: {
      email: "ana@demo.local",
      name: "Ana Souza",
      jobTitle: "CEO & Product",
      avatarColor: "#A3E635",
      passwordHash,
    },
  });
  const bruno = await db.user.create({
    data: {
      email: "bruno@demo.local",
      name: "Bruno Lima",
      jobTitle: "CTO",
      avatarColor: "#38BDF8",
      passwordHash,
    },
  });

  console.log("→ Criando workspace…");
  const workspace = await db.workspace.create({
    data: {
      name: "Startup Demo",
      slug: `startup-demo-${Date.now().toString(36)}`,
    },
  });

  await db.workspaceMember.createMany({
    data: [
      { workspaceId: workspace.id, userId: ana.id, role: "ADMIN" },
      { workspaceId: workspace.id, userId: bruno.id, role: "MEMBER" },
    ],
  });

  console.log("→ Criando etiquetas…");
  const tagUrgente = await db.tag.create({
    data: { workspaceId: workspace.id, name: "urgente", color: "#F87171" },
  });
  const tagCliente = await db.tag.create({
    data: { workspaceId: workspace.id, name: "cliente", color: "#38BDF8" },
  });
  const tagInfra = await db.tag.create({
    data: { workspaceId: workspace.id, name: "infra", color: "#A78BFA" },
  });

  console.log("→ Criando projetos…");
  const produto = await db.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Lançamento do Produto V1",
      description:
        "Preparar o lançamento da primeira versão do produto: landing, onboarding e estabilidade.",
      status: "ACTIVE",
      color: "#A3E635",
      ownerId: ana.id,
      startDate: daysFromNow(-14),
      dueDate: daysFromNow(21),
      members: {
        create: [{ userId: ana.id }, { userId: bruno.id }],
      },
    },
  });

  const infra = await db.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Infraestrutura & DevOps",
      description: "CI/CD, monitoramento, backups e ambiente de produção.",
      status: "ACTIVE",
      color: "#38BDF8",
      ownerId: bruno.id,
      startDate: daysFromNow(-30),
      dueDate: daysFromNow(45),
      members: { create: [{ userId: bruno.id }, { userId: ana.id }] },
    },
  });

  const growth = await db.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Growth & Conteúdo",
      description: "Blog, newsletter e materiais de apoio comercial.",
      status: "PLANNING",
      color: "#F59E0B",
      ownerId: ana.id,
      startDate: daysFromNow(7),
      dueDate: daysFromNow(60),
      members: { create: [{ userId: ana.id }] },
    },
  });

  console.log("→ Criando tarefas…");
  type TaskSeed = {
    title: string;
    description?: string;
    projectId: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string;
    startDate?: Date | null;
    dueDate?: Date | null;
    tagIds?: string[];
    subtasks?: { title: string; done?: boolean }[];
    comments?: { authorId: string; body: string }[];
  };

  const tasks: TaskSeed[] = [
    {
      title: "Definir escopo do lançamento",
      description: "Alinhar o que entra no V1 e o que fica para as próximas iterações.",
      projectId: produto.id,
      status: "DONE",
      priority: "HIGH",
      assigneeId: ana.id,
      startDate: daysFromNow(-12),
      dueDate: daysFromNow(-8),
      subtasks: [
        { title: "Workshop de escopo", done: true },
        { title: "Documento de escopo aprovado", done: true },
      ],
      comments: [
        {
          authorId: bruno.id,
          body: "Documentei as decisões no Notion. Qualquer dúvida me chama.",
        },
      ],
    },
    {
      title: "Criar landing page do produto",
      description: "Seções: hero, benefícios, print do produto, CTA para lista de espera.",
      projectId: produto.id,
      status: "IN_PROGRESS",
      priority: "URGENT",
      assigneeId: ana.id,
      startDate: daysFromNow(-3),
      dueDate: daysFromNow(2),
      tagIds: [tagUrgente.id, tagCliente.id],
      subtasks: [
        { title: "Copy da hero", done: true },
        { title: "Design da página", done: true },
        { title: "Implementação responsiva", done: false },
        { title: "Formulário de lista de espera", done: false },
      ],
      comments: [
        {
          authorId: ana.id,
          body: "A copy final está pronta — priorizar o CTA acima da dobra.",
        },
        {
          authorId: bruno.id,
          body: "Implementação começando hoje; formulário com validação no servidor.",
        },
      ],
    },
    {
      title: "Configurar pipeline de CI/CD",
      description: "Build, testes e deploy automático na main.",
      projectId: infra.id,
      status: "IN_REVIEW",
      priority: "HIGH",
      assigneeId: bruno.id,
      startDate: daysFromNow(-7),
      dueDate: daysFromNow(1),
      tagIds: [tagInfra.id],
      subtasks: [
        { title: "Workflow de build", done: true },
        { title: "Testes automatizados no pipeline", done: true },
        { title: "Deploy de preview por PR", done: false },
      ],
      comments: [
        {
          authorId: ana.id,
          body: "Ótimo progresso. Importante ter preview por PR para revisarmos com calma.",
        },
      ],
    },
    {
      title: "Implementar autenticação segura",
      description: "Login, sessões, recuperação de senha fica para depois do V1.",
      projectId: produto.id,
      status: "DONE",
      priority: "URGENT",
      assigneeId: bruno.id,
      startDate: daysFromNow(-10),
      dueDate: daysFromNow(-4),
      tagIds: [tagInfra.id],
    },
    {
      title: "Testes de usabilidade com 5 usuários",
      description: "Recrutar participantes, roteiro de teste e consolidação dos insights.",
      projectId: produto.id,
      status: "TODO",
      priority: "NORMAL",
      assigneeId: ana.id,
      startDate: daysFromNow(4),
      dueDate: daysFromNow(10),
      tagIds: [tagCliente.id],
    },
    {
      title: "Estratégia de conteúdo do blog",
      description: "Definir pilares de conteúdo e calendário editorial do primeiro mês.",
      projectId: growth.id,
      status: "TODO",
      priority: "LOW",
      assigneeId: ana.id,
      dueDate: daysFromNow(15),
    },
    {
      title: "Monitoramento e alertas de produção",
      description: "Uptime, erros e alertas para o time.",
      projectId: infra.id,
      status: "BLOCKED",
      priority: "NORMAL",
      assigneeId: bruno.id,
      dueDate: daysFromNow(-1),
      tagIds: [tagInfra.id],
      comments: [
        {
          authorId: bruno.id,
          body: "Bloqueado aguardando definição do orçamento de monitoramento.",
        },
      ],
    },
    {
      title: "Revisar copy das telas de onboarding",
      description: "Tom de voz consistente e instruções claras.",
      projectId: produto.id,
      status: "IN_PROGRESS",
      priority: "NORMAL",
      assigneeId: ana.id,
      dueDate: daysFromNow(3),
    },
    {
      title: "Backup automático do banco de dados",
      description: "pg_dump diário com retenção de 14 dias.",
      projectId: infra.id,
      status: "TODO",
      priority: "HIGH",
      assigneeId: bruno.id,
      startDate: daysFromNow(1),
      dueDate: daysFromNow(5),
      tagIds: [tagInfra.id],
    },
    {
      title: "Definir métricas do lançamento",
      description: "KPIs de ativação, retenção e satisfação.",
      projectId: produto.id,
      status: "TODO",
      priority: "NORMAL",
      assigneeId: ana.id,
      dueDate: daysFromNow(7),
    },
  ];

  const createdTasks = [];
  for (const seed of tasks) {
    const { subtasks, comments, tagIds, ...data } = seed;
    const task = await db.task.create({
      data: {
        workspaceId: workspace.id,
        ...data,
        creatorId: data.assigneeId === ana.id ? bruno.id : ana.id,
        position: 1000,
        tags: tagIds ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
      },
    });

    if (subtasks) {
      let pos = 1000;
      for (const sub of subtasks) {
        await db.subtask.create({
          data: {
            taskId: task.id,
            title: sub.title,
            done: sub.done ?? false,
            position: pos,
            completedAt: sub.done ? new Date() : null,
          },
        });
        pos += 1000;
      }
    }

    if (comments) {
      for (const comment of comments) {
        await db.comment.create({
          data: {
            taskId: task.id,
            authorId: comment.authorId,
            body: comment.body,
          },
        });
      }
    }

    // Atividade básica por tarefa
    await db.activityEvent.create({
      data: {
        workspaceId: workspace.id,
        actorId: task.creatorId,
        actorName: task.creatorId === ana.id ? ana.name : bruno.name,
        action: "task.created",
        entityType: "task",
        entityId: task.id,
        entityName: task.title,
      },
    });

    createdTasks.push(task);
  }

  console.log("→ Criando notificações de exemplo…");
  await db.notification.createMany({
    data: [
      {
        workspaceId: workspace.id,
        userId: ana.id,
        actorId: bruno.id,
        type: "TASK_ASSIGNED",
        title: "Você foi atribuído à tarefa: Criar landing page do produto",
        body: "Projeto: Lançamento do Produto V1",
        link: `/tasks?open=${createdTasks[1]!.id}`,
        taskId: createdTasks[1]!.id,
        projectId: produto.id,
      },
      {
        workspaceId: workspace.id,
        userId: bruno.id,
        actorId: ana.id,
        type: "TASK_COMMENT",
        title: "Novo comentário em: Configurar pipeline de CI/CD",
        body: "Ótimo progresso. Importante ter preview por PR…",
        link: `/tasks?open=${createdTasks[2]!.id}`,
        taskId: createdTasks[2]!.id,
        projectId: infra.id,
      },
    ],
  });

  const userCount = await db.user.count();
  const taskCount = await db.task.count();
  console.log("");
  console.log(`✔ Seed concluído: ${userCount} usuários, ${taskCount} tarefas.`);
  console.log("  Contas de demonstração (somente desenvolvimento!):");
  console.log("  · ana@demo.local / demo12345   (administradora)");
  console.log("  · bruno@demo.local / demo12345 (membro)");
}

main()
  .catch((error) => {
    console.error("Falha no seed:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
