import { cn } from "@/lib/utils";

/** Identidade visual Mission Control — marca de comando/original. */
export function MissionControlLogo({
  size = "md",
  className,
  showText = true,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}) {
  const dims = {
    sm: { box: "h-6 w-6", text: "text-sm", gap: "gap-2" },
    md: { box: "h-8 w-8", text: "text-base", gap: "gap-2.5" },
    lg: { box: "h-11 w-11", text: "text-xl", gap: "gap-3" },
  }[size];

  return (
    <span className={cn("inline-flex items-center", dims.gap, className)}>
      <svg
        viewBox="0 0 40 40"
        className={`${dims.box} text-accent`}
        fill="none"
        aria-hidden
      >
        <rect width="40" height="40" rx="10" fill="currentColor" fillOpacity="0.12" />
        <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="9.25" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
        {/* radar / crosshair */}
        <circle cx="20" cy="20" r="10.5" stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.8" />
        <circle cx="20" cy="20" r="5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="20" cy="20" r="1.8" fill="currentColor" />
        <path d="M20 6.5V11M20 29V33.5M6.5 20H11M29 20H33.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {showText ? (
        <span className={cn("font-semibold tracking-tight text-text", dims.text)}>
          Mission <span className="text-accent">Control</span>
        </span>
      ) : null}
    </span>
  );
}
