"use client";

import * as React from "react";
import type { ProjectDTO, TagDTO, UserDTO } from "@/lib/serializers";

export type OptionData = {
  members: UserDTO[];
  projects: Pick<ProjectDTO, "id" | "name" | "color" | "status" | "archived">[];
  tags: TagDTO[];
};

/** Carrega opções (membros, projetos, etiquetas) para formulários. */
export function useOptions(enabled = true): OptionData & { loading: boolean; reload: () => void } {
  const [data, setData] = React.useState<OptionData>({
    members: [],
    projects: [],
    tags: [],
  });
  const [loading, setLoading] = React.useState(false);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [membersRes, projectsRes, tagsRes] = await Promise.all([
          fetch("/api/members"),
          fetch("/api/projects?limit=100"),
          fetch("/api/tags"),
        ]);
        if (cancelled) return;
        const members = membersRes.ok ? ((await membersRes.json()) as { members: UserDTO[] }) : { members: [] };
        const projects = projectsRes.ok
          ? ((await projectsRes.json()) as { projects: OptionData["projects"] })
          : { projects: [] };
        const tags = tagsRes.ok ? ((await tagsRes.json()) as { tags: TagDTO[] }) : { tags: [] };
        setData({
          members: members.members ?? [],
          projects: (projects.projects ?? []).filter((p) => !p.archived),
          tags: tags.tags ?? [],
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, tick]);

  return { ...data, loading, reload: () => setTick((t) => t + 1) };
}
