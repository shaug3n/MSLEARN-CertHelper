"use client";

import { useEffect, useState } from "react";

const analysisQuotes = [
  "Great engineers trust version control before they trust memory.",
  "Cert prep is just debugging your own blind spots.",
  "The best study loop is answer, miss, fix, repeat.",
  "Every strong exam score starts with one honest baseline.",
];

export function AnalysisLoadingCard() {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setQuoteIndex((current) => (current + 1) % analysisQuotes.length);
    }, 30_000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-md border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#e0f2fe_45%,#fff7ed_100%)] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            Analysis In Progress
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Analyzing your study guide
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Building your practice workspace, generating questions, and mapping objectives.
          </p>
        </div>

        <div className="space-y-5 p-6">
          <div className="overflow-hidden rounded-full bg-slate-200">
            <div aria-hidden="true" className="analysis-progress-bar h-3 rounded-full" />
          </div>

          <div className="grid gap-3 text-sm text-slate-600">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
              <span>Fetching Microsoft Learn sources</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>Extracting objectives and citations</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Generating your practice experience</span>
            </div>
          </div>

          <div className="rounded-md bg-slate-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              While You Wait
            </p>
            <p className="mt-2 min-h-12 text-base leading-7 text-slate-800">
              {analysisQuotes[quoteIndex]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
