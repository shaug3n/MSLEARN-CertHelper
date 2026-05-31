export type ReviewRating = "forgot" | "hard" | "easy";

export type CardSchedule = {
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
};

export type ReviewedSchedule = CardSchedule & {
  dueAt: Date;
};

export function reviewFlashcard(
  schedule: CardSchedule,
  rating: ReviewRating,
  reviewedAt = new Date(),
): ReviewedSchedule {
  const next =
    rating === "forgot"
      ? {
          intervalDays: 1,
          easeFactor: clampEase(schedule.easeFactor - 0.2),
          repetitions: 0,
        }
      : rating === "hard"
        ? {
            intervalDays: Math.max(1, Math.round(schedule.intervalDays * 1.2)),
            easeFactor: clampEase(schedule.easeFactor - 0.15),
            repetitions: schedule.repetitions + 1,
          }
        : {
            intervalDays:
              schedule.repetitions === 0
                ? 1
                : Math.max(1, Math.round(schedule.intervalDays * schedule.easeFactor)),
            easeFactor: clampEase(schedule.easeFactor + 0.1),
            repetitions: schedule.repetitions + 1,
          };

  return {
    ...next,
    dueAt: addDays(reviewedAt, next.intervalDays),
  };
}

function clampEase(value: number): number {
  return Math.max(1.3, Number(value.toFixed(2)));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
