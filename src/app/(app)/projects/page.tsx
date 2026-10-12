import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { projectDTO } from "@/lib/serializers";
import { ProjectsList } from "@/components/projects/projects-list";

export const metadata = { title: "Projetos" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const projects = await db.project.findMany({
    where: { workspaceId: ctx.workspace.id },
    include: {
      owner: true,
      members: { include: { user: true } },
      _count: { select: { tasks: { where: { archivedAt: null } } } },
      tasks: { where: { archivedAt: null }, select: { status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <ProjectsList
      initialProjects={projects.map(projectDTO)}
      currentUserId={ctx.user.id}
    />
  );
}
