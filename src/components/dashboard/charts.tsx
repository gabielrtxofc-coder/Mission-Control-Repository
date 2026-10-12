/** Gráficos SVG leves — sem dependências externas. */
import { cn } from "@/lib/utils";

export function BarDistribution({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted">{item.label}</span>
            <span className="font-medium text-text">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(item.value > 0 ? 4 : 0, (item.value / max) * 100)}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({
  items,
  centerLabel,
  centerValue,
  className,
}: {
  items: { label: string; value: number; color: string }[];
  centerLabel: string;
  centerValue: number | string;
  className?: string;
}) {
  const total = items.reduce((acc, i) => acc + i.value, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={cn("flex items-center gap-6", className)}>
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="var(--surface-3)"
            strokeWidth="12"
          />
          {total > 0 &&
            items.map((item) => {
              const length = (item.value / total) * circumference;
              const circle = (
                <circle
                  key={item.label}
                  cx="64"
                  cy="64"
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="12"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += length;
              return circle;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold text-text">{centerValue}</span>
          <span className="text-[10px] text-muted">{centerLabel}</span>
        </div>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
            <span className="text-muted">{item.label}</span>
            <span className="ml-auto font-medium text-text">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
