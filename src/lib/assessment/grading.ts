import type { DeterministicQuestion, GradedResult } from "@/lib/types";

export function gradeDeterministicQuestion(
  question: DeterministicQuestion,
  answer: string | string[],
): GradedResult {
  const correct =
    question.type === "ordering"
      ? arraysEqual(asArray(question.answer), asArray(answer))
      : normalize(question.answer as string) === normalize(answer as string);

  return {
    questionId: question.id,
    objectiveId: question.objectiveId,
    score: correct ? question.points : 0,
    maxScore: question.points,
    correct,
    feedback: correct ? "Correct." : "Review the cited source and try again.",
  };
}

function asArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

function arraysEqual(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => normalize(value) === normalize(right[index]))
  );
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
