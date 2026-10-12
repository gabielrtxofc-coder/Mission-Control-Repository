"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, MoreHorizontal, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { api } from "@/lib/client-api";
import type { ProjectDTO } from "@/lib/serializers";

export function ProjectDetailActions({ project }: { project: ProjectDTO }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);

  async function toggleArchive() {
    try {
      if (project.archived) {
        await api.post(`/api/projects/${project.id}/restore`);
        toast.success("Projeto restaurado.");
      } else {
        await api.post(`/api/projects/${project.id}/archive`);
        toast.success("Projeto arquivado.");
      }
      router.refresh();
    } catch {
      toast.error("Não foi possível concluir a operação.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" onClick={() => setEditOpen(true)}>
        <Pencil className="h-4 w-4" aria-hidden />
        Editar
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Mais ações">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void toggleArchive()}>
            {project.archived ? (
              <>
                <ArchiveRestore className="h-3.5 w-3.5 text-muted" aria-hidden />
                Restaurar projeto
              </>
            ) : (
              <>
                <Archive className="h-3.5 w-3.5 text-muted" aria-hidden />
                Arquivar projeto
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
