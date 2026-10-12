import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { sweepDueSoon } from "@/lib/notify";
import { NotificationsCenter } from "@/components/notifications/notifications-center";

export const metadata = { title: "Notificações" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  await sweepDueSoon(ctx.workspace.id, ctx.user.id).catch(() => {});

  return <NotificationsCenter />;
}
