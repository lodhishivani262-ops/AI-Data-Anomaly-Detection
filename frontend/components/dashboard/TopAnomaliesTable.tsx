import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { Card, EmptyState, SeverityBadge } from "@/components/layout/ui";
import { formatScore } from "@/lib/format";
import { AnomalyRecord } from "@/lib/types";

export function TopAnomaliesTable({
  anomalies,
  datasetId,
}: {
  anomalies: AnomalyRecord[];
  datasetId: string;
}) {
  if (anomalies.length === 0) {
    return (
      <EmptyState
        title="No anomalies found"
        description="The ML pipeline didn't flag any statistically unusual transactions in this dataset."
      />
    );
  }

  const top = [...anomalies].sort((a, b) => a.anomaly_score - b.anomaly_score).slice(0, 6);

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Top anomaly transactions
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Highest outlier probability identified by Isolation Forest
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/${datasetId}/anomalies`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          View all {anomalies.length} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
              <th className="px-5 py-3">Transaction</th>
              <th className="px-5 py-3">Anomaly Score</th>
              <th className="px-5 py-3">Deviation Percentile</th>
              <th className="px-5 py-3">Severity Level</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {top.map((a) => (
              <tr
                key={a.row_index}
                className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
              >
                <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                  <span className="font-mono text-xs">
                    {a.transaction_id ?? `Row #${a.row_index}`}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                  {formatScore(a.anomaly_score)}
                </td>
                <td className="px-5 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                  {a.evidence.percentile !== null ? `${a.evidence.percentile}%` : "—"}
                </td>
                <td className="px-5 py-3.5">
                  <SeverityBadge severity={a.severity} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
