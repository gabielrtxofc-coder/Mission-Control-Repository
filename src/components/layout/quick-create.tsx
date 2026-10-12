"use client";

import * as React from "react";
import { FolderKanban, Plus, SquareCheckBig } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { useRouter } from "next/navigation";

export function QuickCreate() {
  const router = useRouter();
  const [taskOpen, setTaskOpen] = React.useState(false);
  const [projectOpen, setProjectOpen] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="primary" size="md" className="hidden sm:inline-flex">
            <Plus className="h-4 w-4" aria-hidden />
            Criar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={() => setTaskOpen(true)}>
            <SquareCheckBig className="h-4 w-4 text-muted" aria-hidden />
            Nova tarefa
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setProjectOpen(true)}>
            <FolderKanban className="h-4 w-4 text-muted" aria-hidden />
            Novo projeto
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Versão compacta para mobile */}
      <Button
        variant="primary"
        size="icon"
        className="sm:hidden"
        aria-label="Criar"
        onClick={() => setTaskOpen(true)}
      >
        <Plus className="h-4 w-4" />
      </Button>

      <TaskFormDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        onSaved={() => router.refresh()}
      />
      <ProjectFormDialog
        open={projectOpen}
        onOpenChange={setProjectOpen}
        onSaved={() => router.refresh()}
      />
    </>
  );
}
