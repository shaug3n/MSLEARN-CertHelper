"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

import { AppShell, CitationList, ErrorState, LoadingState } from "./shared";
import { useGuide } from "./use-guide";

export function FlashcardsScreen({ guideId }: { guideId: string }) {
  const { error, guide, loading, setGuide } = useGuide(guideId);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [showBack, setShowBack] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const activeCard = useMemo(
    () => guide?.flashcards.find((card) => card.id === activeCardId) ?? guide?.flashcards[0],
    [activeCardId, guide?.flashcards],
  );

  if (loading) return <LoadingState label="Loading flashcards..." />;
  if (error || !guide) return <ErrorState message={error ?? "Guide not found."} />;

  async function reviewCard(rating: "forgot" | "hard" | "easy") {
    if (!activeCard) return;
    setReviewError(null);
    setReviewing(true);
    const response = await fetch(`/api/flashcards/${activeCard.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    const payload = await response.json();
    setReviewing(false);

    if (!response.ok) {
      setReviewError(payload.error ?? "Could not review flashcard.");
      return;
    }

    setGuide(payload.guide);
    setActiveCardId(payload.guide.flashcards[0]?.id ?? null);
    setShowBack(false);
  }

  return (
    <AppShell activeView="flashcards" guide={guide}>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="h-fit rounded-md border border-slate-200 bg-white p-4 lg:sticky lg:top-4">
          <h2 className="font-semibold">Due Flashcards</h2>
          <div className="mt-4 space-y-2">
            {guide.flashcards.map((card) => (
              <button
                className={`w-full rounded-md border p-3 text-left text-sm ${
                  activeCard?.id === card.id
                    ? "border-blue-700 bg-blue-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
                key={card.id}
                onClick={() => {
                  setActiveCardId(card.id);
                  setShowBack(false);
                }}
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
                  className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={reviewing}
                  onClick={() => reviewCard("forgot")}
                >
                  Forgot
                </button>
                <button
                  className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={reviewing}
                  onClick={() => reviewCard("hard")}
                >
                  Hard
                </button>
                <button
                  className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={reviewing}
                  onClick={() => reviewCard("easy")}
                >
                  Easy
                </button>
              </div>
              {reviewError ? <p className="mt-3 text-sm text-red-700">{reviewError}</p> : null}
              <p className="mt-3 text-xs text-slate-500">
                Due {new Date(activeCard.dueAt).toLocaleDateString()} - interval{" "}
                {activeCard.intervalDays} days - repetitions {activeCard.repetitions}
              </p>
              <span
                aria-label={`Active flashcard interval ${activeCard.intervalDays} days`}
                className="sr-only"
              />
              <CitationList citations={activeCard.citations} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">No flashcards generated yet.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
