"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  FileSpreadsheet,
  Gauge,
  Loader2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { ApiError, uploadDataset } from "@/lib/api";
import { ThemeToggle } from "@/lib/theme-context";

type UploadState = "idle" | "uploading" | "success" | "error";
const ALLOWED = [".csv", ".xlsx"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateAndSet = useCallback((f: File) => {
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED.includes(ext)) {
      setState("error");
      setErrorMessage("Only .csv and .xlsx files are supported.");
      return;
    }
    setFile(f);
    setState("idle");
    setErrorMessage(null);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) validateAndSet(dropped);
  }

  async function startUpload() {
    if (!file) return;
    setState("uploading");
    setProgress(0);
    setErrorMessage(null);
    try {
      const result = await uploadDataset(file, setProgress);
      setState("success");
      setTimeout(() => router.push(`/dashboard/${result.dataset_id}`), 600);
    } catch (err) {
      setState("error");
      setErrorMessage(err instanceof ApiError ? err.message : "Upload failed unexpectedly.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 transition-colors duration-200 dark:bg-[#090d16]">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-xs shadow-indigo-500/25">
            <Gauge className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
            Anomaly Copilot
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Upload a transaction dataset
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Upload CSV or XLSX files. The backend validates schema integrity, calculates summary
          statistics, infers column roles, and automatically initiates Isolation Forest anomaly detection.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`mt-8 flex cursor-pointer flex-col items-center justify-center gap-3.5 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all ${
            dragActive
              ? "border-indigo-500 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/30"
              : "border-slate-300 bg-white/80 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Drag and drop your file here, or click to browse
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Supported file types: .csv, .xlsx
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) validateAndSet(f);
            }}
          />
        </div>

        {file && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</p>
              </div>
              {state === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              {state === "error" && <XCircle className="h-5 w-5 text-rose-500" />}
            </div>

            {state === "uploading" && (
              <div className="mt-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Uploading dataset… {progress}%
                </p>
              </div>
            )}

            {state === "success" && (
              <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Upload complete — initializing AI dashboard…
              </p>
            )}

            {state === "error" && errorMessage && (
              <p className="mt-4 text-xs font-medium text-rose-600 dark:text-rose-400">
                {errorMessage}
              </p>
            )}

            {(state === "idle" || state === "error") && (
              <button
                onClick={startUpload}
                className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-xs shadow-indigo-600/30 transition-all hover:bg-indigo-500"
              >
                Upload and analyze
              </button>
            )}
          </div>
        )}

        {!file && state === "error" && errorMessage && (
          <p className="mt-4 text-xs font-medium text-rose-600 dark:text-rose-400">{errorMessage}</p>
        )}
      </main>
    </div>
  );
}
