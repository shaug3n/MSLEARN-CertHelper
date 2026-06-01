"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { SessionBadge } from "./session-badge";
import type { Citation, GuideState, View } from "./types";

export function AppShell({
  activeView,
  children,
  guide,
  onSessionReady,
}: {
  activeView?: View;
  children: ReactNode;
  guide?: GuideState | null;
  onSessionReady?: () => void;
}) {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <Link href="/" className="block">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                MS Certification Helper
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                {guide ? `${guide.examCode} study workspace` : "Build a focused study workspace"}
              </h1>
            </Link>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SessionBadge onReady={onSessionReady} />
              {guide ? <TopNav activeView={activeView ?? "practice"} guideId={guide.id} /> : null}
            </div>
          </div>
          {guide ? <GuideSummary guide={guide} /> : null}
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </main>
  );
}

export function EmptyState({
  action,
  message,
  title,
}: {
  action?: ReactNode;
  message: string;
  title: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-8 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">{message}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading workspace..." }: { label?: string }) {
  return (
    <AppShell>
      <EmptyState message="Fetching the latest guide state." title={label} />
    </AppShell>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <AppShell>
      <EmptyState
        action={
          <Link className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white" href="/">
            Analyze a guide
          </Link>
        }
        message={message}
        title="Could not load this guide"
      />
    </AppShell>
  );
}

export function CitationList({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null;

  return (
    <ul className="mt-3 space-y-1 text-xs text-slate-500">
      {citations.map((citation) => (
        <li key={`${citation.url}-${citation.headingPath.join("/")}`}>
          <a
            className="font-medium text-blue-700 hover:underline"
            href={citation.url}
            rel="noreferrer"
            target="_blank"
          >
            {citation.title}
          </a>{" "}
          - {citation.headingPath.join(" / ")}
        </li>
      ))}
    </ul>
  );
}

export function formatAnswer(value: string | string[]): string {
  if (Array.isArray(value)) return value.join(", ");
  return value || "No answer submitted";
}

function GuideSummary({ guide }: { guide: GuideState }) {
  const coverage = guide.sourceCoverage;
  return (
    <section className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold">{guide.title}</h2>
        <p className="mt-1 text-xs text-slate-600">
          {guide.objectives.length} objectives - {guide.sourceChunkCount} source chunks -{" "}
          {guide.questions.length} questions
        </p>
        {coverage ? (
          <p className="mt-1 text-xs text-slate-600">
            Sources: {coverage.totalPages} pages - {coverage.learnPaths} paths -{" "}
            {coverage.learnModules} modules - {coverage.externalDocs} external docs
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric label="Ready" value={`${guide.readiness.overallScore}%`} />
        <Metric label="Answered" value={`${guide.latestAttempt?.answers.length ?? 0}`} />
        <Metric label="Cards" value={`${guide.flashcards.length}`} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white px-3 py-2">
      <div className="text-lg font-semibold text-blue-800">{value}</div>
      <div className="text-[10px] font-semibold uppercase text-slate-500">{label}</div>
    </div>
  );
}

function TopNav({ activeView, guideId }: { activeView: View; guideId: string }) {
  const items: Array<{ href: string; label: string; view: View }> = [
    { href: `/guide/${guideId}/practice`, label: "Practice", view: "practice" },
    { href: `/guide/${guideId}/results`, label: "Results", view: "results" },
    { href: `/guide/${guideId}/flashcards`, label: "Flashcards", view: "flashcards" },
  ];

  return (
    <nav className="flex rounded-md border border-slate-200 bg-slate-50 p-1">
      {items.map((item) => (
        <Link
          className={`rounded px-4 py-2 text-sm font-semibold ${
            activeView === item.view ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-white"
          }`}
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
