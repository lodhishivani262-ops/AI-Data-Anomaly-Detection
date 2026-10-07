"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { useDataset } from "@/lib/dataset-context";
import { ApiError, investigate } from "@/lib/api";
import { Card, ErrorState, Skeleton } from "@/components/layout/ui";
import { ChatBubble, ChatMessage } from "@/components/investigation/ChatBubble";

const SUGGESTED_PROMPTS = [
  "Show me the most unusual transactions.",
  "Why was this transaction flagged?",
  "What patterns are common among the anomalies?",
  "Are there unusual sales periods?",
  "Compare this anomaly with normal transactions.",
];

function InvestigationPageInner() {
  const { analysis, loading, error, refetch, datasetId } = useDataset();
  const searchParams = useSearchParams();
  const transactionId = searchParams.get("transactionId") || undefined;
  const rowIndexParam = searchParams.get("rowIndex");
  const rowIndex = rowIndexParam ? Number(rowIndexParam) : undefined;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const selectedAnomaly =
    analysis && (transactionId || rowIndex !== undefined)
      ? analysis.anomalies.anomalies.find(
          (a) =>
            (transactionId && a.transaction_id === transactionId) ||
            (rowIndex !== undefined && a.row_index === rowIndex)
        )
      : undefined;

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setSending(true);
    try {
      const result = await investigate(datasetId, text, {
        transaction_id: selectedAnomaly?.transaction_id ?? undefined,
        row_index: selectedAnomaly?.row_index,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: result.reply,
          evidence: result.evidence,
          basedOnMl: result.based_on_ml_analysis,
          llmAvailable: result.llm_available,
          note: result.note,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            err instanceof ApiError
              ? err.message
              : "Something went wrong while contacting the investigation service.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  if (loading || !analysis) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-[28rem] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
      <Card padded={false} className="flex h-[calc(100vh-9.5rem)] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-xs shadow-indigo-500/25">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">AI Investigation Copilot</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Strictly grounded in Isolation Forest statistical evidence</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="space-y-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Bot className="h-5 w-5" />
                <p className="text-sm font-semibold">Start an investigation</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Ask any question about anomalies, trends, or unusual patterns in this dataset. Answers are strictly
                grounded in the ML metrics already computed — numbers and evidence will never be fabricated.
              </p>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Suggested Prompts
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition-all hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-indigo-900 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <ChatBubble key={i} message={m} datasetId={datasetId} />
          ))}

          {sending && (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
              Retrieving evidence & generating grounded answer…
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this dataset or inspect an anomaly…"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs shadow-indigo-600/30 transition-all hover:bg-indigo-500 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            <span>Send</span>
          </button>
        </form>
      </Card>

      <div className="space-y-4">
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Active Dataset
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
            {analysis.profile.rows.toLocaleString()} rows · {analysis.profile.columns} columns
          </p>
          <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400 truncate">{datasetId}</p>
        </Card>

        {selectedAnomaly ? (
          <Card className="border-indigo-200/80 bg-gradient-to-b from-indigo-50/30 to-white dark:border-indigo-900/50 dark:from-indigo-950/20 dark:to-slate-900">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Selected Transaction
            </p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white">
              {selectedAnomaly.transaction_id ?? `Row #${selectedAnomaly.row_index}`}
            </p>
            <dl className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Anomaly score</dt>
                <dd className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {selectedAnomaly.anomaly_score}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Severity rating</dt>
                <dd className="font-medium capitalize text-slate-800 dark:text-slate-200">
                  {selectedAnomaly.severity}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Deviation percentile</dt>
                <dd className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {selectedAnomaly.evidence.percentile}%
                </dd>
              </div>
            </dl>
          </Card>
        ) : (
          <Card className="border-dashed bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/30">
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              No specific transaction selected. Open one from the <strong>Anomalies</strong> tab and click
              &ldquo;Investigate with AI&rdquo; to auto-attach its statistical evidence here.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function InvestigationPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <InvestigationPageInner />
    </Suspense>
  );
}
