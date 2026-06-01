"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AnalysisLoadingCard } from "./analysis-loading-card";
import { AppShell } from "./shared";
import { EXAM_TECH_FILTERS, examCatalog } from "@/lib/exam-catalog";

const sampleGuide =
  "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-900";

export function LandingScreen() {
  const router = useRouter();
  const [url, setUrl] = useState(sampleGuide);
  const [selectedPrefix, setSelectedPrefix] = useState<(typeof EXAM_TECH_FILTERS)[number]["prefix"]>("ALL");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSessionReady = useCallback(() => setSessionReady(true), []);
  const visibleExams = examCatalog.filter((exam) =>
    selectedPrefix === "ALL" ? true : exam.prefix === selectedPrefix,
  );

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/guides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not analyze guide.");
      return;
    }

    router.push(`/guide/${payload.guide.id}/practice`);
  }

  return (
    <AppShell onSessionReady={handleSessionReady}>
      {loading ? <AnalysisLoadingCard /> : null}
      <section className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
        <div className="rounded-md border border-slate-200 bg-white p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Professional exam prep
          </p>
          <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight">
            Convert Microsoft Learn study guides into a focused practice workspace.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Analyze the guide, move through questions one domain at a time, review exactly
            what you missed, then drill flashcards separately.
          </p>

          <div className="mt-8 space-y-4 rounded-md border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap gap-2">
              {EXAM_TECH_FILTERS.map((filter) => (
                <button
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    selectedPrefix === filter.prefix
                      ? "bg-slate-950 text-white"
                      : "bg-white text-slate-700 ring-1 ring-slate-200"
                  }`}
                  key={filter.prefix}
                  onClick={() => setSelectedPrefix(filter.prefix)}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <select
                aria-label="Certification study guide"
                className="min-h-12 rounded-md border border-slate-300 bg-white px-4 text-sm outline-none ring-blue-600 focus:ring-2"
                onChange={(event) => setUrl(event.target.value)}
                value={url}
              >
                <option value={sampleGuide}>Choose a certification study guide</option>
                {visibleExams.map((exam) => (
                  <option key={exam.code} value={exam.url}>
                    {exam.code} - {exam.technology}
                  </option>
                ))}
              </select>
              <div className="rounded-md bg-white px-4 py-3 text-xs text-slate-500 ring-1 ring-slate-200">
                {visibleExams.length} exams
              </div>
            </div>
          </div>

          <form onSubmit={analyze} className="mt-8 space-y-3">
            <label className="text-sm font-semibold" htmlFor="study-guide-url">
              Microsoft Learn study guide URL or selected certification
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                aria-label="Microsoft Learn study guide URL"
                className="min-h-12 flex-1 rounded-md border border-slate-300 bg-white px-4 text-sm outline-none ring-blue-600 focus:ring-2"
                id="study-guide-url"
                onChange={(event) => setUrl(event.target.value)}
                value={url}
              />
              <button
                className="min-h-12 rounded-md bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                disabled={loading || !ready || !sessionReady}
              >
                {loading ? "Analyzing..." : sessionReady ? "Analyze guide" : "Creating session..."}
              </button>
            </div>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
          </form>
        </div>

        <aside className="rounded-md border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-semibold">Workspace Flow</h3>
          <div className="mt-5 space-y-4">
            {[
              ["1", "Practice by domain", "One focused domain screen, not 50 questions in one scroll."],
              ["2", "Review results", "See wrong answers, your choice, correct answer, and citations."],
              ["3", "Study flashcards", "SRS review has its own page and rhythm."],
            ].map(([step, title, copy]) => (
              <div className="flex gap-3" key={step}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-semibold text-white">
                  {step}
                </span>
                <div>
                  <h4 className="font-semibold">{title}</h4>
                  <p className="mt-1 text-sm text-slate-600">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
