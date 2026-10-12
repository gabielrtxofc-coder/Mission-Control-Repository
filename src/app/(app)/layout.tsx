import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { unreadCount } from "@/lib/notify";
import { AppShell, type ShellUser } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const unread = await unreadCount(ctx.user.id, ctx.workspace.id);

  const shellUser: ShellUser = {
    id: ctx.user.id,
    name: ctx.user.name,
    email: ctx.user.email,
    jobTitle: ctx.user.jobTitle,
    avatarColor: ctx.user.avatarColor,
    isActive: ctx.user.isActive,
    role: ctx.role,
    workspaceName: ctx.workspace.name,
    prefs: (ctx.user.prefs ?? {}) as Record<string, unknown>,
  };

  return (
    <AppShell user={shellUser} initialUnread={unread}>
      {children}
    </AppShell>
  );
}
