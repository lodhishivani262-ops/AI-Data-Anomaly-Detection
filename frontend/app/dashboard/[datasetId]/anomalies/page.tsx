"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Filter, Search } from "lucide-react";
import { useDataset } from "@/lib/dataset-context";
import { Card, EmptyState, ErrorState, SeverityBadge, Skeleton } from "@/components/layout/ui";
import { formatScore } from "@/lib/format";
import { AnomalyDetailPanel } from "@/components/anomalies/AnomalyDetailPanel";
import { AnomalyRecord, AnomalySeverity } from "@/lib/types";

type SortKey = "anomaly_score" | "row_index" | "percentile";
const PAGE_SIZE = 10;

export default function AnomaliesPage() {
  const { analysis, loading, error, refetch } = useDataset();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<AnomalySeverity | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("anomaly_score");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AnomalyRecord | null>(null);

  const anomalies = analysis?.anomalies;

  const filtered = useMemo(() => {
    if (!anomalies) return [];
    let list = anomalies.anomalies;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.transaction_id?.toLowerCase().includes(q) || String(a.row_index).includes(q)
      );
    }
    if (severityFilter !== "all") {
      list = list.filter((a) => a.severity === severityFilter);
    }

    const sorted = [...list].sort((a, b) => {
      const av = sortKey === "percentile" ? a.evidence.percentile ?? 0 : a[sortKey];
      const bv = sortKey === "percentile" ? b.evidence.percentile ?? 0 : b[sortKey];
      return sortAsc ? av - bv : bv - av;
    });
    return sorted;
  }, [anomalies, search, severityFilter, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
    setPage(1);
  }

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  if (loading || !analysis) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!anomalies?.available) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Anomalies
        </h1>
        <EmptyState
          title="Anomaly detection unavailable"
          description={
            anomalies?.message ??
            "This dataset doesn't have enough suitable data for anomaly detection."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Anomalies
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {anomalies.anomaly_count} of {anomalies.total_rows} records flagged as potential investigation candidates
          </p>
        </div>
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search ID or row index…"
              className="w-64 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 shadow-2xs outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500 sm:text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value as AnomalySeverity | "all");
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 sm:text-sm"
            >
              <option value="all">All severities</option>
              <option value="high">High only</option>
              <option value="medium">Medium only</option>
              <option value="low">Low only</option>
            </select>
          </div>

          <span className="ml-auto text-xs font-medium text-slate-400 dark:text-slate-500">
            Showing {filtered.length} candidate{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No matching anomalies"
              description="No records matched your search query or severity filter."
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                    <th className="px-5 py-3">Transaction ID</th>
                    <SortableHeader label="Row" active={sortKey === "row_index"} asc={sortAsc} onClick={() => toggleSort("row_index")} />
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Quantity</th>
                    <SortableHeader label="Anomaly Score" active={sortKey === "anomaly_score"} asc={sortAsc} onClick={() => toggleSort("anomaly_score")} />
                    <SortableHeader label="Percentile" active={sortKey === "percentile"} asc={sortAsc} onClick={() => toggleSort("percentile")} />
                    <th className="px-5 py-3">Severity</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {pageItems.map((a) => (
                    <tr
                      key={a.row_index}
                      onClick={() => setSelected(a)}
                      className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                        <span className="font-mono text-xs">
                          {a.transaction_id ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400">{a.row_index}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {a.original_values.amount != null ? String(a.original_values.amount) : "—"}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {a.original_values.quantity != null ? String(a.original_values.quantity) : "—"}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300">{formatScore(a.anomaly_score)}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {a.evidence.percentile !== null ? `${a.evidence.percentile}%` : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <SeverityBadge severity={a.severity} />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:underline dark:text-indigo-400">
                          Inspect details →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Page {page} of {totalPages} ({filtered.length} total)
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      {selected && (
        <AnomalyDetailPanel
          anomaly={selected}
          datasetId={analysis.dataset_id}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function SortableHeader({
  label,
  active,
  asc,
  onClick,
}: {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
}) {
  return (
    <th className="px-5 py-3">
      <button
        onClick={onClick}
        className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200"
      >
        <span>{label}</span>
        {active && (asc ? <ArrowUp className="h-3 w-3 text-indigo-500" /> : <ArrowDown className="h-3 w-3 text-indigo-500" />)}
      </button>
    </th>
  );
}
