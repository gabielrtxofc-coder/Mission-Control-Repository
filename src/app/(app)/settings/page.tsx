import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { SettingsClient } from "@/components/settings/settings-client";

export const metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const sp = await searchParams;

  const [members, tags] = await Promise.all([
    db.workspaceMember.findMany({
      where: { workspaceId: ctx.workspace.id },
      include: { user: true },
      orderBy: { joinedAt: "asc" },
    }),
    db.tag.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <SettingsClient
      initialTab={sp.tab ?? "profile"}
      user={{
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        jobTitle: ctx.user.jobTitle,
        avatarColor: ctx.user.avatarColor,
        isActive: ctx.user.isActive,
        prefs: (ctx.user.prefs ?? {}) as Record<string, unknown>,
      }}
      workspace={ctx.workspace}
      role={ctx.role}
      members={members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        jobTitle: m.user.jobTitle,
        avatarColor: m.user.avatarColor,
        isActive: m.user.isActive,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      }))}
      tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
    />
  );
}
