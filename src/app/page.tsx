"use client";

import { FormEvent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

type Citation = {
  url: string;
  title: string;
  headingPath: string[];
};

type Question = {
  id: string;
  objectiveId: string;
  type: string;
  prompt: string;
  choices: string[] | null;
  citations: Citation[];
  difficulty: string;
};

type GuideState = {
  id: string;
  url: string;
  title: string;
  examCode: string;
  objectives: Array<{
    id: string;
    domain: string;
    objective: string;
    weightMin?: number;
    weightMax?: number;
  }>;
  sourceChunkCount: number;
  questions: Question[];
  remediationPacks: Array<{
    id: string;
    objectiveId: string;
    summary: string;
    lesson: string;
    workedExample: string;
    citations: Citation[];
  }>;
  flashcards: Array<{
    id: string;
    objectiveId: string;
    front: string;
    back: string;
    citations: Citation[];
    dueAt: string;
    intervalDays: number;
    easeFactor: number;
    repetitions: number;
  }>;
  readiness: {
    overallScore: number;
    domains: Array<{ domain: string; score: number; correct: number; total: number }>;
    weakObjectives: Array<{
      objectiveId: string;
      domain: string;
      objective: string;
      score: number;
    }>;
    recommendation: string;
  };
};

const sampleGuide =
  "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-900";

export default function Home() {
  const [url, setUrl] = useState(sampleGuide);
  const [guide, setGuide] = useState<GuideState | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [showBack, setShowBack] = useState(false);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCard = useMemo(
    () => guide?.flashcards.find((card) => card.id === activeCardId) ?? guide?.flashcards[0],
    [activeCardId, guide?.flashcards],
  );

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading("Analyzing Microsoft Learn guide...");
    const response = await fetch("/api/guides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const payload = await response.json();
    setLoading(null);
    if (!response.ok) {
      setError(payload.error ?? "Could not analyze guide.");
      return;
    }
    setGuide(payload.guide);
    setAnswers({});
    setTestSubmitted(false);
    setActiveCardId(payload.guide.flashcards[0]?.id ?? null);
  }

  async function submitTest() {
    if (!guide) return;
    setError(null);
    setLoading("Scoring attempt and generating remediation...");
    const response = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guideId: guide.id, answers }),
    });
    const payload = await response.json();
    setLoading(null);
    if (!response.ok) {
      setError(payload.error ?? "Could not submit attempt.");
      return;
    }
    setGuide(payload.guide);
    setTestSubmitted(true);
  }

  async function reviewCard(rating: "forgot" | "hard" | "easy") {
    if (!activeCard) return;
    setLoading("Updating SRS schedule...");
    const response = await fetch(`/api/flashcards/${activeCard.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    const payload = await response.json();
    setLoading(null);
    if (!response.ok) {
      setError(payload.error ?? "Could not review card.");
      return;
    }
    setGuide(payload.guide);
    setActiveCardId(payload.guide.flashcards[0]?.id ?? null);
    setShowBack(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Microsoft certification readiness
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Turn a Microsoft Learn study guide into a diagnostic practice system.
            </h1>
          </div>
          <form onSubmit={analyze} className="flex flex-col gap-3 sm:flex-row">
            <input
              className="min-h-12 flex-1 rounded-md border border-slate-300 bg-white px-4 text-sm outline-none ring-blue-600 focus:ring-2"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              aria-label="Microsoft Learn study guide URL"
            />
            <button className="min-h-12 rounded-md bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800">
              Analyze guide
            </button>
          </form>
          {loading ? <p className="text-sm text-blue-700">{loading}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
      </section>

      {guide ? (
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <section className="space-y-6">
            <div className="rounded-md border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{guide.examCode}: {guide.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {guide.objectives.length} objectives, {guide.sourceChunkCount} cited source chunks, {guide.questions.length} questions.
                  </p>
                </div>
                <div className="rounded-md bg-blue-50 px-4 py-3 text-center">
                  <div className="text-3xl font-semibold text-blue-800">{guide.readiness.overallScore}%</div>
                  <div className="text-xs font-medium uppercase text-blue-800">readiness</div>
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-700">{guide.readiness.recommendation}</p>
            </div>

            {testSubmitted ? (
              <ResultsSummary
                guide={guide}
                onRetake={() => {
                  setAnswers({});
                  setTestSubmitted(false);
                }}
              />
            ) : (
              <div className="rounded-md border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Practice Test</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      50 multiple-choice questions. Choose the best answer for each prompt.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                    {Object.keys(answers).length}/{guide.questions.length} answered
                  </span>
                </div>
                <div className="mt-4 space-y-5">
                  {guide.questions.map((question, index) => (
                    <QuestionCard
                      key={question.id}
                      index={index}
                      question={question}
                      value={answers[question.id]}
                      onChange={(value) =>
                        setAnswers((current) => ({ ...current, [question.id]: value }))
                      }
                    />
                  ))}
                </div>
                <button
                  onClick={submitTest}
                  className="mt-5 rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Score practice test
                </button>
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <div className="rounded-md border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold">Metacognitive Analytics</h2>
              <div className="mt-4 space-y-3">
                {guide.readiness.domains.map((domain) => (
                  <div key={domain.domain}>
                    <div className="flex justify-between text-sm">
                      <span>{domain.domain}</span>
                      <span>{domain.score}%</span>
                    </div>
                    <div className="mt-1 h-2 rounded bg-slate-100">
                      <div className="h-2 rounded bg-blue-700" style={{ width: `${domain.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <h3 className="mt-5 text-sm font-semibold uppercase text-slate-500">Weak objectives</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {guide.readiness.weakObjectives.length ? (
                  guide.readiness.weakObjectives.map((objective) => (
                    <li key={objective.objectiveId} className="rounded bg-red-50 p-3 text-red-900">
                      {objective.domain}: {objective.objective} ({objective.score}%)
                    </li>
                  ))
                ) : (
                  <li className="rounded bg-emerald-50 p-3 text-emerald-900">
                    No weak objectives yet. Submit a practice test to reveal gaps.
                  </li>
                )}
              </ul>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold">Gap Remediation</h2>
              <div className="mt-4 space-y-4">
                {guide.remediationPacks.length ? (
                  guide.remediationPacks.map((pack) => (
                    <div key={pack.id} className="border-l-4 border-blue-700 pl-4">
                      <h3 className="font-semibold">{pack.summary}</h3>
                      <p className="mt-2 text-sm text-slate-700">{pack.lesson}</p>
                      <p className="mt-2 text-sm text-slate-700">{pack.workedExample}</p>
                      <CitationList citations={pack.citations} />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">Remediation packs appear after scoring a test.</p>
                )}
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold">SRS Flashcards</h2>
              {activeCard ? (
                <div className="mt-4">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                    <ReactMarkdown>{showBack ? activeCard.back : activeCard.front}</ReactMarkdown>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="rounded-md border px-3 py-2 text-sm" onClick={() => setShowBack((value) => !value)}>
                      {showBack ? "Show front" : "Show answer"}
                    </button>
                    <button className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white" onClick={() => reviewCard("forgot")}>
                      Forgot
                    </button>
                    <button className="rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => reviewCard("hard")}>
                      Hard
                    </button>
                    <button className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white" onClick={() => reviewCard("easy")}>
                      Easy
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Due {new Date(activeCard.dueAt).toLocaleDateString()} · interval {activeCard.intervalDays} days · repetitions {activeCard.repetitions}
                  </p>
                  <CitationList citations={activeCard.citations} />
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-600">Flashcards are generated during guide analysis.</p>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Active recall", "Multiple-choice diagnostics force recall instead of passive reading."],
              ["Spaced repetition", "Forgot, Hard, and Easy ratings schedule each flashcard."],
              ["Gap analytics", "Every result maps back to exact exam objectives."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-md border border-slate-200 bg-white p-5">
                <h2 className="font-semibold">{title}</h2>
                <p className="mt-2 text-sm text-slate-600">{copy}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function QuestionCard({
  index,
  question,
  value,
  onChange,
}: {
  index: number;
  question: Question;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
}) {
  return (
    <div className="rounded-md border border-slate-200 p-4">
      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase text-slate-500">
        <span>Question {index + 1}</span>
        <span>{question.type.replace("_", " ")}</span>
        <span>{question.difficulty}</span>
      </div>
      <p className="mt-2 font-medium">{question.prompt}</p>
      {question.choices ? (
        <div className="mt-3 space-y-2">
          {question.choices.map((choice) => (
            <label key={choice} className="flex gap-2 rounded border border-slate-200 p-2 text-sm">
              <input
                type="radio"
                name={question.id}
                checked={value === choice}
                onChange={() => onChange(choice)}
              />
              {choice}
            </label>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
          This question is missing answer choices. Regenerate the assessment.
        </p>
      )}
      <CitationList citations={question.citations} />
    </div>
  );
}

function ResultsSummary({
  guide,
  onRetake,
}: {
  guide: GuideState;
  onRetake: () => void;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Practice Test Results</h2>
          <p className="mt-1 text-sm text-slate-600">
            Questions are hidden after submission so the next action is review, not answer tweaking.
          </p>
        </div>
        <div
          className="rounded-md bg-blue-700 px-5 py-4 text-center text-white"
          aria-label={`Practice test score ${guide.readiness.overallScore}%`}
        >
          <div className="text-3xl font-semibold">{guide.readiness.overallScore}%</div>
          <div className="text-xs font-semibold uppercase">overall</div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
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

        <div className="rounded-md bg-red-50 p-4">
          <h3 className="text-sm font-semibold uppercase text-red-700">Priority Gaps</h3>
          <ul className="mt-3 space-y-2 text-sm text-red-950">
            {guide.readiness.weakObjectives.slice(0, 5).map((objective) => (
              <li key={objective.objectiveId}>
                {objective.domain}: {objective.objective} ({objective.score}%)
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-5 rounded-md bg-blue-50 p-4 text-sm font-medium text-blue-950">
        {guide.readiness.recommendation}
      </p>
      <button
        onClick={onRetake}
        className="mt-5 rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold hover:bg-slate-50"
      >
        Retake practice test
      </button>
    </div>
  );
}

function CitationList({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null;

  return (
    <ul className="mt-3 space-y-1 text-xs text-slate-500">
      {citations.map((citation) => (
        <li key={`${citation.url}-${citation.headingPath.join("/")}`}>
          <a href={citation.url} className="font-medium text-blue-700 hover:underline" target="_blank">
            {citation.title}
          </a>{" "}
          · {citation.headingPath.join(" / ")}
        </li>
      ))}
    </ul>
  );
}
