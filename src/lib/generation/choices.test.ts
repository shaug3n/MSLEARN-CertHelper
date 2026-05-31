import { describe, expect, it } from "vitest";

import { balanceMultipleChoiceAnswerPositions } from "./choices";

describe("balanceMultipleChoiceAnswerPositions", () => {
  it("spreads correct answers across answer positions", () => {
    const questions = Array.from({ length: 8 }).map((_, index) => ({
      type: "multiple_choice" as const,
      objectiveId: `obj-${index}`,
      prompt: `Question ${index}`,
      choices: ["Correct", "Wrong A", "Wrong B", "Wrong C"],
      answer: "Correct",
      citations: [
        {
          url: "https://learn.microsoft.com/en-us/training/",
          title: "Microsoft Learn",
          headingPath: ["Source"],
        },
      ],
      difficulty: "easy" as const,
    }));

    const balanced = balanceMultipleChoiceAnswerPositions(questions);

    expect(
      balanced.map((question) =>
        question.type === "multiple_choice" ? question.choices.indexOf(question.answer) : -1,
      ),
    ).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
  });
});
