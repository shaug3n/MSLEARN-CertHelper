"use client";

import Link from "next/link";

import { AppShell, CitationList, EmptyState, ErrorState, formatAnswer, LoadingState } from "./shared";
import type { GuideState } from "./types";
import { useGuide } from "./use-guide";

export function ResultsScreen({ guideId }: { guideId: string }) {
  const { error, guide, loading } = useGuide(guideId);

  if (loading) return <LoadingState label="Loading results..." />;
  if (error || !guide) return <ErrorState message={error ?? "Guide not found."} />;

  const wrongAnswers = guide.latestAttempt?.answers.filter((answer) => !answer.correct) ?? [];

  return (
    <AppShell activeView="results" guide={guide}>
      {!guide.latestAttempt ? (
        <EmptyState
          action={
            <Link
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
              href={`/guide/${guide.id}/practice`}
            >
              Start practice test
            </Link>
          }
          message="Submit a practice test before reviewing answers and remediation."
          title="No scored attempt yet"
        />
      ) : (
        <div className="space-y-6">
          <ResultsOverview guide={guide} />
          <IncorrectAnswers answers={wrongAnswers} />
          <Remediation guide={guide} />
        </div>
      )}
    </AppShell>
  );
}

function ResultsOverview({ guide }: { guide: GuideState }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Practice Test Results</h2>
          <p className="mt-1 text-sm text-slate-600">
            Review misses first, then use remediation and flashcards.
          </p>
        </div>
        <div
          aria-label={`Practice test score ${guide.readiness.overallScore}%`}
          className="rounded-md bg-blue-700 px-6 py-5 text-center text-white"
        >
          <div className="text-4xl font-semibold">{guide.readiness.overallScore}%</div>
          <div className="text-xs font-semibold uppercase">overall</div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md bg-slate-50 p-4">
          <h3 className="text-sm font-semibold uppercase text-slate-500">Domain Scores</h3>
          <div className="mt-3 space-y-3">
            {guide.readiness.domains.map((domain) => (
              <div key={domain.domain}>
                <div className="flex justify-between text-sm">
                  <span>{domain.domain}</span>
                  <span>{domain.score}%</span>
                </div>
                <div className="mt-1 h-2 rounded bg-white">
                  <div className="h-2 rounded bg-blue-700" style={{ width: `${domain.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md bg-blue-50 p-4">
          <h3 className="text-sm font-semibold uppercase text-blue-800">Recommended Next Step</h3>
          <p className="mt-3 text-sm font-medium text-blue-950">{guide.readiness.recommendation}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
              href={`/guide/${guide.id}/flashcards`}
            >
              Study flashcards
            </Link>
            <Link
              className="rounded-md border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-900"
              href={`/guide/${guide.id}/practice`}
            >
              Retake practice test
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function IncorrectAnswers({
  answers,
}: {
  answers: NonNullable<GuideState["latestAttempt"]>["answers"];
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-semibold">Incorrect Answers</h2>
      <p className="mt-1 text-sm text-slate-600">
        {answers.length ? `${answers.length} questions need review.` : "No wrong answers in the latest attempt."}
      </p>
      <div className="mt-4 space-y-4">
        {answers.map((answer, index) => (
          <div className="rounded-md border border-red-200 bg-red-50 p-4" key={answer.questionId}>
            <p className="text-xs font-semibold uppercase text-red-700">Missed question {index + 1}</p>
            <h3 className="mt-1 font-semibold text-red-950">{answer.prompt}</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <AnswerBox label="Your answer" tone="bad" value={answer.selectedAnswer} />
              <AnswerBox label="Correct answer" tone="good" value={answer.correctAnswer} />
            </div>
            <p className="mt-3 text-sm text-red-900">{answer.feedback}</p>
            <CitationList citations={answer.citations} />
          </div>
        ))}
      </div>
    </section>
  );
}

function Remediation({ guide }: { guide: GuideState }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-semibold">Gap Remediation</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {guide.remediationPacks.length ? (
          guide.remediationPacks.map((pack) => (
            <div className="rounded-md border border-slate-200 p-4" key={pack.id}>
              <h3 className="font-semibold">{pack.summary}</h3>
              <p className="mt-2 text-sm text-slate-700">{pack.lesson}</p>
              <p className="mt-2 text-sm text-slate-700">{pack.workedExample}</p>
              <CitationList citations={pack.citations} />
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-600">Remediation appears after scoring a test.</p>
        )}
      </div>
    </section>
  );
}

function AnswerBox({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "bad" | "good";
  value: string | string[];
}) {
  return (
    <div className={`rounded-md p-3 ${tone === "good" ? "bg-emerald-50" : "bg-white"}`}>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium">{formatAnswer(value)}</p>
    </div>
  );
}
