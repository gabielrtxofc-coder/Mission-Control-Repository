/**
 * Regras de permissão (ver docs/DECISOES.md).
 * - Membro do workspace: colabora em projetos/tarefas do próprio workspace.
 * - ADMIN: gerencia membros, configurações do espaço e usuários.
 * - Qualquer acesso a outro workspace é negado aqui, no servidor.
 */
import type { Role } from "@prisma/client";
import { forbidden, notFound } from "@/lib/errors";
import type { AuthContext } from "@/lib/auth";

export function assertAdmin(ctx: AuthContext) {
  if (ctx.role !== "ADMIN") {
    throw forbidden("Apenas administradores podem executar esta ação.");
  }
}

/** Garante que o registro pertence ao workspace do usuário; senão 404/403. */
export function assertWorkspaceScope<T extends { workspaceId: string }>(
  ctx: AuthContext,
  record: T | null | undefined,
  message = "Registro não encontrado.",
): T {
  if (!record || record.workspaceId !== ctx.workspace.id) {
    // Não revelamos existência fora do escopo.
    throw notFound(message);
  }
  return record;
}

export function canManageMembers(role: Role): boolean {
  return role === "ADMIN";
}

export function canManageWorkspace(role: Role): boolean {
  return role === "ADMIN";
}

/** Na V1, membros colaboram livremente dentro do workspace. */
export function canEditTasks(_role: Role): boolean {
  return true;
}
