"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AnalysisLoadingCard } from "./analysis-loading-card";
import { AppShell } from "./shared";

const sampleGuide =
  "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-900";

export function LandingScreen() {
  const router = useRouter();
  const [url, setUrl] = useState(sampleGuide);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSessionReady = useCallback(() => setSessionReady(true), []);

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

          <form onSubmit={analyze} className="mt-8 space-y-3">
            <label className="text-sm font-semibold" htmlFor="study-guide-url">
              Microsoft Learn study guide URL
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
