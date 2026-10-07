"use client";

import { useDataset } from "@/lib/dataset-context";
import { KpiCards } from "@/components/dashboard/KpiCards";
import {
  AmountQuartileChart,
  AnomalySeverityChart,
  CategorySummaryChart,
  TransactionActivityChart,
} from "@/components/charts/DashboardCharts";
import { TopAnomaliesTable } from "@/components/dashboard/TopAnomaliesTable";
import { Card, ErrorState, KpiCardSkeleton, Skeleton } from "@/components/layout/ui";
import { ColumnProfile } from "@/lib/types";
import { Sparkles } from "lucide-react";

function findFirstCategoricalTopValues(columnProfiles: ColumnProfile[]): {
  columnName: string | null;
  topValues: Record<string, number> | null;
} {
  const preferredNames = ["country", "category", "customer_id", "customer", "payment_method"];
  const categorical = columnProfiles.filter((c) => c.role === "categorical" && c.stats?.top_values);

  const preferred = categorical.find((c) => preferredNames.includes(c.name.toLowerCase()));
  const chosen = preferred ?? categorical[0];
  if (!chosen) return { columnName: null, topValues: null };
  return { columnName: chosen.name, topValues: chosen.stats.top_values as Record<string, number> };
}

export default function OverviewPage() {
  const { analysis, loading, error, refetch } = useDataset();

  if (error) {
    return <ErrorState message={error} onRetry={refetch} />;
  }

  if (loading || !analysis) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const amountColumn = analysis.profile.numerical_columns.includes(
    analysis.trends.amount_column ?? ""
  )
    ? analysis.trends.amount_column
    : analysis.profile.column_profiles.find((c) => c.name === analysis.trends.amount_column)?.name ??
      null;

  const amountProfile = analysis.profile.column_profiles.find((c) => c.name === amountColumn);
  const { columnName: categoryColumnName, topValues } = findFirstCategoricalTopValues(
    analysis.profile.column_profiles
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {analysis.profile.rows.toLocaleString()} total rows across {analysis.profile.columns} analyzed dimensions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            AI & Isolation Forest
          </span>
        </div>
      </div>

      <KpiCards analysis={analysis} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TransactionActivityChart
          points={analysis.trends.points}
          granularity={analysis.trends.granularity}
        />
        <AnomalySeverityChart anomalies={analysis.anomalies.anomalies} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AmountQuartileChart stats={amountProfile?.stats ?? null} columnName={amountColumn} />
        <CategorySummaryChart
          title={categoryColumnName ? `Top values — ${categoryColumnName}` : "Category summary"}
          topValues={topValues}
        />
      </div>

      <TopAnomaliesTable anomalies={analysis.anomalies.anomalies} datasetId={analysis.dataset_id} />

      {analysis.anomalies.available && (
        <Card className="border-dashed bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40">
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <strong className="text-slate-700 dark:text-slate-300">Disclaimer: </strong>
            {analysis.anomalies.disclaimer}
          </p>
        </Card>
      )}
    </div>
  );
}
