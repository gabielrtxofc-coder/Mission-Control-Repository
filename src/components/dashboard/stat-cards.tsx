import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatCardProps = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  href: string;
  tone?: "default" | "accent" | "danger" | "warning" | "info";
  hint?: string;
};

const TONES = {
  default: "text-muted",
  accent: "text-accent",
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
} as const;

export function StatCard({ label, value, icon: Icon, href, tone = "default", hint }: StatCardProps) {
  return (
    <Link
      href={href}
      className="surface-panel group flex flex-col gap-3 p-5 transition-colors hover:border-border-strong"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        <Icon className={cn("h-4 w-4", TONES[tone])} aria-hidden />
      </div>
      <div>
        <span className="text-2xl font-semibold tracking-tight text-text">{value}</span>
        {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      </div>
    </Link>
  );
}
