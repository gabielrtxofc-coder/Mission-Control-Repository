"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";

export function QuickActions() {
  const router = useRouter();
  const [taskOpen, setTaskOpen] = React.useState(false);
  const [projectOpen, setProjectOpen] = React.useState(false);

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" onClick={() => setProjectOpen(true)}>
        <FolderKanban className="h-4 w-4" aria-hidden />
        Novo projeto
      </Button>
      <Button variant="primary" onClick={() => setTaskOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        Nova tarefa
      </Button>
      <TaskFormDialog open={taskOpen} onOpenChange={setTaskOpen} onSaved={() => router.refresh()} />
      <ProjectFormDialog
        open={projectOpen}
        onOpenChange={setProjectOpen}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
