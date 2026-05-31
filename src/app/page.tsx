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

type AttemptAnswer = {
  questionId: string;
  objectiveId: string;
  prompt: string;
  choices: string[] | null;
  selectedAnswer: string | string[];
  correctAnswer: string | string[];
  correct: boolean;
  feedback: string;
  citations: Citation[];
  score: number;
  maxScore: number;
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
  latestAttempt: {
    id: string;
    overallScore: number;
    answers: AttemptAnswer[];
  } | null;
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

type View = "practice" | "results" | "flashcards";

const sampleGuide =
  "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-900";

export default function Home() {
  const [url, setUrl] = useState(sampleGuide);
  const [guide, setGuide] = useState<GuideState | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [activeView, setActiveView] = useState<View>("practice");
  const [activeDomainIndex, setActiveDomainIndex] = useState(0);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [showBack, setShowBack] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const objectiveById = useMemo(() => {
    return new Map(guide?.objectives.map((objective) => [objective.id, objective]) ?? []);
  }, [guide?.objectives]);

  const domainSections = useMemo(() => {
    if (!guide) return [];
    const sections = new Map<string, Question[]>();
    for (const question of guide.questions) {
      const domain = objectiveById.get(question.objectiveId)?.domain ?? "General";
      sections.set(domain, [...(sections.get(domain) ?? []), question]);
    }
    return Array.from(sections, ([domain, questions]) => ({ domain, questions }));
  }, [guide, objectiveById]);

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
    setActiveView("practice");
    setActiveDomainIndex(0);
    setActiveCardId(payload.guide.flashcards[0]?.id ?? null);
  }

  async function submitTest() {
    if (!guide) return;
    setError(null);
    setLoading("Scoring attempt and preparing results...");
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
    setActiveView("results");
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
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                Microsoft certification readiness
              </p>
              <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Practice by exam domain, then review exact gaps.
              </h1>
            </div>
            {guide ? (
              <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1">
                {(["practice", "results", "flashcards"] as View[]).map((view) => (
                  <button
                    key={view}
                    onClick={() => setActiveView(view)}
                    className={`rounded px-4 py-2 text-sm font-semibold capitalize ${
                      activeView === view
                        ? "bg-blue-700 text-white"
                        : "text-slate-700 hover:bg-white"
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            ) : null}
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
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <GuideHeader guide={guide} />
          {activeView === "practice" ? (
            <PracticeView
              answers={answers}
              activeDomainIndex={activeDomainIndex}
              sections={domainSections}
              setActiveDomainIndex={setActiveDomainIndex}
              setAnswers={setAnswers}
              submitTest={submitTest}
            />
          ) : null}
          {activeView === "results" ? (
            <ResultsView
              guide={guide}
              setActiveView={setActiveView}
              resetPractice={() => {
                setAnswers({});
                setActiveDomainIndex(0);
                setActiveView("practice");
              }}
            />
          ) : null}
          {activeView === "flashcards" ? (
            <FlashcardsView
              activeCard={activeCard}
              guide={guide}
              reviewCard={reviewCard}
              setActiveCardId={setActiveCardId}
              setShowBack={setShowBack}
              showBack={showBack}
            />
          ) : null}
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Domain pacing", "Questions are grouped by Microsoft Learn objective domains."],
              ["Clear review", "After submission, wrong answers show your answer and the correct one."],
              ["Separate SRS", "Flashcards live on their own page so review does not compete with testing."],
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

function GuideHeader({ guide }: { guide: GuideState }) {
  return (
    <div className="mb-6 grid gap-4 rounded-md border border-slate-200 bg-white p-5 lg:grid-cols-[1fr_auto]">
      <div>
        <h2 className="text-xl font-semibold">
          {guide.examCode}: {guide.title}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {guide.objectives.length} objectives, {guide.sourceChunkCount} cited chunks,{" "}
          {guide.questions.length} questions.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <Metric label="Readiness" value={`${guide.readiness.overallScore}%`} />
        <Metric label="Answered" value={`${guide.latestAttempt?.answers.length ?? 0}`} />
        <Metric label="Cards" value={`${guide.flashcards.length}`} />
      </div>
    </div>
  );
}

function PracticeView({
  answers,
  activeDomainIndex,
  sections,
  setActiveDomainIndex,
  setAnswers,
  submitTest,
}: {
  answers: Record<string, string | string[]>;
  activeDomainIndex: number;
  sections: Array<{ domain: string; questions: Question[] }>;
  setActiveDomainIndex: (index: number) => void;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string | string[]>>>;
  submitTest: () => void;
}) {
  const activeSection = sections[activeDomainIndex] ?? sections[0];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = sections.reduce((total, section) => total + section.questions.length, 0);

  if (!activeSection) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="h-fit rounded-md border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Exam Domains</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
            {answeredCount}/{totalQuestions}
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {sections.map((section, index) => {
            const answered = section.questions.filter((question) => answers[question.id]).length;
            return (
              <button
                key={section.domain}
                onClick={() => setActiveDomainIndex(index)}
                className={`w-full rounded-md border p-3 text-left text-sm ${
                  activeDomainIndex === index
                    ? "border-blue-700 bg-blue-50 text-blue-950"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="font-semibold">{section.domain}</span>
                <span className="mt-1 block text-xs text-slate-500">
                  {answered}/{section.questions.length} answered
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-blue-700">
              Domain {activeDomainIndex + 1} of {sections.length}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">{activeSection.domain}</h2>
          </div>
          <button
            onClick={submitTest}
            className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Submit test
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {activeSection.questions.map((question, index) => (
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

        <div className="mt-6 flex justify-between">
          <button
            disabled={activeDomainIndex === 0}
            onClick={() => setActiveDomainIndex(Math.max(0, activeDomainIndex - 1))}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            Previous domain
          </button>
          <button
            disabled={activeDomainIndex === sections.length - 1}
            onClick={() =>
              setActiveDomainIndex(Math.min(sections.length - 1, activeDomainIndex + 1))
            }
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            Next domain
          </button>
        </div>
      </section>
    </div>
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
        <span>{question.difficulty}</span>
      </div>
      <p className="mt-2 font-medium">{question.prompt}</p>
      {question.choices ? (
        <div className="mt-3 grid gap-2">
          {question.choices.map((choice, choiceIndex) => (
            <label
              key={choice}
              className={`flex cursor-pointer gap-3 rounded-md border p-3 text-sm ${
                value === choice ? "border-blue-700 bg-blue-50" : "border-slate-200"
              }`}
            >
              <input
                type="radio"
                name={question.id}
                checked={value === choice}
                onChange={() => onChange(choice)}
              />
              <span className="font-semibold">{String.fromCharCode(65 + choiceIndex)}.</span>
              <span>{choice}</span>
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

function ResultsView({
  guide,
  resetPractice,
  setActiveView,
}: {
  guide: GuideState;
  resetPractice: () => void;
  setActiveView: (view: View) => void;
}) {
  const wrongAnswers = guide.latestAttempt?.answers.filter((answer) => !answer.correct) ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Practice Test Results</h2>
            <p className="mt-1 text-sm text-slate-600">
              Review misses first, then use remediation and flashcards.
            </p>
          </div>
          <div
            className="rounded-md bg-blue-700 px-6 py-5 text-center text-white"
            aria-label={`Practice test score ${guide.readiness.overallScore}%`}
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
              <button
                onClick={() => setActiveView("flashcards")}
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Study flashcards
              </button>
              <button
                onClick={resetPractice}
                className="rounded-md border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-900"
              >
                Retake practice test
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold">Incorrect Answers</h2>
        <p className="mt-1 text-sm text-slate-600">
          {wrongAnswers.length
            ? `${wrongAnswers.length} questions need review.`
            : "No wrong answers in the latest attempt."}
        </p>
        <div className="mt-4 space-y-4">
          {wrongAnswers.map((answer, index) => (
            <div key={answer.questionId} className="rounded-md border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-semibold uppercase text-red-700">Missed question {index + 1}</p>
              <h3 className="mt-1 font-semibold text-red-950">{answer.prompt}</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <AnswerBox label="Your answer" value={answer.selectedAnswer} tone="bad" />
                <AnswerBox label="Correct answer" value={answer.correctAnswer} tone="good" />
              </div>
              <p className="mt-3 text-sm text-red-900">{answer.feedback}</p>
              <CitationList citations={answer.citations} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold">Gap Remediation</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {guide.remediationPacks.length ? (
            guide.remediationPacks.map((pack) => (
              <div key={pack.id} className="rounded-md border border-slate-200 p-4">
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
    </div>
  );
}

function FlashcardsView({
  activeCard,
  guide,
  reviewCard,
  setActiveCardId,
  setShowBack,
  showBack,
}: {
  activeCard: GuideState["flashcards"][number] | undefined;
  guide: GuideState;
  reviewCard: (rating: "forgot" | "hard" | "easy") => void;
  setActiveCardId: (id: string) => void;
  setShowBack: React.Dispatch<React.SetStateAction<boolean>>;
  showBack: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="h-fit rounded-md border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Due Flashcards</h2>
        <div className="mt-4 space-y-2">
          {guide.flashcards.map((card) => (
            <button
              key={card.id}
              onClick={() => {
                setActiveCardId(card.id);
                setShowBack(false);
              }}
              className={`w-full rounded-md border p-3 text-left text-sm ${
                activeCard?.id === card.id
                  ? "border-blue-700 bg-blue-50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className="line-clamp-2 font-semibold">{card.front}</span>
              <span className="mt-1 block text-xs text-slate-500">
                Due {new Date(card.dueAt).toLocaleDateString()} - interval {card.intervalDays} days
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-md border border-slate-200 bg-white p-6">
        <h2 className="text-2xl font-semibold">Flashcards</h2>
        {activeCard ? (
          <div className="mt-5">
            <div className="min-h-56 rounded-md border border-slate-200 bg-slate-50 p-6 text-lg">
              <ReactMarkdown>{showBack ? activeCard.back : activeCard.front}</ReactMarkdown>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold"
                onClick={() => setShowBack((value) => !value)}
              >
                {showBack ? "Show front" : "Show answer"}
              </button>
              <button
                className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => reviewCard("forgot")}
              >
                Forgot
              </button>
              <button
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => reviewCard("hard")}
              >
                Hard
              </button>
              <button
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => reviewCard("easy")}
              >
                Easy
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Due {new Date(activeCard.dueAt).toLocaleDateString()} - interval{" "}
              {activeCard.intervalDays} days - repetitions {activeCard.repetitions}
            </p>
            <span className="sr-only" aria-label={`Active flashcard interval ${activeCard.intervalDays} days`} />
            <CitationList citations={activeCard.citations} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">No flashcards generated yet.</p>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-4 py-3">
      <div className="text-2xl font-semibold text-blue-800">{value}</div>
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
    </div>
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

function formatAnswer(value: string | string[]): string {
  if (Array.isArray(value)) return value.join(", ");
  return value || "No answer submitted";
}

function CitationList({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null;

  return (
    <ul className="mt-3 space-y-1 text-xs text-slate-500">
      {citations.map((citation) => (
        <li key={`${citation.url}-${citation.headingPath.join("/")}`}>
          <a
            href={citation.url}
            className="font-medium text-blue-700 hover:underline"
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
