"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, Gauge, ShieldCheck, Sparkles, TrendingUp, UploadCloud } from "lucide-react";
import { ThemeToggle } from "@/lib/theme-context";

export default function LandingPage() {
  const router = useRouter();
  const [existingId, setExistingId] = useState("");

  function goToDataset(e: React.FormEvent) {
    e.preventDefault();
    if (existingId.trim()) {
      router.push(`/dashboard/${existingId.trim()}`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 transition-colors duration-200 dark:bg-[#090d16]">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-xs shadow-indigo-500/25">
            <Gauge className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
            Anomaly Copilot
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/upload"
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs shadow-indigo-600/30 transition-all hover:bg-indigo-500 sm:text-sm"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload dataset</span>
          </Link>
        </div>
      </header>

      <main className="relative mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        {/* Ambient background glow in dark mode */}
        <div className="pointer-events-none absolute -top-10 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-transparent blur-3xl dark:from-indigo-600/20 dark:via-purple-600/15" />

        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-4 py-1.5 text-xs font-semibold text-indigo-700 shadow-2xs dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>ML detects. Statistics prove it. AI explains it.</span>
        </div>

        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
          Find the transactions{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
            worth investigating
          </span>
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
          Upload a CSV or XLSX of transaction data. Isolation Forest and statistical analysis
          surface unusual records with concrete evidence, and an AI investigation layer helps
          you explore what the data shows — grounded strictly in computed evidence.
        </p>

        <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/upload"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition-all hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-600/30"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload a dataset</span>
          </Link>

          <form onSubmit={goToDataset} className="flex items-center gap-2">
            <input
              value={existingId}
              onChange={(e) => setExistingId(e.target.value)}
              placeholder="Paste existing dataset ID…"
              className="w-64 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span>Open</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-5 text-left sm:grid-cols-3">
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
            title="Evidence, not guesses"
            description="Every flagged transaction includes percentile, deviation, and score evidence — never a bare label."
          />
          <FeatureCard
            icon={<TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
            title="Trends & correlations"
            description="See how amounts and volumes move over time, and which columns exhibit statistical anomalies."
          />
          <FeatureCard
            icon={<Bot className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
            title="AI grounded in ML metrics"
            description="The investigation chat explains evidence the ML pipeline computed — never inventing metrics or hallucinations."
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-xs backdrop-blur-xs transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:border-slate-700">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60">
        {icon}
      </div>
      <p className="text-base font-semibold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  );
}
