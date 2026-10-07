"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle, Calendar, RotateCcw, TrendingUp } from "lucide-react";
import { useDataset } from "@/lib/dataset-context";
import { Card, EmptyState, ErrorState, Skeleton } from "@/components/layout/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useTheme } from "@/lib/theme-context";

type Metric = "transaction_count" | "total_amount" | "average_amount";

const METRIC_LABEL: Record<Metric, string> = {
  transaction_count: "Transaction count",
  total_amount: "Total amount",
  average_amount: "Average amount",
};

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number | string; name: string }>;
  label?: string;
  metric: Metric;
}

function TrendsCustomTooltip({ active, payload, label, metric }: TooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0].value;
  const formatted =
    metric === "transaction_count"
      ? formatNumber(Number(val))
      : formatCurrency(Number(val));

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/95 p-3 text-xs shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
      <p className="mb-1 font-semibold text-slate-800 dark:text-slate-200">{label}</p>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-indigo-500" />
        <span className="text-slate-500 dark:text-slate-400">{METRIC_LABEL[metric]}:</span>
        <span className="font-mono font-bold text-slate-900 dark:text-white">{formatted}</span>
      </div>
    </div>
  );
}

export default function TrendsPage() {
  const { analysis, loading, error, refetch } = useDataset();
  const [metric, setMetric] = useState<Metric>("total_amount");
  const [range, setRange] = useState<[number, number] | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const trends = analysis?.trends;

  const points = useMemo(() => {
    if (!trends?.points) return [];
    if (!range) return trends.points;
    return trends.points.slice(range[0], range[1] + 1);
  }, [trends, range]);

  const notablePeriods = useMemo(
    () => new Set((trends?.notable_changes ?? []).map((c) => c.period)),
    [trends]
  );

  const gridColor = isDark ? "#1e293b" : "#f1f5f9";
  const textColor = isDark ? "#94a3b8" : "#64748b";

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  if (loading || !analysis) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!trends?.available) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Trends
        </h1>
        <EmptyState
          title="Trend analysis unavailable"
          description={
            trends?.message ??
            "No suitable datetime and amount column combination was found for this dataset."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Trends
          </h1>
          <p className="text-sm capitalize text-slate-500 dark:text-slate-400">
            {trends.granularity} frequency · {trends.datetime_column} / {trends.amount_column}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(METRIC_LABEL) as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                metric === m
                  ? "bg-indigo-600 text-white shadow-xs shadow-indigo-600/30"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {METRIC_LABEL[m]}
            </button>
          ))}
          {range && (
            <button
              onClick={() => setRange(null)}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
        </div>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {METRIC_LABEL[metric]} over time
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive timeline with z-score anomaly change markers
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              Statistical spike/drop
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={points} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: textColor }} minTickGap={20} stroke={gridColor} />
            <YAxis tick={{ fontSize: 11, fill: textColor }} stroke={gridColor} />
            <Tooltip content={<TrendsCustomTooltip metric={metric} />} />
            <Line
              type="monotone"
              dataKey={metric}
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: "#6366f1" }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            {points.map((p, i) =>
              notablePeriods.has(p.period) ? (
                <ReferenceDot
                  key={i}
                  x={p.period}
                  y={p[metric]}
                  r={6}
                  fill="#f43f5e"
                  stroke={isDark ? "#090d16" : "#ffffff"}
                  strokeWidth={2}
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
          * Red markers indicate periods with statistically significant changes flagged by z-score deviation.
        </p>
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-indigo-500" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Date range filter</p>
        </div>
        <div className="space-y-3">
          <input
            type="range"
            min={0}
            max={trends.points.length - 1}
            value={range ? range[0] : 0}
            onChange={(e) =>
              setRange([Number(e.target.value), range ? range[1] : trends.points.length - 1])
            }
            className="w-full accent-indigo-600"
          />
          <input
            type="range"
            min={0}
            max={trends.points.length - 1}
            value={range ? range[1] : trends.points.length - 1}
            onChange={(e) => setRange([range ? range[0] : 0, Number(e.target.value)])}
            className="w-full accent-indigo-600"
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-xs text-slate-500 dark:text-slate-400">
          <span>{trends.points[0]?.period}</span>
          <span>{trends.points[trends.points.length - 1]?.period}</span>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-rose-500" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Notable changes detected</p>
        </div>
        {trends.notable_changes.length === 0 ? (
          <EmptyState
            title="No notable changes detected"
            description="No period deviated enough from the overall pattern to flag statistically."
          />
        ) : (
          <ul className="space-y-2.5">
            {trends.notable_changes.map((c, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/70 p-3.5 text-sm dark:border-rose-900/50 dark:bg-rose-950/30"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <div>
                  <p className="font-mono text-xs font-bold text-slate-900 dark:text-white">{c.period}</p>
                  <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">
                    {c.change_description} (z-score: <span className="font-mono font-semibold">{c.z_score}</span>)
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
