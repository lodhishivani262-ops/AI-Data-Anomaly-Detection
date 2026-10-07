import { clsx } from "clsx";

export function Card({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-colors dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none",
        padded && "p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

const severityConfig: Record<
  string,
  { container: string; dot: string }
> = {
  high: {
    container:
      "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60",
    dot: "bg-rose-500 shadow-xs shadow-rose-500/50",
  },
  critical: {
    container:
      "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60",
    dot: "bg-rose-500 shadow-xs shadow-rose-500/50",
  },
  medium: {
    container:
      "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60",
    dot: "bg-amber-500 shadow-xs shadow-amber-500/50",
  },
  warning: {
    container:
      "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60",
    dot: "bg-amber-500 shadow-xs shadow-amber-500/50",
  },
  low: {
    container:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700",
    dot: "bg-slate-400 dark:bg-slate-500",
  },
  informational: {
    container:
      "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60",
    dot: "bg-sky-500",
  },
};

export function SeverityBadge({ severity }: { severity: string }) {
  const cfg = severityConfig[severity.toLowerCase()] ?? severityConfig.low;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        cfg.container
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {severity}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/50 px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900/30">
      {icon && <div className="text-slate-400 dark:text-slate-500">{icon}</div>}
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</p>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-6 py-12 text-center dark:border-rose-900/60 dark:bg-rose-950/30">
      <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">Something went wrong</p>
      <p className="max-w-md text-sm text-rose-600 dark:text-rose-300">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-slate-800"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-lg bg-slate-200/80 dark:bg-slate-800/80",
        className
      )}
    />
  );
}

export function KpiCardSkeleton() {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="mt-3 h-8 w-20" />
      <Skeleton className="mt-2 h-3 w-32" />
    </Card>
  );
}
