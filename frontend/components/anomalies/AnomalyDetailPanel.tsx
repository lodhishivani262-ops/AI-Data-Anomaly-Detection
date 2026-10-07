import Link from "next/link";
import { MessageCircleQuestion, X } from "lucide-react";
import { SeverityBadge } from "@/components/layout/ui";
import { formatScore } from "@/lib/format";
import { AnomalyRecord } from "@/lib/types";

export function AnomalyDetailPanel({
  anomaly,
  datasetId,
  onClose,
}: {
  anomaly: AnomalyRecord;
  datasetId: string;
  onClose: () => void;
}) {
  const investigateHref = `/dashboard/${datasetId}/investigate?transactionId=${encodeURIComponent(
    anomaly.transaction_id ?? ""
  )}&rowIndex=${anomaly.row_index}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl transition-colors dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Investigation Candidate
            </p>
            <h2 className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-white">
              {anomaly.transaction_id ?? `Row #${anomaly.row_index}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2.5">
          <SeverityBadge severity={anomaly.severity} />
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
            Row index {anomaly.row_index}
          </span>
        </div>

        <section className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Statistical Evidence
          </p>
          <dl className="mt-2.5 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Anomaly Score" value={formatScore(anomaly.anomaly_score)} />
            <Metric
              label="Deviation Percentile"
              value={anomaly.evidence.percentile !== null ? `${anomaly.evidence.percentile}%` : "—"}
            />
            <Metric label="Feature Median" value={formatScore(anomaly.evidence.median)} />
            <Metric label="Deviation from Median" value={formatScore(anomaly.evidence.deviation_from_median)} />
          </dl>
        </section>

        <section className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Original Row Values
          </p>
          <dl className="mt-2.5 space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40">
            {Object.entries(anomaly.original_values).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-3 border-b border-slate-200/50 py-1.5 last:border-0 dark:border-slate-800/60">
                <dt className="text-slate-500 dark:text-slate-400">{key}</dt>
                <dd className="truncate font-mono font-medium text-slate-800 dark:text-slate-200">
                  {String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Feature Space Vector
          </p>
          <dl className="mt-2.5 space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40">
            {Object.entries(anomaly.evidence.feature_values).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-3 border-b border-slate-200/50 py-1.5 last:border-0 dark:border-slate-800/60">
                <dt className="text-slate-500 dark:text-slate-400">{key}</dt>
                <dd className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {formatScore(value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <Link
          href={investigateHref}
          className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-xs shadow-indigo-600/30 transition-all hover:bg-indigo-500"
        >
          <MessageCircleQuestion className="h-4 w-4" />
          Investigate with AI
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/60">
      <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}
