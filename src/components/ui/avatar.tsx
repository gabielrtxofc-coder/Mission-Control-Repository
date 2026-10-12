import * as React from "react";
import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  color = "#A3E635",
  size = "md",
  className,
}: {
  name: string;
  color?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    xs: "h-5 w-5 text-[9px]",
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-11 w-11 text-sm",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        sizes[size],
        className,
      )}
      style={{
        backgroundColor: `${color ?? "#A3E635"}22`,
        color: color ?? "#A3E635",
        border: `1px solid ${color ?? "#A3E635"}44`,
      }}
      title={name}
      aria-label={name}
    >
      <span className="theme-adaptive-ink">{initials(name)}</span>
    </span>
  );
}

export function UserCell({
  name,
  color,
  email,
  size = "md",
  className,
}: {
  name: string;
  color?: string | null;
  email?: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <Avatar name={name} color={color} size={size} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm text-text">{name}</span>
        {email ? <span className="truncate text-xs text-muted">{email}</span> : null}
      </span>
    </span>
  );
}
