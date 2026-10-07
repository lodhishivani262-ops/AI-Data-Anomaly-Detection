"use client";

import { AlertTriangle, CheckCircle2, Copy, Hash, Info, ListTree } from "lucide-react";
import { useDataset } from "@/lib/dataset-context";
import { Card, EmptyState, ErrorState, SeverityBadge, Skeleton } from "@/components/layout/ui";
import { formatNumber, formatPercent } from "@/lib/format";

function missingSeverity(pct: number): "critical" | "warning" | "informational" {
  if (pct >= 30) return "critical";
  if (pct >= 5) return "warning";
  return "informational";
}

export default function QualityPage() {
  const { analysis, loading, error, refetch } = useDataset();

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  if (loading || !analysis) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const q = analysis.quality;
  const totalIssues =
    q.missing_values.length +
    (q.duplicates.duplicate_row_count > 0 ? 1 : 0) +
    q.constant_columns.length +
    q.high_cardinality_columns.length +
    q.suspicious_types.length +
    q.invalid_values.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Data Quality
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {totalIssues} issue{totalIssues === 1 ? "" : "s"} detected across {q.total_columns} columns
            and {formatNumber(q.total_rows)} rows.
          </p>
        </div>
        {totalIssues === 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            100% Clean Schema
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            Action Recommended
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard icon={AlertTriangle} label="Missing values" value={q.missing_values.length} tone="amber" />
        <SummaryCard icon={Copy} label="Duplicate rows" value={q.duplicates.duplicate_row_count} tone="rose" />
        <SummaryCard icon={Hash} label="Constant columns" value={q.constant_columns.length} tone="indigo" />
        <SummaryCard icon={ListTree} label="High cardinality" value={q.high_cardinality_columns.length} tone="sky" />
      </div>

      <Card>
        <SectionTitle>Missing value analysis</SectionTitle>
        {q.missing_values.length === 0 ? (
          <EmptyState title="No missing values" description="Every column in this dataset is 100% populated." />
        ) : (
          <Table
            headers={["Column", "Missing count", "Missing percentage", "Impact severity"]}
            rows={q.missing_values.map((m) => [
              <span key={m.column} className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{m.column}</span>,
              formatNumber(m.missing_count),
              formatPercent(m.missing_percentage),
              <SeverityBadge key={m.column} severity={missingSeverity(m.missing_percentage)} />,
            ])}
          />
        )}
      </Card>

      <Card>
        <SectionTitle>Duplicate records</SectionTitle>
        {q.duplicates.duplicate_row_count === 0 ? (
          <EmptyState title="No duplicate rows" description="All records are unique across rows." />
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SeverityBadge severity={q.duplicates.duplicate_percentage >= 10 ? "critical" : "warning"} />
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {formatNumber(q.duplicates.duplicate_row_count)} exact duplicate rows (
              {formatPercent(q.duplicates.duplicate_percentage)} of dataset). Sample row indices:{" "}
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {q.duplicates.sample_row_indices.join(", ") || "—"}
              </span>
            </p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle icon={Info}>Constant columns</SectionTitle>
          {q.constant_columns.length === 0 ? (
            <EmptyState title="None found" description="No columns have a single repeated value." />
          ) : (
            <Table
              headers={["Column", "Constant value"]}
              rows={q.constant_columns.map((c) => [
                <span key={c.column} className="font-mono text-xs">{c.column}</span>,
                String(c.constant_value),
              ])}
            />
          )}
        </Card>

        <Card>
          <SectionTitle icon={Info}>High-cardinality columns</SectionTitle>
          {q.high_cardinality_columns.length === 0 ? (
            <EmptyState title="None found" description="No categorical columns behave like identifiers." />
          ) : (
            <Table
              headers={["Column", "Unique values", "Ratio"]}
              rows={q.high_cardinality_columns.map((c) => [
                <span key={c.column} className="font-mono text-xs">{c.column}</span>,
                formatNumber(c.unique_count),
                formatPercent(c.unique_ratio * 100),
              ])}
            />
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle>Suspicious data types</SectionTitle>
        {q.suspicious_types.length === 0 ? (
          <EmptyState title="None found" description="No columns show mismatched or suspicious types." />
        ) : (
          <Table
            headers={["Column", "Declared type", "Issue detected"]}
            rows={q.suspicious_types.map((s) => [
              <span key={s.column} className="font-mono text-xs">{s.column}</span>,
              s.declared_dtype,
              s.issue,
            ])}
          />
        )}
      </Card>

      <Card>
        <SectionTitle>Invalid values</SectionTitle>
        {q.invalid_values.length === 0 ? (
          <EmptyState title="None found" description="No detectable invalid numeric or date values." />
        ) : (
          <Table
            headers={["Column", "Issue", "Affected rows"]}
            rows={q.invalid_values.map((i) => [
              <span key={i.column} className="font-mono text-xs">{i.column}</span>,
              i.issue,
              formatNumber(i.invalid_count),
            ])}
          />
        )}
      </Card>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "amber" | "rose" | "indigo" | "sky";
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50",
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50",
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50",
  };

  return (
    <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md dark:hover:border-slate-700">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        {formatNumber(value)}
      </p>
    </Card>
  );
}

function SectionTitle({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />}
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{children}</p>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:text-slate-400">
            {headers.map((h) => (
              <th key={h} className="py-2.5 pr-4">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {rows.map((row, i) => (
            <tr key={i} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
              {row.map((cell, j) => (
                <td key={j} className="py-3 pr-4 text-slate-700 dark:text-slate-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
