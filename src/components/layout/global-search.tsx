"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, Search, SquareCheckBig } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/skeleton";
import type { ProjectDTO, TaskDTO } from "@/lib/serializers";

type SearchResults = {
  projects: Pick<ProjectDTO, "id" | "name" | "color" | "status">[];
  tasks: Pick<TaskDTO, "id" | "title" | "status" | "projectName">[];
};

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResults | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Atalho: "/" foca a busca
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    function onClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as SearchResults;
          setResults(data);
          setOpen(true);
        }
      } catch {
        /* abortado */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const hasResults =
    results && (results.projects.length > 0 || results.tasks.length > 0);

  return (
    <div ref={containerRef} className="relative ml-2 hidden w-full max-w-md sm:block">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Buscar projetos e tarefas…"
          className="input-base pl-9 pr-10"
          aria-label="Busca global"
        />
        {loading ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <Spinner />
          </span>
        ) : (
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted md:block">
            /
          </kbd>
        )}
      </div>

      {open && results && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-96 overflow-y-auto rounded-lg border border-border-strong bg-surface-2 p-2 shadow-pop animate-fade-in">
          {!hasResults ? (
            <p className="px-3 py-6 text-center text-sm text-muted">
              Nenhum resultado para <span className="text-text">“{query}”</span>
            </p>
          ) : (
            <>
              {results.projects.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-xs font-medium text-muted">Projetos</p>
                  {results.projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => go(`/projects/${project.id}`)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-text",
                        "hover:bg-surface-3",
                      )}
                    >
                      <FolderKanban
                        className="h-4 w-4 shrink-0 theme-adaptive-ink"
                        style={{ color: project.color }}
                        aria-hidden
                      />
                      <span className="truncate">{project.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.tasks.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-xs font-medium text-muted">Tarefas</p>
                  {results.tasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => go(`/tasks?open=${task.id}`)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-text",
                        "hover:bg-surface-3",
                      )}
                    >
                      <SquareCheckBig className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                      <span className="truncate">{task.title}</span>
                      {task.projectName ? (
                        <span className="ml-auto shrink-0 text-xs text-muted">
                          {task.projectName}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
