/**
 * Configuração do primeiro administrador do Mission Control.
 *
 * Uso:
 *   ADMIN_EMAIL=admin@empresa.com npm run setup:admin
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run setup:admin
 *
 * Se ADMIN_PASSWORD for omitido, uma senha forte é gerada e impressa uma única vez.
 * Nunca há credenciais padrão fixas em produção.
 */
import { loadEnv } from "./env";
loadEnv();

import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

function generatePassword(length = 20): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("Defina ADMIN_EMAIL com um e-mail válido no ambiente ou no .env.");
    process.exit(1);
  }

  const providedPassword = process.env.ADMIN_PASSWORD;
  const generated = providedPassword ? null : generatePassword();
  const password = providedPassword ?? generated!;

  if (password.length < 8) {
    console.error("A senha precisa de pelo menos 8 caracteres.");
    process.exit(1);
  }

  const workspaceName = process.env.ADMIN_WORKSPACE_NAME ?? "Mission Control";
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await db.user.findUnique({ where: { email } });

  const user = existing
    ? await db.user.update({
        where: { email },
        data: { passwordHash, isActive: true },
      })
    : await db.user.create({
        data: {
          email,
          name: process.env.ADMIN_NAME ?? email.split("@")[0]!,
          passwordHash,
        },
      });

  let workspace = await db.workspace.findFirst({
    where: { members: { some: { userId: user.id } } },
    orderBy: { createdAt: "asc" },
  });

  if (!workspace) {
    const slugBase = workspaceName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    workspace = await db.workspace.create({
      data: { name: workspaceName, slug: `${slugBase || "workspace"}-${Date.now().toString(36)}` },
    });
  }

  await db.workspaceMember.upsert({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: user.id },
    },
    create: { workspaceId: workspace.id, userId: user.id, role: "ADMIN" },
    update: { role: "ADMIN" },
  });

  console.log("✔ Administrador configurado.");
  console.log(`  E-mail:  ${email}`);
  console.log(`  Espaço:  ${workspace.name}`);
  if (generated) {
    console.log("");
    console.log("  ┌────────────────────────────────────────────────────┐");
    console.log("  │  Senha gerada (exibida apenas uma vez):            │");
    console.log(`  │  ${generated.padEnd(48)} │`);
    console.log("  │  Anote e armazene em local seguro.                 │");
    console.log("  └────────────────────────────────────────────────────┘");
  } else {
    console.log("  Senha:   definida via ADMIN_PASSWORD.");
  }
}

main()
  .catch((error) => {
    console.error("Falha ao configurar administrador:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
