import { apiHandler, ok, created } from "@/lib/api";
import { memberCreateSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { conflict } from "@/lib/errors";
import { assertAdmin } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { generatePassword } from "@/lib/utils";
import { userDTO } from "@/lib/serializers";

/** Lista membros do workspace atual (qualquer membro pode ver). */
export const GET = apiHandler(async ({ ctx }) => {
  const members = await db.workspaceMember.findMany({
    where: { workspaceId: ctx.workspace.id },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  return ok({
    members: members.map((m) => ({
      ...userDTO(m.user),
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    })),
  });
});

/** Cria um membro (admin). Aceita usuário novo ou adiciona usuário existente. */
export const POST = apiHandler(
  async ({ ctx, body }) => {
    assertAdmin(ctx);
    const data = await body(memberCreateSchema);

    const existingUser = await db.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      const existingMembership = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: ctx.workspace.id, userId: existingUser.id } },
      });
      if (existingMembership) throw conflict("Este e-mail já é membro do workspace.");
    }

    let generatedPassword: string | null = null;
    const password = data.password ?? (generatedPassword = generatePassword());

    const user =
      existingUser ??
      (await db.user.create({
        data: {
          email: data.email,
          name: data.name,
          jobTitle: data.jobTitle ?? null,
          passwordHash: await hashPassword(password),
        },
      }));

    const membership = await db.workspaceMember.create({
      data: {
        workspaceId: ctx.workspace.id,
        userId: user.id,
        role: data.role,
      },
      include: { user: true },
    });

    await logActivity({
      workspaceId: ctx.workspace.id,
      actor: { id: ctx.user.id, name: ctx.user.name },
      action: "member.added",
      entityType: "member",
      entityId: user.id,
      entityName: user.name,
      metadata: { role: data.role, email: user.email },
    });

    await notify({
      workspaceId: ctx.workspace.id,
      recipients: [user.id],
      actorId: ctx.user.id,
      type: "MEMBER_ADDED",
      title: `Você foi adicionado ao workspace ${ctx.workspace.name}`,
      link: "/dashboard",
    });

    return created({
      member: {
        ...userDTO(membership.user),
        role: membership.role,
        joinedAt: membership.joinedAt.toISOString(),
      },
      // Senha gerada exibida uma única vez para o admin repassar.
      temporaryPassword: generatedPassword,
    });
  },
  {
    adminOnly: true,
    rateLimit: { limit: 20, windowMs: 60 * 60_000, by: "user" },
  },
);
