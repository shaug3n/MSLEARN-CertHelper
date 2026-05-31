"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell, EmptyState, ErrorState, LoadingState, CitationList } from "./shared";
import type { Question } from "./types";
import { useGuide } from "./use-guide";

export function PracticeScreen({ guideId }: { guideId: string }) {
  const router = useRouter();
  const { error, guide, loading } = useGuide(guideId);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [activeDomainIndex, setActiveDomainIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  if (loading) return <LoadingState label="Loading practice workspace..." />;
  if (error || !guide) return <ErrorState message={error ?? "Guide not found."} />;

  const currentGuide = guide;
  const activeSection = domainSections[activeDomainIndex] ?? domainSections[0];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = currentGuide.questions.length;

  if (!activeSection) {
    return (
      <AppShell activeView="practice" guide={currentGuide}>
        <EmptyState
          message="Regenerate the assessment after the guide has been ingested."
          title="No practice questions available"
        />
      </AppShell>
    );
  }

  async function submitTest() {
    setSubmitError(null);
    setSubmitting(true);
    const response = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guideId: currentGuide.id, answers }),
    });
    const payload = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      setSubmitError(payload.error ?? "Could not submit attempt.");
      return;
    }

    router.push(`/guide/${currentGuide.id}/results`);
  }

  return (
    <AppShell activeView="practice" guide={currentGuide}>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="h-fit rounded-md border border-slate-200 bg-white p-4 lg:sticky lg:top-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Exam Domains</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
              {answeredCount}/{totalQuestions}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {domainSections.map((section, index) => {
              const answered = section.questions.filter((question) => answers[question.id]).length;
              return (
                <button
                  className={`w-full rounded-md border p-3 text-left text-sm ${
                    activeDomainIndex === index
                      ? "border-blue-700 bg-blue-50 text-blue-950"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                  key={section.domain}
                  onClick={() => setActiveDomainIndex(index)}
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
                Domain {activeDomainIndex + 1} of {domainSections.length}
              </p>
              <h2 className="mt-1 text-2xl font-semibold">{activeSection.domain}</h2>
              <p className="mt-1 text-sm text-slate-600">
                Work one domain at a time. Submit when ready for full scoring.
              </p>
            </div>
            <button
              className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              disabled={submitting}
              onClick={submitTest}
            >
              {submitting ? "Submitting..." : "Submit test"}
            </button>
          </div>
          {submitError ? <p className="mt-3 text-sm text-red-700">{submitError}</p> : null}

          <div className="mt-5 space-y-4">
            {activeSection.questions.map((question, index) => (
              <QuestionCard
                index={index}
                key={question.id}
                onChange={(value) =>
                  setAnswers((current) => ({ ...current, [question.id]: value }))
                }
                question={question}
                value={answers[question.id]}
              />
            ))}
          </div>

          <div className="mt-6 flex justify-between">
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40"
              disabled={activeDomainIndex === 0}
              onClick={() => setActiveDomainIndex(Math.max(0, activeDomainIndex - 1))}
            >
              Previous domain
            </button>
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40"
              disabled={activeDomainIndex === domainSections.length - 1}
              onClick={() =>
                setActiveDomainIndex(Math.min(domainSections.length - 1, activeDomainIndex + 1))
              }
            >
              Next domain
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function QuestionCard({
  index,
  onChange,
  question,
  value,
}: {
  index: number;
  onChange: (value: string | string[]) => void;
  question: Question;
  value: string | string[] | undefined;
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
              className={`flex cursor-pointer gap-3 rounded-md border p-3 text-sm ${
                value === choice ? "border-blue-700 bg-blue-50" : "border-slate-200"
              }`}
              key={choice}
            >
              <input
                checked={value === choice}
                name={question.id}
                onChange={() => onChange(choice)}
                type="radio"
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
