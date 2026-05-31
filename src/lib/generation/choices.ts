import type { GeneratedAssessment } from "./schemas";

type GeneratedQuestion = GeneratedAssessment["questions"][number];

export function balanceMultipleChoiceAnswerPositions(
  questions: GeneratedQuestion[],
): GeneratedQuestion[] {
  return questions.map((question, index) => {
    if (question.type !== "multiple_choice") return question;

    const currentIndex = question.choices.indexOf(question.answer);
    if (currentIndex === -1) return question;

    const choices = [...question.choices];
    const targetIndex = index % choices.length;
    [choices[currentIndex], choices[targetIndex]] = [choices[targetIndex], choices[currentIndex]];

    return {
      ...question,
      choices,
    };
  });
}
