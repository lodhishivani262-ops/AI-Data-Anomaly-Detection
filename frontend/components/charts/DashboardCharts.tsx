"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, EmptyState } from "@/components/layout/ui";
import { TrendPoint, AnomalyRecord } from "@/lib/types";
import { useTheme } from "@/lib/theme-context";

const COLORS = {
  amount: "#6366f1",
  count: "#06b6d4",
  high: "#f43f5e",
  medium: "#f59e0b",
  low: "#64748b",
};

interface TooltipPayloadItem {
  name: string;
  value: number | string;
  color?: string;
  fill?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/95 p-3 text-xs shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
      {label && <p className="mb-1.5 font-semibold text-slate-800 dark:text-slate-200">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill || "#6366f1" }}
            />
            <span className="text-slate-500 dark:text-slate-400">{entry.name}:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TransactionActivityChart({
  points,
  granularity,
}: {
  points: TrendPoint[];
  granularity: string | null;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gridColor = isDark ? "#1e293b" : "#f1f5f9";
  const textColor = isDark ? "#94a3b8" : "#64748b";

  if (points.length === 0) {
    return (
      <EmptyState
        title="No trend data available"
        description="This dataset has no usable datetime column, so activity over time can't be charted."
      />
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Transaction activity over time
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Volume and monetary totals by period
          </p>
        </div>
        {granularity && (
          <span className="rounded-full border border-slate-200 bg-slate-100/70 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
            {granularity}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={points} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: textColor }} minTickGap={24} stroke={gridColor} />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: textColor }} stroke={gridColor} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: textColor }} stroke={gridColor} />
          <Tooltip content={<CustomChartTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
            formatter={(val) => <span className="text-slate-600 dark:text-slate-300">{val}</span>}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="transaction_count"
            name="Transactions"
            stroke={COLORS.count}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="total_amount"
            name="Total amount"
            stroke={COLORS.amount}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function AnomalySeverityChart({ anomalies }: { anomalies: AnomalyRecord[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gridColor = isDark ? "#1e293b" : "#f1f5f9";
  const textColor = isDark ? "#94a3b8" : "#64748b";

  const counts = { high: 0, medium: 0, low: 0 };
  anomalies.forEach((a) => {
    counts[a.severity] += 1;
  });
  const data = [
    { severity: "High", count: counts.high, fill: COLORS.high },
    { severity: "Medium", count: counts.medium, fill: COLORS.medium },
    { severity: "Low", count: counts.low, fill: COLORS.low },
  ];

  if (anomalies.length === 0) {
    return (
      <EmptyState
        title="No anomalies to distribute"
        description="No rows were flagged as statistically unusual for this dataset."
      />
    );
  }

  return (
    <Card>
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Anomaly severity distribution
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Transactions categorized by Isolation Forest outlier score
        </p>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: textColor }} allowDecimals={false} stroke={gridColor} />
          <YAxis type="category" dataKey="severity" tick={{ fontSize: 12, fill: textColor }} width={64} stroke={gridColor} />
          <Tooltip content={<CustomChartTooltip />} />
          <Bar dataKey="count" name="Count" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function CategorySummaryChart({
  title,
  topValues,
}: {
  title: string;
  topValues: Record<string, number> | null;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gridColor = isDark ? "#1e293b" : "#f1f5f9";
  const textColor = isDark ? "#94a3b8" : "#64748b";

  if (!topValues || Object.keys(topValues).length === 0) {
    return (
      <EmptyState
        title="No category breakdown available"
        description="This dataset has no suitable categorical column (e.g. country, category, customer) to summarize."
      />
    );
  }
  const data = Object.entries(topValues).map(([name, count]) => ({ name, count }));

  return (
    <Card>
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Frequency breakdown of leading categories</p>
      </div>
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={data} margin={{ left: 0, right: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: textColor }} interval={0} angle={-15} textAnchor="end" height={45} stroke={gridColor} />
          <YAxis tick={{ fontSize: 11, fill: textColor }} allowDecimals={false} stroke={gridColor} />
          <Tooltip content={<CustomChartTooltip />} />
          <Bar dataKey="count" name="Frequency" fill={COLORS.amount} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function AmountQuartileChart({
  stats,
  columnName,
}: {
  stats: Record<string, unknown> | null;
  columnName: string | null;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gridColor = isDark ? "#1e293b" : "#f1f5f9";
  const textColor = isDark ? "#94a3b8" : "#64748b";

  if (!stats || !columnName) {
    return (
      <EmptyState
        title="No amount column detected"
        description="No transaction amount (or Quantity × Unit Price) column was found for this dataset."
      />
    );
  }
  const data = [
    { label: "Min", value: Number(stats.min ?? 0) },
    { label: "Q1 (25%)", value: Number(stats.pct25 ?? 0) },
    { label: "Median (50%)", value: Number(stats.pct50 ?? 0) },
    { label: "Q3 (75%)", value: Number(stats.pct75 ?? 0) },
    { label: "Max", value: Number(stats.max ?? 0) },
  ];

  return (
    <Card>
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Amount distribution ({columnName})
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Quartile summary from statistical profile
        </p>
      </div>
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={data} margin={{ left: 0, right: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: textColor }} stroke={gridColor} />
          <YAxis tick={{ fontSize: 11, fill: textColor }} stroke={gridColor} />
          <Tooltip content={<CustomChartTooltip />} />
          <Bar dataKey="value" name="Amount" fill={COLORS.count} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
