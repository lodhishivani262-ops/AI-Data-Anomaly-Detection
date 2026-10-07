import { AlertTriangle, Database, ShieldAlert, TrendingUp } from "lucide-react";
import { Card } from "@/components/layout/ui";
import { formatNumber, formatPercent } from "@/lib/format";
import { FullAnalysisResponse } from "@/lib/types";

export function KpiCards({ analysis }: { analysis: FullAnalysisResponse }) {
  const { profile, anomalies, quality } = analysis;

  const anomalyPct =
    anomalies.available && anomalies.total_rows > 0
      ? (anomalies.anomaly_count / anomalies.total_rows) * 100
      : null;

  const qualityIssueCount =
    quality.missing_values.length +
    (quality.duplicates.duplicate_row_count > 0 ? 1 : 0) +
    quality.constant_columns.length +
    quality.high_cardinality_columns.length +
    quality.suspicious_types.length +
    quality.invalid_values.length;

  const items = [
    {
      label: "Total records",
      value: formatNumber(profile.rows),
      subtitle: `${profile.columns} columns analyzed`,
      icon: Database,
      iconBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50",
    },
    {
      label: "Anomalies detected",
      value: anomalies.available ? formatNumber(anomalies.anomaly_count) : "N/A",
      subtitle: anomalies.available ? "Flagged by Isolation Forest" : "Insufficient rows",
      icon: ShieldAlert,
      iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50",
    },
    {
      label: "Anomaly rate",
      value: anomalyPct !== null ? formatPercent(anomalyPct) : "N/A",
      subtitle: anomalyPct !== null ? `${anomalyPct < 5 ? "Normal baseline" : "Elevated frequency"}` : "Not computed",
      icon: TrendingUp,
      iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50",
    },
    {
      label: "Data quality issues",
      value: formatNumber(qualityIssueCount),
      subtitle: qualityIssueCount === 0 ? "Clean dataset" : "Attention needed",
      icon: AlertTriangle,
      iconBg: "bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <Card
          key={item.label}
          className="group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:hover:border-slate-700"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {item.label}
            </p>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.iconBg}`}>
              <item.icon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {item.value}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {item.subtitle}
          </p>
        </Card>
      ))}
    </div>
  );
}
