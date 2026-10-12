/**
 * Testes E2E — fluxos de aceitação pela interface real.
 * Executar com: npm run test:e2e (servidor em localhost:3000).
 */
import { test, expect, type Page } from "@playwright/test";

const SUFFIX = Date.now().toString(36);

async function login(page: Page, email = "ana@demo.local", password = "demo12345") {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

test.describe("Autenticação e proteção de rotas", () => {
  test("redireciona para /login quando não autenticado", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login**");
    await expect(page.getByRole("heading", { name: "Bem-vindo de volta" })).toBeVisible();
  });

  test("mostra erro com credenciais inválidas", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "ana@demo.local");
    await page.fill("#password", "senha-errada");
    await page.click('button[type="submit"]');
    await expect(
      page.getByRole("alert").filter({ hasText: "E-mail ou senha" }),
    ).toContainText("E-mail ou senha incorretos");
  });

  test("login válido entra no dashboard com dados reais", async ({ page }) => {
    await login(page);
    await expect(page.getByRole("heading", { name: /Olá, Ana/ })).toBeVisible();
    await expect(page.getByText("Projetos ativos")).toBeVisible();
    await expect(page.getByText("Startup Demo")).toBeVisible();
  });
});

test.describe("Projetos e tarefas", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("cria um projeto pela interface", async ({ page }) => {
    const name = `Projeto E2E ${SUFFIX}`;
    await page.goto("/projects");
    await page.getByRole("button", { name: "Novo projeto" }).first().click();
    await page.fill("#project-name", name);
    await page.fill("#project-description", "Criado pelo teste E2E");
    await page.getByRole("button", { name: "Criar projeto" }).last().click();
    // Aguarda o diálogo fechar e o card renderizar
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { name })).toBeVisible();
  });

  test("cria tarefa, edita status e prioridade; persiste após reload", async ({ page }) => {
    const title = `Tarefa E2E ${SUFFIX}`;
    await page.goto("/tasks");
    await page.getByRole("button", { name: "Nova tarefa" }).click();
    await page.fill("#task-title", title);
    await page.selectOption("#task-status", "IN_PROGRESS");
    await page.selectOption("#task-priority", "HIGH");
    await page.getByRole("button", { name: "Criar tarefa" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText(title).first()).toBeVisible();

    // Edição inline de status na tabela
    const row = page.locator("tr", { hasText: title }).first();
    await row.locator('select[aria-label^="Status de"]').selectOption("IN_REVIEW");

    // Reload — persistência real
    await page.reload();
    const rowAfter = page.locator("tr", { hasText: title }).first();
    await expect(rowAfter.locator('select[aria-label^="Status de"]')).toHaveValue("IN_REVIEW");
    await expect(rowAfter.locator('select[aria-label^="Prioridade de"]')).toHaveValue("HIGH");
  });

  test("painel da tarefa: subtarefa e comentário", async ({ page }) => {
    test.setTimeout(90_000);
    const title = `Tarefa Painel ${SUFFIX}`;
    await page.goto("/tasks");
    await page.getByRole("button", { name: "Nova tarefa" }).click();
    await page.fill("#task-title", title);
    await page.getByRole("button", { name: "Criar tarefa" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText(title).first()).toBeVisible();

    await page.locator("tr", { hasText: title }).first().click();
    // Painel abre (o título visível é o h2 do corpo; o título do diálogo é sr-only)
    await expect(page.getByRole("heading", { name: title }).last()).toBeVisible();

    // Adiciona subtarefa
    await page.getByPlaceholder("Nova subtarefa…").fill("Item do checklist E2E");
    await page.getByRole("button", { name: "Adicionar" }).click();
    await expect(page.getByText("Item do checklist E2E")).toBeVisible();

    // Comentário
    await page.getByPlaceholder("Escreva um comentário…").fill("Comentário do teste E2E");
    await page.getByRole("button", { name: "Enviar comentário" }).click();
    await expect(page.getByText("Comentário do teste E2E")).toBeVisible();

    // Recarrega e verifica persistência — o painel reabre via deep-link (?task=…)
    await page.reload();
    await expect(page.getByRole("heading", { name: title }).last()).toBeVisible();
    await expect(page.getByText("Comentário do teste E2E")).toBeVisible();
    await expect(page.getByText("Item do checklist E2E")).toBeVisible();
  });

  test("kanban: mover tarefa entre colunas persiste", async ({ page }) => {
    const title = `Tarefa Kanban ${SUFFIX}`;
    await page.goto("/tasks");
    await page.getByRole("button", { name: "Nova tarefa" }).click();
    await page.fill("#task-title", title);
    await page.getByRole("button", { name: "Criar tarefa" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText(title).first()).toBeVisible();

    await page.getByRole("tab", { name: "Quadro" }).click();
    const card = page.getByRole("button", { name: `Mover tarefa ${title}` });
    await expect(card).toBeVisible();
    await card.scrollIntoViewIfNeeded();

    // Coluna de destino: "Em revisão" (coordenadas dentro da viewport)
    const source = await card.boundingBox();
    const targetColumn = page.locator('[data-status-column="IN_REVIEW"]');
    const target = await targetColumn.boundingBox();
    expect(source).not.toBeNull();
    expect(target).not.toBeNull();

    const dropX = target!.x + target!.width / 2;
    // Ponto de drop dentro da interseção coluna/viewport
    const dropY = Math.min(Math.max(target!.y + 80, 120), 680);
    await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
    await page.mouse.down();
    await page.mouse.move(dropX, dropY, { steps: 15 });
    await page.mouse.up();

    // Confirma movimentação via recarga
    await page.reload();
    await page.getByRole("tab", { name: "Quadro" }).click();
    await expect(
      page.locator('[data-status-column="IN_REVIEW"]').getByText(title),
    ).toBeVisible();
  });

  test("filtros por status e busca funcionam", async ({ page }) => {
    await page.goto("/tasks?status=DONE");
    // Filtro aplicado: indicador visível e tarefas concluídas à vista
    await expect(page.getByRole("button", { name: /Status/ }).first()).toHaveClass(/accent/);

    await page.getByLabel("Buscar tarefas").fill(`E2E ${SUFFIX}`);
    await page.waitForTimeout(600);
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    for (let i = 0; i < count; i += 1) {
      await expect(rows.nth(i)).toContainText("E2E");
    }
  });

  test("calendário e linha do tempo renderizam com dados reais", async ({ page }) => {
    await page.goto("/tasks");
    await page.getByRole("tab", { name: "Calendário" }).click();
    await expect(page.getByRole("button", { name: "Hoje" })).toBeVisible();

    await page.getByRole("tab", { name: "Linha do tempo" }).click();
    await expect(page.getByText("Tarefa", { exact: true }).first()).toBeVisible();
  });
});

test.describe("Minha área e notificações", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("minha área mostra tarefas atribuídas", async ({ page }) => {
    await page.goto("/my");
    await expect(page.getByRole("heading", { name: "Minha área" })).toBeVisible();
    await expect(page.getByText("Todas as minhas tarefas")).toBeVisible();
  });

  test("central de notificações marca como lida", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page.getByRole("heading", { name: "Notificações" })).toBeVisible();
    const markAll = page.getByRole("button", { name: "Marcar todas como lidas" });
    if (await markAll.isVisible().catch(() => false)) {
      await markAll.click();
    }
    await page.getByRole("tab", { name: "Não lidas" }).click();
    await expect(page.getByText("Tudo em dia")).toBeVisible();
  });

  test("tema claro persiste após recarregar", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("tab", { name: "Aparência" }).click();
    await page.getByRole("button", { name: "Claro" }).click();
    await page.getByRole("button", { name: "Salvar preferências" }).click();
    await expect(page.locator("html[data-theme='light']")).toHaveCount(1);

    // Persiste no servidor: recarrega e continua claro
    await page.reload();
    await expect(page.locator("html[data-theme='light']")).toHaveCount(1);

    // Restaura o escuro para não afetar outros testes
    await page.getByRole("tab", { name: "Aparência" }).click();
    await page.getByRole("button", { name: "Escuro" }).click();
    await page.getByRole("button", { name: "Salvar preferências" }).click();
    await expect(page.locator("html.dark")).toHaveCount(1);
  });

  test("busca global encontra tarefa", async ({ page }) => {
    const title = `Tarefa Busca ${SUFFIX}`;
    await page.goto("/tasks");
    await page.getByRole("button", { name: "Nova tarefa" }).click();
    await page.fill("#task-title", title);
    await page.getByRole("button", { name: "Criar tarefa" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByLabel("Busca global").fill(title);
    await page.waitForTimeout(700);
    await expect(page.getByText(title).first()).toBeVisible();
    await page.getByText(title).first().click();
    // Navega para a tarefa
    await page.waitForURL(/tasks/);
  });
});
