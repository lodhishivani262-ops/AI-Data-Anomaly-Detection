"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Database,
  Gauge,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  ShieldAlert,
  TrendingUp,
  UploadCloud,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { shortId } from "@/lib/format";
import { ThemeToggle } from "@/lib/theme-context";

interface AppShellProps {
  datasetId: string;
  children: React.ReactNode;
}

function navItems(datasetId: string) {
  const base = `/dashboard/${datasetId}`;
  return [
    { href: base, label: "Overview", icon: LayoutDashboard },
    { href: `${base}/anomalies`, label: "Anomalies", icon: ShieldAlert },
    { href: `${base}/quality`, label: "Data Quality", icon: AlertTriangle },
    { href: `${base}/trends`, label: "Trends", icon: TrendingUp },
    { href: `${base}/investigate`, label: "AI Investigation", icon: MessagesSquare },
  ];
}

export function AppShell({ datasetId, children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = navItems(datasetId);

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-200 dark:bg-[#090d16]">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md transition-colors sm:px-6 dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-xs shadow-indigo-500/25 transition-transform group-hover:scale-105">
              <Gauge className="h-5 w-5" />
            </div>
            <span className="hidden text-sm font-semibold tracking-tight text-slate-900 sm:inline dark:text-white">
              Anomaly Copilot
            </span>
          </Link>

          <span className="hidden items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-100/70 px-3 py-1 text-xs font-medium text-slate-600 sm:flex dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <Activity className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            Dataset <span className="font-mono">{shortId(datasetId)}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          <Link
            href="/upload"
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs shadow-indigo-600/30 transition-all hover:bg-indigo-500 hover:shadow-sm hover:shadow-indigo-600/40 sm:text-sm"
          >
            <UploadCloud className="h-4 w-4" />
            <span>New Upload</span>
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col justify-between border-r border-slate-200/80 bg-white/70 p-3.5 backdrop-blur-xs transition-colors lg:flex dark:border-slate-800/80 dark:bg-slate-900/60">
          <div>
            <div className="mb-2 px-3 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Navigation
            </div>
            <nav className="flex flex-col gap-1">
              {items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                      active
                        ? "bg-indigo-50 text-indigo-700 font-semibold shadow-2xs dark:bg-indigo-950/60 dark:text-indigo-400"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                    )}
                  >
                    <Icon
                      className={clsx(
                        "h-4 w-4 transition-colors",
                        active
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500"
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Quick Dataset Meta card */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-slate-800/80 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Database className="h-4 w-4 text-indigo-500" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Active Session
              </p>
            </div>
            <p className="mt-1 font-mono text-xs font-medium text-slate-700 dark:text-slate-300 truncate" title={datasetId}>
              {datasetId}
            </p>
            <Link
              href="/"
              className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Switch dataset <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </aside>

        {/* Sidebar (mobile drawer) */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-72 border-r border-slate-200 bg-white p-4 shadow-2xl transition-colors dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                    <Gauge className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">Anomaly Copilot</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-4 flex flex-col gap-1.5">
                {items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={clsx(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                        active
                          ? "bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-400"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-slate-200/80 bg-white/90 py-2 backdrop-blur-md transition-colors lg:hidden dark:border-slate-800/80 dark:bg-slate-900/90">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center gap-1 px-2 text-[11px] font-medium transition-colors",
                active
                  ? "text-indigo-600 font-semibold dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
      <div className="h-16 lg:hidden" />
    </div>
  );
}
