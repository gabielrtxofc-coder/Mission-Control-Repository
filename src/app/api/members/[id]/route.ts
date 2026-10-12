import { apiHandler, ok } from "@/lib/api";
import { memberUpdateSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { badRequest, notFound } from "@/lib/errors";
import { assertAdmin } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

/**
 * Atualiza um membro do workspace (admin).
 * Params: [id] = userId.
 */
export const PATCH = apiHandler<{ id: string }>(
  async ({ ctx, body, params }) => {
    assertAdmin(ctx);
    const data = await body(memberUpdateSchema);

    const membership = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: ctx.workspace.id, userId: params.id },
      },
      include: { user: true },
    });
    if (!membership) throw notFound("Membro não encontrado.");

    if (data.role !== undefined && data.role !== membership.role) {
      if (membership.role === "ADMIN" && data.role === "MEMBER") {
        const adminCount = await db.workspaceMember.count({
          where: { workspaceId: ctx.workspace.id, role: "ADMIN" },
        });
        if (adminCount <= 1) {
          throw badRequest("O workspace precisa de pelo menos um administrador.");
        }
      }
      await db.workspaceMember.update({
        where: { id: membership.id },
        data: { role: data.role },
      });
    }

    if (data.isActive !== undefined) {
      if (membership.userId === ctx.user.id && data.isActive === false) {
        throw badRequest("Você não pode desativar a si mesmo.");
      }
      await db.user.update({
        where: { id: membership.userId },
        data: { isActive: data.isActive },
      });
      if (data.isActive === false) {
        await db.session.deleteMany({ where: { userId: membership.userId } });
      }
    }

    if (data.name !== undefined || data.jobTitle !== undefined) {
      await db.user.update({
        where: { id: membership.userId },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.jobTitle !== undefined ? { jobTitle: data.jobTitle } : {}),
        },
      });
    }

    await logActivity({
      workspaceId: ctx.workspace.id,
      actor: { id: ctx.user.id, name: ctx.user.name },
      action: "member.updated",
      entityType: "member",
      entityId: membership.userId,
      entityName: membership.user.name,
      metadata: { changes: Object.keys(data) },
    });

    const updated = await db.workspaceMember.findUnique({
      where: { id: membership.id },
      include: { user: true },
    });

    return ok({
      member: {
        id: updated!.user.id,
        name: updated!.user.name,
        email: updated!.user.email,
        jobTitle: updated!.user.jobTitle,
        avatarColor: updated!.user.avatarColor,
        isActive: updated!.user.isActive,
        role: updated!.role,
        joinedAt: updated!.joinedAt.toISOString(),
      },
    });
  },
  { adminOnly: true },
);

/** Remove membro do workspace (admin). */
export const DELETE = apiHandler<{ id: string }>(
  async ({ ctx, params }) => {
    assertAdmin(ctx);
    if (params.id === ctx.user.id) {
      throw badRequest("Você não pode remover a si mesmo.");
    }

    const membership = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: ctx.workspace.id, userId: params.id },
      },
      include: { user: true },
    });
    if (!membership) throw notFound("Membro não encontrado.");

    if (membership.role === "ADMIN") {
      const adminCount = await db.workspaceMember.count({
        where: { workspaceId: ctx.workspace.id, role: "ADMIN" },
      });
      if (adminCount <= 1) {
        throw badRequest("O workspace precisa de pelo menos um administrador.");
      }
    }

    // Transfere tarefas e projetos órfãos para quem está removendo (admin).
    await db.task.updateMany({
      where: { workspaceId: ctx.workspace.id, assigneeId: params.id },
      data: { assigneeId: null },
    });
    await db.project.updateMany({
      where: { workspaceId: ctx.workspace.id, ownerId: params.id },
      data: { ownerId: ctx.user.id },
    });
    await db.projectMember.deleteMany({ where: { userId: params.id } });
    await db.workspaceMember.delete({ where: { id: membership.id } });

    await logActivity({
      workspaceId: ctx.workspace.id,
      actor: { id: ctx.user.id, name: ctx.user.name },
      action: "member.removed",
      entityType: "member",
      entityId: params.id,
      entityName: membership.user.name,
    });

    return ok({ ok: true });
  },
  { adminOnly: true },
);
