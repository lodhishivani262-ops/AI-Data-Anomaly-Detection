import { Bot, ExternalLink, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { EvidenceReference } from "@/lib/types";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  evidence?: EvidenceReference[];
  basedOnMl?: boolean;
  llmAvailable?: boolean;
  note?: string | null;
}

export function ChatBubble({ message, datasetId }: { message: ChatMessage; datasetId: string }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-xs transition-colors ${
          isUser
            ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            : "bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-indigo-500/25"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`max-w-[85%] space-y-2.5 ${isUser ? "items-end text-right" : ""}`}>
        <div
          className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-indigo-600 text-white shadow-xs shadow-indigo-600/20"
              : "border border-slate-200/90 bg-white text-slate-800 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          }`}
        >
          {message.text}
        </div>

        {!isUser && message.basedOnMl && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Sparkles className="h-3 w-3" />
            Grounded in ML analysis
          </span>
        )}

        {!isUser && message.note && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            {message.note}
          </div>
        )}

        {!isUser && message.evidence && message.evidence.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Computed Evidence References
            </p>
            {message.evidence.map((e, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-left text-xs transition-colors dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium capitalize text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {e.type}
                  </span>
                  {e.transaction_id && (
                    <Link
                      href={`/dashboard/${datasetId}/anomalies?search=${e.transaction_id}`}
                      className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      Inspect anomaly <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                <p className="mt-1.5 font-sans leading-relaxed text-slate-700 dark:text-slate-300">
                  {e.summary}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
